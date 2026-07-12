import { describe, expect, it } from "vitest";
import { newEntries } from "@/app/(app)/audit/diff-entries";
import type { AuditEntry } from "@/lib/types";

function entry(overrides: Partial<AuditEntry> = {}): AuditEntry {
  return {
    ts: "2026-07-12T09:00:00Z",
    user: "Ali",
    context: "firm",
    action: "question",
    question: "q",
    citationCount: 5,
    ...overrides,
  };
}

describe("newEntries", () => {
  it("returns nothing when the list is unchanged", () => {
    const list = [entry(), entry({ ts: "2026-07-12T10:00:00Z" })];
    expect(newEntries(list, list)).toEqual([]);
  });

  it("returns only the entries appended after `prev`", () => {
    const prev = [entry({ ts: "2026-07-12T09:00:00Z" })];
    const grown = entry({ ts: "2026-07-12T10:00:00Z", question: "new one" });
    const next = [...prev, grown];

    expect(newEntries(prev, next)).toEqual([grown]);
  });

  it("returns every entry when polling from an empty prior state", () => {
    const next = [entry(), entry({ ts: "2026-07-12T10:00:00Z" })];
    expect(newEntries([], next)).toEqual(next);
  });

  it("distinguishes entries that share a timestamp but differ in content", () => {
    const prev = [entry({ action: "stage-advance", question: undefined })];
    const next = [
      ...prev,
      entry({ action: "question", question: "same ts, different row" }),
    ];

    expect(newEntries(prev, next)).toHaveLength(1);
  });

  it("is order-independent and stable when nothing changed but order shifts", () => {
    const a = entry({ ts: "2026-07-12T09:00:00Z" });
    const b = entry({ ts: "2026-07-12T10:00:00Z" });
    expect(newEntries([a, b], [b, a])).toEqual([]);
  });
});
