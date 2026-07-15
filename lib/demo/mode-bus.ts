/**
 * Tiny client event bus (P5a), broadcasts the `cached` flag of the most
 * recent chat `done` event so the stage-only ⌘. mode overlay can show
 * "last response: cached / live" without threading a prop through every chat
 * surface (ChatView, IcChatPanel). The publish side lives in
 * components/chat/stream.ts (the one shared SSE reader both surfaces use),
 * flagged there as a touched shared file.
 */
type Listener = (cached: boolean) => void;

const listeners = new Set<Listener>();
let last: boolean | null = null;

export function publishLastResponseCached(cached: boolean): void {
  last = cached;
  for (const listener of listeners) listener(cached);
}

/** Current value, if any response has completed yet this session. */
export function currentLastResponseCached(): boolean | null {
  return last;
}

export function subscribeLastResponseCached(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
