/**
 * Faheem IC — pure comparison logic (React-free so it unit-tests in isolation,
 * tests/ic/metrics.test.ts). The committee sheet renders straight from
 * `deals.json`; these helpers turn a deal's `icMetrics` into the sign/colour
 * decisions the table cells need. No number is invented here — every input is a
 * verified figure from `data/deals.json` (AGENTS.md rule 5).
 */
import type { Deal } from "@/lib/types";

/**
 * Deals that belong on the committee sheet: those that have reached deep
 * analysis or IC review (screening-stage and declined deals are excluded).
 * A column may still be analysis-in-progress (no `icMetrics` yet) — it renders
 * a pending state rather than fake numbers.
 */
export const IC_COLUMN_STAGES: ReadonlySet<Deal["stage"]> = new Set([
  "analysis",
  "ic-review",
]);

export function icColumns(deals: Deal[]): Deal[] {
  return deals.filter((d) => IC_COLUMN_STAGES.has(d.stage));
}

/** above → clears the hurdle (accent) · below → misses it (danger) · equal → at hurdle (neutral). */
export type HurdleTone = "above" | "below" | "equal";

export interface HurdleDelta {
  tone: HurdleTone;
  /** signed basis-points gap between the implied IRR and the hurdle (150 = +1.50%) */
  bps: number;
}

/** Implied IRR vs the mandate hurdle → a signed bps gap plus a tone for colouring. */
export function hurdleDelta(irr: number, hurdle: number): HurdleDelta {
  const bps = Math.round((irr - hurdle) * 100);
  return { tone: bps > 0 ? "above" : bps < 0 ? "below" : "equal", bps };
}

/** 1–10 risk score → coarse band that tints the segmented bar (higher = riskier). */
export type RiskBand = "low" | "moderate" | "high";

export function riskBand(score: number): RiskBand {
  if (score <= 3) return "low";
  if (score >= 7) return "high";
  return "moderate";
}

/** Segments to fill on the 10-segment risk bar (rounded to the nearest whole). */
export function riskSegments(score: number): number {
  return Math.max(0, Math.min(10, Math.round(score)));
}
