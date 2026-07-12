"use client";

import { motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { LucideIcon } from "@/components/shell/lucide-icon";

const EASE = [0.4, 0, 0.2, 1] as const; // mirrors --ease

/** Pill vocabulary (spec §4 item 2). Icons are UI decoration, not entity data. */
const PILLS = [
  { id: "dcf", icon: "calculator" },
  { id: "comps", icon: "git-compare" },
  { id: "icMemo", icon: "file-text" },
  { id: "riskScorecard", icon: "shield-alert" },
  { id: "sensitivity", icon: "table-2" },
  { id: "shariah", icon: "badge-check" },
] as const;

/**
 * Quick-action pills. Each click prefills the omnibox with a full, Jahez-flavored
 * analyst prompt and focuses it — the presenter fires a real analysis in one tap.
 */
export function QuickActions({ onPick }: { onPick: (prompt: string) => void }) {
  const t = useTranslations("home.pills");
  const reduce = useReducedMotion();

  return (
    <motion.div
      initial={reduce ? false : "hidden"}
      animate="show"
      variants={{
        show: { transition: { staggerChildren: 0.03, delayChildren: 0.05 } },
      }}
      className="mt-5 flex flex-wrap justify-center gap-2"
      aria-label={t("label")}
    >
      {PILLS.map((p) => (
        <motion.button
          key={p.id}
          type="button"
          onClick={() => onPick(t(`${p.id}.prompt`))}
          variants={{
            hidden: { opacity: 0, y: 6 },
            show: {
              opacity: 1,
              y: 0,
              transition: { duration: 0.2, ease: EASE },
            },
          }}
          className="rounded-pill border-border bg-card text-navy hover:border-navy-300 hover:bg-navy-50 focus-visible:ring-accent focus-visible:ring-offset-bg inline-flex items-center gap-1.5 border px-3.5 py-2 text-[0.8125rem] font-semibold whitespace-nowrap transition-colors duration-[var(--duration-fast)] ease-[var(--ease)] outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
        >
          <LucideIcon name={p.icon} className="text-accent size-4" />
          {t(`${p.id}.label`)}
        </motion.button>
      ))}
    </motion.div>
  );
}
