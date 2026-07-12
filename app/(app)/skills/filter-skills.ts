import type { Skill, SkillCategory } from "@/lib/skills";

/** Category filter pills (All + the 4 categories). Pure so it's unit-testable without React. */
export function filterSkills(
  skills: Skill[],
  category: SkillCategory | "all",
): Skill[] {
  return category === "all"
    ? skills
    : skills.filter((s) => s.category === category);
}
