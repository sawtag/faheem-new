"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { SKILL_CATEGORIES, type Skill, type SkillCategory } from "@/lib/skills";
import type { CustomSkill } from "@/lib/custom-skills";
import type { Lang } from "@/lib/types";
import { filterSkills } from "./filter-skills";
import { SkillCard } from "./skill-card";
import { resolveSkillRun } from "@/lib/skills-run";
import {
  AddSkillTile,
  CustomSkillCard,
  DESC_MAX,
  NAME_MAX,
  SkillDialog,
  type SkillDialogMode,
} from "./custom-skill-card";

type Filter = SkillCategory | "all";

/**
 * /skills, header, category filter pills (Library-page pill pattern), and
 * the playbook grid: immutable built-in registry cards (copy-only), then the
 * store-backed skills (Lunar-authored seeds and the analyst's own, with the
 * full add/copy/edit/toggle/delete lifecycle), both respecting the active
 * filter, then the "Add skill" tile, always the grid's last cell.
 */
export function SkillsClient({
  skills,
  initialCustomSkills,
}: {
  skills: Skill[];
  initialCustomSkills: CustomSkill[];
}) {
  const t = useTranslations("skills");
  const locale = useLocale() as Lang;
  const router = useRouter();
  const [filter, setFilter] = React.useState<Filter>("all");
  const [customSkills, setCustomSkills] = React.useState(initialCustomSkills);
  const [dialog, setDialog] = React.useState<SkillDialogMode | null>(null);

  // Sync local state when the server list changes (router.refresh() after a
  // mutation round-trip), render-time prop adjustment.
  const [prevInitial, setPrevInitial] = React.useState(initialCustomSkills);
  if (initialCustomSkills !== prevInitial) {
    setPrevInitial(initialCustomSkills);
    setCustomSkills(initialCustomSkills);
  }

  function handleSaved(skill: CustomSkill, kind: "created" | "updated") {
    setCustomSkills((prev) =>
      kind === "created"
        ? [...prev, skill]
        : prev.map((s) => (s.id === skill.id ? skill : s)),
    );
    setDialog(null);
    router.refresh();
  }

  function handleToggled(skill: CustomSkill) {
    setCustomSkills((prev) => prev.map((s) => (s.id === skill.id ? skill : s)));
  }

  function handleDeleted(id: string) {
    setCustomSkills((prev) => prev.filter((s) => s.id !== id));
    router.refresh();
  }

  /** Copy-mode seed: "<name> (copy)" clamped to the form's own limits. */
  function copyDraft(
    name: string,
    category: SkillCategory,
    description: string,
    prefill: string,
  ) {
    setDialog({
      kind: "copy",
      initial: {
        name: t("copyName", { name }).slice(0, NAME_MAX),
        category,
        description: description.slice(0, DESC_MAX),
        prefill,
      },
    });
  }

  function copyBuiltIn(skill: Skill) {
    const target = resolveSkillRun(skill, locale);
    if (!target) return;
    copyDraft(
      skill.name[locale],
      skill.category,
      skill.oneLiner[locale],
      target.text,
    );
  }

  const filters: { value: Filter; label: string }[] = [
    { value: "all", label: t("filterAll") },
    ...SKILL_CATEGORIES.map((c) => ({
      value: c,
      label: t(`categories.${c}`),
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
        {filters.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            aria-pressed={filter === value}
            className={cn(
              "rounded-pill px-3.5 py-1.5 text-[0.8125rem] font-semibold transition-colors duration-[var(--duration-fast)] ease-[var(--ease)] outline-none",
              filter === value
                ? "bg-accent-50 text-accent-700"
                : "bg-card border-border text-text-secondary hover:text-navy border",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {visible.map((skill, i) => (
          <SkillCard
            key={skill.id}
            skill={skill}
            index={i}
            onCopy={
              resolveSkillRun(skill, locale)
                ? () => copyBuiltIn(skill)
                : undefined
            }
          />
        ))}
        {visibleCustom.map((skill) => (
          <CustomSkillCard
            key={skill.id}
            skill={skill}
            onDeleted={() => handleDeleted(skill.id)}
            onEdit={() => setDialog({ kind: "edit", skill })}
            onCopy={() =>
              copyDraft(
                skill.name,
                skill.category,
                skill.description,
                skill.prefill,
              )
            }
            onToggled={handleToggled}
          />
        ))}
        <AddSkillTile
          label={t("addSkill")}
          onClick={() => setDialog({ kind: "add" })}
        />
      </div>

      <SkillDialog
        mode={dialog}
        onClose={() => setDialog(null)}
        onSaved={handleSaved}
      />
    </>
  );
}
