/**
 * Model-edit prefill bus (WS-F) — same pull-and-clear + live-listener pattern
 * as lib/demo/golden-bus.ts (which hands a chat question off to Composer),
 * scoped instead to the Live Model's EditComposer
 * (components/model/edit-composer.tsx). The ⌘K palette publishes one of the
 * four scripted instruction texts — the exact strings the edit-parser's
 * scripted set matches, sourced from messages/*.json `model.edit.chips` so
 * there is only one place the wording lives — either immediately (already on
 * /deals/jahez/model) or just before navigating there (`take()` on mount
 * catches it, mirroring ChatView's golden-bus hand-off).
 */
export interface ModelEditPrefill {
  text: string;
  nonce: number;
}

type Listener = (prefill: ModelEditPrefill) => void;

const listeners = new Set<Listener>();
let pending: ModelEditPrefill | null = null;

export function publishModelEditPrefill(text: string): void {
  pending = { text, nonce: Date.now() };
  for (const listener of listeners) listener(pending);
}

/** Pull-and-clear — call once on mount to catch a selection from just before navigation. */
export function takeModelEditPrefill(): ModelEditPrefill | null {
  const value = pending;
  pending = null;
  return value;
}

export function subscribeModelEditPrefill(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
