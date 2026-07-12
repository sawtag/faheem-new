/**
 * Citation-highlight hand-off bus (same pattern as lib/demo/golden-bus). A
 * citation chip / Sources row stashes its quote here right before calling
 * `onOpen(docId, page)`; PdfPanel subscribes (useSyncExternalStore) and, when
 * the stash matches the doc+page it is showing, highlights the quote in the
 * text layer. This keeps every `onOpenDoc(docId, page)` call site — ChatView,
 * IcRoom, Documents tab, scorecards — untouched: quote-less opens simply have
 * no matching stash and stay page-level.
 *
 * The stash survives until replaced (never cleared on read — safe under
 * StrictMode double-effects); `nonce` lets the panel re-center/re-pulse when
 * the same citation is clicked again.
 */

export interface CitationHighlight {
  docId: string;
  page: number;
  quote: string;
  nonce: number;
}

type Listener = () => void;

const listeners = new Set<Listener>();
let current: CitationHighlight | null = null;

export function stashCitationHighlight(
  h: Omit<CitationHighlight, "nonce">,
): void {
  current = { ...h, nonce: Date.now() };
  for (const listener of listeners) listener();
}

export function getCitationHighlight(): CitationHighlight | null {
  return current;
}

export function subscribeCitationHighlight(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
