"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { LucideIcon } from "@/components/shell/lucide-icon";
import briefData from "@/data/home-brief.json";
import type { HomeBriefItem, Lang } from "@/lib/types";

const EASE = [0.4, 0, 0.2, 1] as const; // mirrors --ease
const ITEMS = briefData as HomeBriefItem[];

/**
 * "While you were away": the agentic briefing under the omnibox. Four seeded
 * event rows showing the platform worked autonomously (source sync, screening,
 * memo draft, scheduled scan), each linking to the real surface, with a quiet
 * audit-trail footer for the governance tie-in. Rows and copy live in
 * data/home-brief.json (validated); counts align with the seeded deals story.
 */
export function AwayBrief() {
  const t = useTranslations("home.brief");
  const locale = useLocale() as Lang;
  const reduce = useReducedMotion();

  return (
    <section className="mt-10">
      <h2 className="text-text-secondary mb-3 text-[0.8125rem] font-bold tracking-[0.04em] uppercase">
        {t("title")}
      </h2>
      <div className="border-border bg-card rounded-card border shadow-[var(--shadow-card)]">
        <motion.ul
          initial={reduce ? false : "hidden"}
          animate="show"
          variants={{ show: { transition: { staggerChildren: 0.035 } } }}
          className="divide-border divide-y"
        >
          {ITEMS.map((item) => (
            <motion.li
              key={item.id}
              variants={{
                hidden: { opacity: 0, y: 6 },
                show: {
                  opacity: 1,
                  y: 0,
                  transition: { duration: 0.25, ease: EASE },
                },
              }}
            >
              <Link
                href={item.href}
                className="group hover:bg-navy-50 focus-visible:ring-accent flex items-center gap-3 px-4 py-3 transition-colors duration-[var(--duration-fast)] ease-[var(--ease)] outline-none focus-visible:ring-2 focus-visible:ring-inset"
              >
                <span className="bg-accent-50 text-accent-700 rounded-btn grid size-8 shrink-0 place-items-center">
                  <LucideIcon name={item.icon} className="size-4" />
                </span>
                <span className="text-navy min-w-0 flex-1 truncate text-sm font-medium">
                  {item.text[locale]}
                </span>
                <span className="text-text-secondary financial shrink-0 text-xs">
                  {item.time[locale]}
                </span>
                <ChevronRight
                  className="text-text-secondary group-hover:text-navy size-4 shrink-0 transition-colors rtl:-scale-x-100"
                  aria-hidden="true"
                />
              </Link>
            </motion.li>
          ))}
        </motion.ul>
        <div className="border-border border-t px-4 py-2.5">
          <Link
            href="/audit"
            className="text-text-secondary hover:text-navy focus-visible:ring-accent rounded-btn text-xs font-semibold underline-offset-2 outline-none hover:underline focus-visible:ring-2"
          >
            {t("audit")}
          </Link>
        </div>
      </div>
    </section>
  );
}
