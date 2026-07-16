/**
 * Decision-phase logic for the IC room, React-free so it unit-tests in
 * isolation (tests/ic/decision.test.ts). The committee's decision gate is the
 * demo's third human gate: Faheem compiles a pre-decision brief from each
 * deal's verified `icMetrics` (data/deals.json, every figure sourced, rule 5)
 * and the committee records Advance / Defer / Decline. Recorded decisions live
 * in localStorage (the data layer's runtime store) and in the append-only
 * audit trail.
 */
import { hurdleDelta, riskBand } from "@/components/ic/metrics";
import type { Deal, IcMetrics } from "@/lib/types";

export const DECISIONS = ["advance", "defer", "decline"] as const;
export type IcDecision = (typeof DECISIONS)[number];

/** One line of the pre-decision brief; label/value resolve via ic.decision.* messages. */
export interface BriefRow {
  key: "hurdle" | "compliance" | "mandateFit" | "risk";
  /** pass = green check, warn = amber triangle, fail = red cross */
  tone: "pass" | "warn" | "fail";
  /** values interpolated into the row's message string */
  values: Record<string, string | number>;
}

/**
 * The verified pre-decision checklist for one deal, derived entirely from its
 * `icMetrics` (no number invented here). Row order mirrors the committee
 * sheet: hurdle, compliance, mandate fit, risk.
 */
export function briefRows(m: IcMetrics): BriefRow[] {
  const delta = hurdleDelta(m.irr, m.hurdle);
  const band = riskBand(m.riskScore);
  return [
    {
      key: "hurdle",
      tone:
        delta.tone === "above"
          ? "pass"
          : delta.tone === "below"
            ? "fail"
            : "warn",
      values: { bps: Math.abs(delta.bps) },
    },
    {
      key: "compliance",
      tone: m.compliance === "pass" ? "pass" : "fail",
      values: {},
    },
    {
      key: "mandateFit",
      tone: m.mandateFit === "pass" ? "pass" : "warn",
      values: {},
    },
    {
      key: "risk",
      tone: band === "low" ? "pass" : band === "high" ? "fail" : "warn",
      values: { score: m.riskScore, band },
    },
  ];
}

/** A deal is decision-ready once its analysis has signed off (icMetrics landed). */
export function decisionReady(deal: Deal): boolean {
  return deal.icMetrics !== undefined;
}

// ───────────────────────── recorded decisions (localStorage) ─────────────────────────

export interface RecordedDecision {
  decision: IcDecision;
  ts: string;
}

const STORAGE_KEY = "faheem_ic_decisions";

/** dealId → recorded decision; {} on the server, on parse failure, or before any vote. */
export function readDecisions(): Record<string, RecordedDecision> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed))
      return {};
    const out: Record<string, RecordedDecision> = {};
    for (const [id, value] of Object.entries(parsed)) {
      const v = value as Partial<RecordedDecision>;
      if (
        typeof v?.ts === "string" &&
        (DECISIONS as readonly string[]).includes(v?.decision ?? "")
      ) {
        out[id] = { decision: v.decision as IcDecision, ts: v.ts };
      }
    }
    return out;
  } catch {
    return {};
  }
}

export function writeDecision(dealId: string, entry: RecordedDecision): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ ...readDecisions(), [dealId]: entry }),
  );
}

export function clearDecision(dealId: string): void {
  if (typeof window === "undefined") return;
  const rest = readDecisions();
  delete rest[dealId];
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(rest));
}
