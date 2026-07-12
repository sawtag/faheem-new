import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { LocalizedSchema } from "@/lib/types";

/**
 * data/scheduled-tasks.json = ScheduledTask[] — seeded, static demo content
 * (enterprise-flourish #3). `nextRun` is a pre-formatted display string, not
 * a computed date: no `Date.now()` anywhere so the row never drifts stale
 * during a demo. A zod-lite schema colocated with its one loader (this repo's
 * shared schemas live in lib/types.ts, which is fable-owned — this feature's
 * shape is local and narrow enough not to warrant a shared-file change).
 */
export const ScheduledTaskSchema = z.object({
  id: z.string(),
  /** lucide icon name (kebab-case) — icon choice is data, never inline JSX (AGENTS.md) */
  icon: z.string(),
  name: LocalizedSchema,
  /** short cadence-pill word, e.g. "Weekly" / "Daily" / "Monthly" */
  cadence: LocalizedSchema,
  /** cadence detail, e.g. "Every Monday, 07:00" */
  schedule: LocalizedSchema,
  /** where the output lands, e.g. "IC mailing list" / "#deals-jahez" */
  destination: LocalizedSchema,
  /** pre-formatted, e.g. "Jul 14, 07:00" */
  nextRun: LocalizedSchema,
  enabled: z.boolean(),
});
export type ScheduledTask = z.infer<typeof ScheduledTaskSchema>;

/** Absent/invalid data degrades to an empty list (no empty-state UI needed — the pack ships seeded), mirroring the library/artifacts loader convention. */
export function loadScheduledTasks(): ScheduledTask[] {
  const file = path.join(process.cwd(), "data/scheduled-tasks.json");
  if (!fs.existsSync(file)) return [];
  const parsed = ScheduledTaskSchema.array().safeParse(
    JSON.parse(fs.readFileSync(file, "utf-8")),
  );
  return parsed.success ? parsed.data : [];
}
