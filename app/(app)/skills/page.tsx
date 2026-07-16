import { listCustomSkills } from "@/lib/custom-skills";
import { SKILLS } from "@/lib/skills";
import { SkillsClient } from "./skills-client";

// data/custom-skills.json is mutable at runtime (create/delete via
// /api/skills), force-dynamic so a prod build never freezes the custom
// roster at build time (mirrors the Agents page's convention).
export const dynamic = "force-dynamic";

/**
 * Skills, the analyst-playbook library (finance-grade methodology cards).
 * Server wrapper mirrors the Agents/Library pages: static registry import,
 * everything interactive (filter pills, per-card toggle, Run, and the
 * user-created custom skills) lives client-side.
 */
export default function SkillsPage() {
  return (
    <main className="mx-auto max-w-[1040px] px-8 pt-10 pb-16">
      <SkillsClient skills={SKILLS} initialCustomSkills={listCustomSkills()} />
    </main>
  );
}
