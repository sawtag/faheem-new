/**
 * Analysis-runs data layer (data/runs.json) — the seed behind the /dashboard
 * "Analysis Runs" panel, the screen's differentiator (orchestrated, auditable
 * runs vs. a chat window). Each run records the specialist lanes that executed,
 * the documents each lane consumed (real corpus ids), and the artifacts it
 * produced. Zod-validated once at module load; local schemas, lib/types.ts is
 * untouched. Lane agent ids are checked against the live registry so a run can
 * never reference an agent that isn't in lib/ai/agents.ts.
 */
import { z } from "zod";
import runsData from "@/data/runs.json";
import { AGENT_IDS } from "@/lib/types";

const LocalizedSchema = z.object({ en: z.string(), ar: z.string() });

const RunLaneSchema = z.object({
  /** an AgentId from the registry (lib/ai/agents.ts) */
  agent: z.enum(AGENT_IDS),
  /** corpus doc ids this lane consumed — must resolve in the manifest */
  docIds: z.array(z.string()).min(1),
  /** one-line analyst-register summary of what the lane did */
  summary: LocalizedSchema,
});
export type RunLane = z.infer<typeof RunLaneSchema>;

const RunSchema = z.object({
  id: z.string(),
  kind: z.enum(["deep-dive", "screening"]),
  /** Deal.id the run analysed */
  workspace: z.string(),
  status: z.enum(["complete", "running"]),
  startedAt: z.string(),
  completedAt: z.string(),
  /** distinct citations produced across the run (from the recorded run) */
  citationsTotal: z.number().int().nonnegative(),
  lanes: z.array(RunLaneSchema),
  /** ArtifactMeta.id list the run produced */
  outputs: z.array(z.string()),
});
export type Run = z.infer<typeof RunSchema>;

export const RUNS: Run[] = RunSchema.array().parse(runsData);

export function runById(id: string): Run | undefined {
  return RUNS.find((r) => r.id === id);
}

export function runsByKind(kind: Run["kind"]): Run[] {
  return RUNS.filter((r) => r.kind === kind);
}

/** Elapsed wall-clock of a completed run, in whole minutes (≥1). */
export function runElapsedMinutes(run: Run): number {
  const ms =
    new Date(run.completedAt).getTime() - new Date(run.startedAt).getTime();
  return Math.max(1, Math.round(ms / 60000));
}
