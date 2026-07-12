/**
 * Cross-page prefill bus (P5a) — bridges the ⌘K demo palette (mounted once in
 * app/(app)/layout.tsx, outside any single chat surface) to whichever
 * composer should receive the selection: ChatView's Composer (workspace/firm
 * entries) or IcChatPanel's IcComposer (ic entries).
 *
 * A selection is delivered two ways so it survives both cases the palette
 * supports ("navigates if needed, then inserts…"):
 *  - already on the right page → the live `subscribe` listener fires
 *    immediately, no navigation.
 *  - needs navigation → the target page's effect calls `take()` once on
 *    mount to pick up the selection published just before `router.push`.
 * `take()` clears the pending value so a later, unrelated navigation to the
 * same page never replays a stale selection.
 */
import type { AgentId, ChatContext } from "@/lib/types";

export interface GoldenSelection {
  context: ChatContext;
  text: string;
  agent?: AgentId;
  docIds?: string[];
  nonce: number;
}

type Listener = (selection: GoldenSelection) => void;

const listeners = new Set<Listener>();
let pending: GoldenSelection | null = null;

export function publishGoldenSelection(
  selection: Omit<GoldenSelection, "nonce">,
): void {
  pending = { ...selection, nonce: Date.now() };
  for (const listener of listeners) listener(pending);
}

/** Pull-and-clear — call once on mount to catch a selection from just before navigation. */
export function takeGoldenSelection(): GoldenSelection | null {
  const value = pending;
  pending = null;
  return value;
}

export function subscribeGoldenSelection(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
