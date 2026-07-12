import { SKILLS } from "@/lib/skills";
import { SkillsClient } from "./skills-client";

/**
 * Skills — the analyst-playbook library (finance-grade methodology cards).
 * Server wrapper mirrors the Agents/Library pages: static registry import,
 * everything interactive (filter pills, per-card toggle, Run) lives client-side.
 */
export default function SkillsPage() {
  return (
    <main className="mx-auto max-w-[1040px] px-8 pt-10 pb-16">
      <SkillsClient skills={SKILLS} />
    </main>
  );
}
