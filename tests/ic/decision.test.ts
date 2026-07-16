import { beforeEach, describe, expect, it } from "vitest";
import {
  briefRows,
  clearDecision,
  decisionReady,
  readDecisions,
  writeDecision,
} from "@/components/ic/decision";
import type { Deal, IcMetrics } from "@/lib/types";

const METRICS: IcMetrics = {
  // Jahez's signed-off committee metrics (data/deals.json shape).
  irr: 17.1,
  hurdle: 15,
  expectedReturn: 16.8,
  riskScore: 5.5,
  mandateFit: "pass",
  compliance: "pass",
  recommendation: { en: "Strongest case.", ar: "الحالة الأقوى." },
  cite: { docId: "jahez-analysis-summary", page: 2 },
};

describe("briefRows, the verified pre-decision checklist", () => {
  it("derives four rows in sheet order from clean metrics", () => {
    const rows = briefRows(METRICS);
    expect(rows.map((r) => r.key)).toEqual([
      "hurdle",
      "compliance",
      "mandateFit",
      "risk",
    ]);
    expect(rows[0]).toEqual({
      key: "hurdle",
      tone: "pass",
      values: { bps: 210 },
    });
    expect(rows[1]!.tone).toBe("pass");
    expect(rows[2]!.tone).toBe("pass");
    // riskScore 5.5 → moderate band → warn tone, score surfaced for the copy.
    expect(rows[3]).toEqual({
      key: "risk",
      tone: "warn",
      values: { score: 5.5, band: "moderate" },
    });
  });

  it("flags a below-hurdle IRR, a failed screen, and high risk", () => {
    const rows = briefRows({
      ...METRICS,
      irr: 13.4,
      compliance: "fail",
      mandateFit: "warn",
      riskScore: 8,
    });
    expect(rows[0]).toEqual({
      key: "hurdle",
      tone: "fail",
      values: { bps: 160 },
    });
    expect(rows[1]!.tone).toBe("fail");
    expect(rows[2]!.tone).toBe("warn");
    expect(rows[3]!.tone).toBe("fail");
  });

  it("an at-hurdle IRR reads as warn, never silently pass", () => {
    expect(briefRows({ ...METRICS, irr: 15 })[0]).toEqual({
      key: "hurdle",
      tone: "warn",
      values: { bps: 0 },
    });
  });
});

describe("decisionReady", () => {
  it("only a deal with signed-off icMetrics is decidable", () => {
    expect(decisionReady({ icMetrics: METRICS } as Deal)).toBe(true);
    expect(decisionReady({} as Deal)).toBe(false);
  });
});

describe("recorded decisions, localStorage round trip", () => {
  beforeEach(() => window.localStorage.clear());

  it("write → read → clear round-trips per deal", () => {
    expect(readDecisions()).toEqual({});
    writeDecision("thara-pay", {
      decision: "advance",
      ts: "2026-07-16T09:00:00Z",
    });
    writeDecision("jahez", { decision: "defer", ts: "2026-07-16T09:05:00Z" });
    expect(readDecisions()).toEqual({
      "thara-pay": { decision: "advance", ts: "2026-07-16T09:00:00Z" },
      jahez: { decision: "defer", ts: "2026-07-16T09:05:00Z" },
    });
    clearDecision("thara-pay");
    expect(readDecisions()).toEqual({
      jahez: { decision: "defer", ts: "2026-07-16T09:05:00Z" },
    });
  });

  it("ignores corrupt storage and unknown decision values", () => {
    window.localStorage.setItem("faheem_ic_decisions", "not json");
    expect(readDecisions()).toEqual({});
    window.localStorage.setItem(
      "faheem_ic_decisions",
      JSON.stringify({
        jahez: { decision: "approve-all", ts: "2026-07-16T09:00:00Z" },
        "thara-pay": { decision: "decline", ts: "2026-07-16T09:00:00Z" },
      }),
    );
    expect(readDecisions()).toEqual({
      "thara-pay": { decision: "decline", ts: "2026-07-16T09:00:00Z" },
    });
  });
});
