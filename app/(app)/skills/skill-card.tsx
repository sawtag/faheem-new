"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Toggle } from "@/components/ui/toggle";
import { Tooltip } from "@/components/ui/tooltip";
import { LucideIcon } from "@/components/shell/lucide-icon";
import { publishGoldenSelection } from "@/lib/demo/golden-bus";
import { resolveSkillRun } from "@/lib/skills-run";
import { cn } from "@/lib/utils";
import type { Skill, SkillCategory } from "@/lib/skills";
import type { Lang } from "@/lib/types";

const EASE = [0.4, 0, 0.2, 1] as const;
const STAGGER_CAP = 8;
const DIM =
  "opacity-55 transition-opacity duration-[var(--duration-fast)] ease-[var(--ease)]";

const CATEGORY_BADGE: Record<
  SkillCategory,
  React.ComponentProps<typeof Badge>["variant"]
> = {
  valuation: "mint",
  diligence: "neutral",
  "risk-compliance": "warning",
  output: "navy",
};

/**
 * One playbook card (design brief: icon tile → name/category/one-liner →
 * bulleted methods → footer). Toggle is cosmetic (agents-page pattern), it
 * dims the card, it never gates the Run action. Run either fires the exact
 * golden-bus insert a goldenId-mapped skill was recorded with, or prefills a
 * fresh chat with ad hoc text (see lib/skills-run.ts for why "home" means
 * `/chat/new` here, not the omnibox hero).
 */
export function SkillCard({ skill, index }: { skill: Skill; index: number }) {
  const t = useTranslations("skills");
  const locale = useLocale() as Lang;
  const router = useRouter();
  const [on, setOn] = React.useState(true);

  const target = resolveSkillRun(skill, locale);

  function onRun() {
    if (!target) return;
    publishGoldenSelection({
      context: target.context,
      text: target.text,
      agent: target.agent,
      docIds: target.docIds,
    });
    router.push(target.href);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.25,
        ease: EASE,
        delay: Math.min(index, STAGGER_CAP) * 0.035,
      }}
    >
      <Card hover data-testid={`skill-card-${skill.id}`} data-dimmed={!on}>
        <div className="flex items-start justify-between gap-3">
          <span
            className={cn(
              "bg-accent-50 text-accent-700 rounded-btn grid size-10 shrink-0 place-items-center",
              !on && "grayscale",
            )}
          >
            <LucideIcon name={skill.icon} className="size-5" />
          </span>
        </div>

        <div className={cn("mt-4 flex flex-col gap-3", !on && DIM)}>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-navy text-base font-bold">
              {skill.name[locale]}
            </h3>
            <Badge variant={CATEGORY_BADGE[skill.category]} size="sm">
              {t(`categories.${skill.category}`)}
            </Badge>
          </div>
          <p className="text-text-secondary text-sm">
            {skill.oneLiner[locale]}
          </p>
          <ul className="marker:text-accent text-text-secondary flex list-disc flex-col gap-1.5 ps-4 text-[0.8125rem] leading-snug">
            {skill.methods.map((method) => (
              <li key={method.en}>{method[locale]}</li>
            ))}
          </ul>
        </div>

        <div className="border-border mt-5 flex items-center justify-between gap-3 border-t pt-4">
          <span
            className={cn(
              "text-text-secondary text-xs font-medium",
              !on && DIM,
            )}
          >
            {t("byline")}
          </span>
          <div className="flex items-center gap-3">
            <Toggle
              checked={on}
              onCheckedChange={setOn}
              aria-label={skill.name[locale]}
            />
            <div className={cn("flex flex-col items-end gap-1", !on && DIM)}>
              {target ? (
                <>
                  <Button
                    size="sm"
                    onClick={onRun}
                    data-testid={`skill-run-${skill.id}`}
                  >
                    {t("run")}
                  </Button>
                  {target.fixedLang && target.lang === "ar" && (
                    <span className="text-text-secondary text-[0.6875rem]">
                      {t("runsInArabic")}
                    </span>
                  )}
                </>
              ) : (
                <Tooltip content={t("roadmapHint")}>
                  <Badge variant="mvp" size="sm">
                    {t("roadmap")}
                  </Badge>
                </Tooltip>
              )}
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
