"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { SKILL_CATEGORIES, type Skill, type SkillCategory } from "@/lib/skills";
import { filterSkills } from "./filter-skills";
import { SkillCard } from "./skill-card";

type Filter = SkillCategory | "all";

/**
 * /skills — header, category filter pills (Library-page pill pattern), and
 * the 2-col playbook grid. Static registry data (no async loading state,
 * same as the Agents page).
 */
export function SkillsClient({ skills }: { skills: Skill[] }) {
  const t = useTranslations("skills");
  const [filter, setFilter] = React.useState<Filter>("all");

  const filters: { value: Filter; label: string }[] = [
    { value: "all", label: t("filterAll") },
    ...SKILL_CATEGORIES.map((category) => ({
      value: category,
      label: t(`categories.${category}`),
    })),
  ];

  const visible = filterSkills(skills, filter);

  return (
    <>
      <header className="mb-8">
        <h1 className="text-h1 text-navy font-extrabold">{t("title")}</h1>
        <p className="text-text-secondary mt-2 text-[0.9375rem]">
          {t("subtitle")}
        </p>
      </header>

      <div className="mb-6 flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter(f.value)}
            aria-pressed={f.value === filter}
            className={cn(
              "rounded-pill px-3.5 py-1.5 text-[0.8125rem] font-semibold transition-colors duration-[var(--duration-fast)] ease-[var(--ease)] outline-none",
              f.value === filter
                ? "bg-accent-50 text-accent-700"
                : "bg-card border-border text-text-secondary hover:text-navy border",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {visible.map((skill, i) => (
          <SkillCard key={skill.id} skill={skill} index={i} />
        ))}
      </div>
    </>
  );
}
