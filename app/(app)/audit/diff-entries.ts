import type { AuditEntry } from "@/lib/types";

function entryKey(e: AuditEntry): string {
  return [
    e.ts,
    e.user,
    e.context,
    e.action,
    e.question ?? "",
    e.artifact ?? "",
    e.citationCount ?? "",
  ].join("|");
}

/**
 * Entries present in `next` but not in `prev` — the rows the live-grow
 * animation should play for (design-briefs §3.4). Append-only log, so a
 * simple set-difference by full field equality is sufficient and exact.
 */
export function newEntries(
  prev: AuditEntry[],
  next: AuditEntry[],
): AuditEntry[] {
  const seen = new Set(prev.map(entryKey));
  return next.filter((e) => !seen.has(entryKey(e)));
}
