"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { SKILL_CATEGORIES, type Skill, type SkillCategory } from "@/lib/skills";
import type { CustomSkill } from "@/lib/custom-skills";
import { filterSkills } from "./filter-skills";
import { SkillCard } from "./skill-card";
import {
  AddSkillDialog,
  AddSkillTile,
  CustomSkillCard,
} from "./custom-skill-card";

type Filter = SkillCategory | "all";

/**
 * /skills — header, category filter pills (Library-page pill pattern), and
 * the playbook grid: built-in registry cards, then user-created custom
 * skills (both respecting the active filter), then the "Add skill" tile,
 * which is always the grid's last cell regardless of filter.
 */
export function SkillsClient({
  skills,
  initialCustomSkills,
}: {
  skills: Skill[];
  initialCustomSkills: CustomSkill[];
}) {
  const t = useTranslations("skills");
  const router = useRouter();
  const [filter, setFilter] = React.useState<Filter>("all");
  const [customSkills, setCustomSkills] = React.useState(initialCustomSkills);
  const [dialogOpen, setDialogOpen] = React.useState(false);

  // Sync local state when the server list changes (router.refresh() after a
  // create/delete round-trip) — render-time prop adjustment, same convention
  // as CustomAgentsSection.
  const [prevInitial, setPrevInitial] = React.useState(initialCustomSkills);
  if (initialCustomSkills !== prevInitial) {
    setPrevInitial(initialCustomSkills);
    setCustomSkills(initialCustomSkills);
  }

  function handleCreated(skill: CustomSkill) {
    setCustomSkills((prev) => [...prev, skill]);
    setDialogOpen(false);
    router.refresh();
  }

  function handleDeleted(id: string) {
    setCustomSkills((prev) => prev.filter((s) => s.id !== id));
    router.refresh();
  }

  const filters: { value: Filter; label: string }[] = [
    { value: "all", label: t("filterAll") },
    ...SKILL_CATEGORIES.map((category) => ({
      value: category,
      label: t(`categories.${category}`),
    })),
  ];

  const visible = filterSkills(skills, filter);
  const visibleCustom =
    filter === "all"
      ? customSkills
      : customSkills.filter((s) => s.category === filter);

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
        {visibleCustom.map((skill) => (
          <CustomSkillCard
            key={skill.id}
            skill={skill}
            onDeleted={() => handleDeleted(skill.id)}
          />
        ))}
        <AddSkillTile
          label={t("addSkill")}
          onClick={() => setDialogOpen(true)}
        />
      </div>

      <AddSkillDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreated={handleCreated}
      />
    </>
  );
}
