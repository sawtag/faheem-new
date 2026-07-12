import { describe, expect, it } from "vitest";
import { citationMap, reduceEvents } from "@/components/chat/reduce";
import type { SSEEvent } from "@/lib/types";

describe("reduceEvents", () => {
  it("folds stages, deltas, citations and done into a view-model", () => {
    const events: SSEEvent[] = [
      {
        type: "stage",
        agent: "research",
        status: "start",
        docIds: ["fy25-er"],
      },
      { type: "stage", agent: "research", status: "done", docIds: ["fy25-er"] },
      { type: "stage", agent: "valuation", status: "start" },
      { type: "delta", text: "Group GMV grew " },
      { type: "delta", text: "[[1]]" },
      {
        type: "citation",
        n: 1,
        docId: "fy25-er",
        page: 4,
        quote: "GMV 7,245.2",
      },
      { type: "done", cached: true },
    ];
    const v = reduceEvents(events);

    expect(v.text).toBe("Group GMV grew [[1]]");
    expect(v.stageRows.map((s) => s.agent)).toEqual(["research", "valuation"]);
    expect(v.stageRows[0]!.done).toBe(true);
    expect(v.stageRows[1]!.done).toBe(false);
    expect(v.agentCount).toBe(2);
    expect(v.citations).toEqual([
      { n: 1, docId: "fy25-er", page: 4, quote: "GMV 7,245.2" },
    ]);
    expect(v.done).toBe(true);
    expect(v.cached).toBe(true);
    expect(v.error).toBeUndefined();
  });

  it("captures a graceful error event", () => {
    const v = reduceEvents([{ type: "error", message: "connection issue" }]);
    expect(v.error).toBe("connection issue");
    expect(v.done).toBe(false);
  });

  it("maps citation numbers for chip resolution", () => {
    const map = citationMap([
      { n: 2, docId: "fy25-er", page: 11, quote: "take rate" },
    ]);
    expect(map.get(2)?.page).toBe(11);
    expect(map.get(9)).toBeUndefined();
  });
});
