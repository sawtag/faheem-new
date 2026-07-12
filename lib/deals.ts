/**
 * Deal pipeline data layer (T3.3). data/deals.json and data/leadership.json
 * are zod-validated once at module load — a malformed data edit fails loudly
 * at build/test time, never as a silently broken board. Pure data + filters,
 * safe to import from server and client components alike (no fs).
 */
import { z } from "zod";
import { DealSchema, LocalizedSchema, type Deal } from "@/lib/types";
import dealsData from "@/data/deals.json";
import leadershipData from "@/data/leadership.json";

/** Validate a raw deals payload (exported so tests can feed bad fixtures). */
export function parseDeals(raw: unknown): Deal[] {
  return DealSchema.array().parse(raw);
}

export const DEALS: Deal[] = parseDeals(dealsData);

/** Pipeline stage order — board sections render in this sequence. */
export const STAGES = [
  "screening",
  "analysis",
  "ic-review",
  "declined",
] as const satisfies readonly Deal["stage"][];

export type OriginFilter = "all" | Deal["origin"];

export function dealById(id: string): Deal | undefined {
  return DEALS.find((d) => d.id === id);
}

export function dealsByStage(
  stage: Deal["stage"],
  deals: Deal[] = DEALS,
): Deal[] {
  return deals.filter((d) => d.stage === stage);
}

/** Origin dimension (Inbound (Private) vs Market Screen (Public)) — drives the board's filter pills. */
export function dealsByOrigin(deals: Deal[], origin: OriginFilter): Deal[] {
  return origin === "all" ? deals : deals.filter((d) => d.origin === origin);
}

// ─────────────────────────── Jahez leadership pack ───────────────────────────

/** data/leadership.json — authored from data/corpus/leadership-pack.pdf (FY 2024 AR pp.110–122). */
export const LeaderSchema = z.object({
  name: z.string(),
  role: LocalizedSchema,
  group: z.enum(["board", "executive"]),
  oneLiner: z.object({ en: z.string(), ar: z.string().optional() }),
  /** annual-report page reference, e.g. "FY 2024 Annual Report, p.110" */
  source: z.string(),
  /** page inside data/corpus/leadership-pack.pdf — deep-links the PdfPanel */
  packPage: z.number().int().positive(),
});
export type Leader = z.infer<typeof LeaderSchema>;

export const LEADERS: Leader[] = LeaderSchema.array().parse(leadershipData);
