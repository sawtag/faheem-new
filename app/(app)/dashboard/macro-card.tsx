"use client";

import { motion, useReducedMotion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { cn, formatPercent } from "@/lib/utils";
import type { Lang } from "@/lib/types";
import { useCountUp } from "./use-count-up";

const EASE = [0.4, 0, 0.2, 1] as const;

export interface MacroLineData {
  /** dashboard.macro.* label key */
  key: string;
  value: number;
  page: number;
}

/** Display rules per macro line (GDP is a signed growth, the repo rate keeps 2 dp). */
const FORMAT: Record<string, { decimals: number; signed: boolean }> = {
  realGdp: { decimals: 1, signed: true },
  cpi: { decimals: 1, signed: false },
  repoRate: { decimals: 2, signed: false },
};

function MacroLine({
  line,
  index,
  last,
}: {
  line: MacroLineData;
  index: number;
  last: boolean;
}) {
  const t = useTranslations("dashboard.macro");
  const locale = useLocale() as Lang;
  const reduce = useReducedMotion();
  const value = useCountUp(line.value);
  const fmt = FORMAT[line.key] ?? { decimals: 1, signed: false };

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.25,
        ease: EASE,
        delay: Math.min(index, 8) * 0.04,
      }}
      className={cn("py-3", !last && "border-border border-b")}
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-navy text-sm font-medium">{t(line.key)}</span>
        <span className="text-navy financial text-lg font-extrabold">
          {formatPercent(value, locale, {
            decimals: fmt.decimals,
            signed: fmt.signed,
          })}
        </span>
      </div>
      <p className="text-text-secondary mt-0.5 text-[0.6875rem]">
        {t("source", { page: line.page })}
      </p>
    </motion.div>
  );
}

/**
 * Saudi macro strip — three GASTAT/SAMA figures (real GDP, average CPI, SAMA
 * repo rate), each transcribed verbatim from the corpus macro pack with its
 * exact page cited (AGENTS.md rule 5). Count-up on first reveal.
 */
export function MacroCard({ lines }: { lines: MacroLineData[] }) {
  const t = useTranslations("dashboard.macro");

  return (
    <Card elevated padding="md" className="flex flex-col">
      <h3 className="text-navy text-sm font-bold">{t("title")}</h3>
      <p className="text-text-secondary mt-0.5 text-xs">{t("subtitle")}</p>
      <div className="mt-2">
        {lines.map((line, i) => (
          <MacroLine
            key={line.key}
            line={line}
            index={i}
            last={i === lines.length - 1}
          />
        ))}
      </div>
    </Card>
  );
}
