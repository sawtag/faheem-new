import { describe, expect, it } from "vitest";
import { GOLDEN_QUESTIONS } from "@/lib/demo/golden-questions";
import { SKILL_CATEGORIES, SKILLS, SkillSchema } from "@/lib/skills";

describe("SKILLS, data/skills.json", () => {
  it("has 10 entries with unique ids", () => {
    expect(SKILLS).toHaveLength(10);
    const ids = SKILLS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every entry is a valid Skill (zod)", () => {
    for (const skill of SKILLS) {
      const parsed = SkillSchema.safeParse(skill);
      expect(
        parsed.success,
        `${skill.id}: ${JSON.stringify(parsed.success ? null : parsed.error.issues)}`,
      ).toBe(true);
    }
  });

  it("methods carry 3-5 bullets, bilingual, never empty", () => {
    for (const skill of SKILLS) {
      expect(skill.methods.length).toBeGreaterThanOrEqual(3);
      expect(skill.methods.length).toBeLessThanOrEqual(5);
      for (const method of skill.methods) {
        expect(method.en.length).toBeGreaterThan(0);
        expect(method.ar.length).toBeGreaterThan(0);
      }
    }
  });

  it("every category is one of the 4 registered categories", () => {
    for (const skill of SKILLS) {
      expect(SKILL_CATEGORIES).toContain(skill.category);
    }
  });

  it("every run.goldenId resolves in golden-questions.json (hard assert)", () => {
    const goldenIds = new Set(GOLDEN_QUESTIONS.map((q) => q.id));
    const mapped = SKILLS.filter(
      (s): s is typeof s & { run: { goldenId: string } } =>
        !!s.run && "goldenId" in s.run,
    );
    expect(mapped.map((s) => s.id).sort()).toEqual(
      ["risk-scorecard", "shariah-screen", "ic-memo"].sort(),
    );
    for (const skill of mapped) {
      expect(
        goldenIds.has(skill.run.goldenId),
        `${skill.id}.run.goldenId "${skill.run.goldenId}" missing from golden-questions.json`,
      ).toBe(true);
    }
  });

  it("prefill-mapped skills carry bilingual, non-empty prefill text", () => {
    const prefilled = SKILLS.filter(
      (s): s is typeof s & { run: { prefill: { en: string; ar: string } } } =>
        !!s.run && "prefill" in s.run,
    );
    // dcf-fcff, trading-comps, football-field, sensitivity, scenario-irr, mandate-fit
    expect(prefilled.length).toBe(6);
    for (const skill of prefilled) {
      expect(skill.run.prefill.en.length).toBeGreaterThan(0);
      expect(skill.run.prefill.ar.length).toBeGreaterThan(0);
    }
  });

  it("covenant-sweep is the only roadmap-only (run: null) entry", () => {
    const roadmapOnly = SKILLS.filter((s) => s.run === null);
    expect(roadmapOnly.map((s) => s.id)).toEqual(["covenant-sweep"]);
  });
});
