/**
 * Skills registry loader (Skills Library) — zod-lite validation over
 * data/skills.json, the analyst-playbook catalog rendered by /skills.
 *
 * A skill's `run` is one of:
 *  - `{ goldenId }` — reproduces a recorded golden question byte-for-byte via
 *    the same lib/demo/golden-bus.ts insert the ⌘K palette uses (exact cache
 *    key, see lib/demo/golden-questions.ts).
 *  - `{ prefill: {en, ar} }` — an ad hoc composer prefill, not a recorded
 *    question (no cache guarantee; the live/cached engine handles it either
 *    way).
 *  - `null` — roadmap-only, no Run action.
 *
 * Every `goldenId` must resolve in the golden registry — checked eagerly here
 * (not just in tests) so a broken mapping fails at import time, not when a
 * judge clicks Run on stage.
 */
import { z } from "zod";
import { LocalizedSchema } from "@/lib/types";
import { GOLDEN_QUESTIONS } from "@/lib/demo/golden-questions";
import skillsData from "@/data/skills.json";

export const SKILL_CATEGORIES = [
  "valuation",
  "diligence",
  "risk-compliance",
  "output",
] as const;
export const SkillCategorySchema = z.enum(SKILL_CATEGORIES);
export type SkillCategory = z.infer<typeof SkillCategorySchema>;

export const SkillRunSchema = z
  .union([
    z.object({ goldenId: z.string() }).strict(),
    z.object({ prefill: LocalizedSchema }).strict(),
  ])
  .nullable();
export type SkillRun = z.infer<typeof SkillRunSchema>;

export const SkillSchema = z.object({
  id: z.string(),
  name: LocalizedSchema,
  category: SkillCategorySchema,
  /** lucide icon name — icon choice is registry data (AGENTS.md asset policy) */
  icon: z.string(),
  oneLiner: LocalizedSchema,
  /** 3-5 technical method bullets, rendered in full — never truncated */
  methods: z.array(LocalizedSchema).min(3).max(5),
  run: SkillRunSchema,
});
export type Skill = z.infer<typeof SkillSchema>;

export const SKILLS: Skill[] = SkillSchema.array().parse(skillsData);

const goldenIds = new Set(GOLDEN_QUESTIONS.map((q) => q.id));
for (const skill of SKILLS) {
  if (
    skill.run &&
    "goldenId" in skill.run &&
    !goldenIds.has(skill.run.goldenId)
  ) {
    throw new Error(
      `data/skills.json: "${skill.id}".run.goldenId "${skill.run.goldenId}" has no matching entry in golden-questions.json`,
    );
  }
}
