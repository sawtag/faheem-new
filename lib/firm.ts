/**
 * Firm-level dashboard data layer (data/firm.json) + pure derivations for the
 * /dashboard mission-control screen. Every value in firm.json carries its
 * source ({value, sourceDoc, page}), the governance stats (AUM, mandate caps,
 * sector exposure, Saudi macro) resolve to a real corpus page, never invented
 * (AGENTS.md rule 5). Zod-validated once at module load: a malformed edit fails
 * loudly at build/test time. Pure data + filters, safe to import from server
 * and client alike (no fs). Local schemas; lib/types.ts is untouched.
 */
import { z } from "zod";
import firmData from "@/data/firm.json";
import type { Deal } from "@/lib/types";

/** A displayed figure paired with the corpus doc + page that backs it. */
const SourcedValueSchema = z.object({
  value: z.number(),
  /** must be a CorpusDoc.id present in data/corpus/manifest.json */
  sourceDoc: z.string(),
  page: z.number().int().positive(),
});
export type SourcedValue = z.infer<typeof SourcedValueSchema>;

const MacroLineSchema = SourcedValueSchema.extend({ key: z.string() });
export type MacroLine = z.infer<typeof MacroLineSchema>;

const FirmSchema = z.object({
  /** AUM in SAR billions */
  aumSarBn: SourcedValueSchema,
  /** minimum underwritten IRR hurdle, percent */
  hurdlePct: SourcedValueSchema,
  /** single-name concentration cap, percent of AUM */
  singleNameCapPct: SourcedValueSchema,
  /** sector concentration cap, percent of AUM */
  sectorCapPct: SourcedValueSchema,
  /** current Technology & Consumer sector exposure, percent of AUM */
  sectorExposurePct: SourcedValueSchema,
  /** Saudi macro snapshot lines (GASTAT/SAMA), each with its page */
  macro: z.array(MacroLineSchema),
});
export type Firm = z.infer<typeof FirmSchema>;

export const FIRM: Firm = FirmSchema.parse(firmData);

/** Sector-cap utilisation as a 0–1 fraction, e.g. 8.5% of a 10% cap → 0.85. */
export function sectorCapUtilisation(firm: Firm = FIRM): number {
  return firm.sectorExposurePct.value / firm.sectorCapPct.value;
}

/** Remaining headroom in percentage points before the sector cap binds (1.5pp). */
export function sectorHeadroomPp(firm: Firm = FIRM): number {
  return firm.sectorCapPct.value - firm.sectorExposurePct.value;
}

/** True once exposure reaches ≥85% of the cap, the bar switches to a warn tint. */
export function sectorCapWarn(firm: Firm = FIRM): boolean {
  return sectorCapUtilisation(firm) >= 0.85;
}

// ───────────────────────── pipeline / IC-queue derivations ─────────────────────────

/** Live pipeline stages, in board order (declined is excluded). */
const ACTIVE_STAGES = ["screening", "analysis", "ic-review"] as const;

export interface PipelineSummary {
  /** count of non-declined deals */
  activeCount: number;
  /** per-stage breakdown, only stages that currently hold a deal */
  byStage: { stage: Deal["stage"]; count: number }[];
}

/** Active pipeline = deals not yet declined, with a per-stage mini-breakdown. */
export function pipelineSummary(deals: Deal[]): PipelineSummary {
  const active = deals.filter((d) => d.stage !== "declined");
  return {
    activeCount: active.length,
    byStage: ACTIVE_STAGES.map((stage) => ({
      stage,
      count: active.filter((d) => d.stage === stage).length,
    })).filter((s) => s.count > 0),
  };
}

export interface IcQueue {
  count: number;
  /** the next deal awaiting the committee, if any */
  next?: Deal;
}

/** Deals in Investment-Committee review, count + the next one up. */
export function icQueue(deals: Deal[]): IcQueue {
  const queued = deals.filter((d) => d.stage === "ic-review");
  return { count: queued.length, next: queued[0] };
}
