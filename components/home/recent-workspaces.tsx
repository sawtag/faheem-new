"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { LogoTile } from "@/components/ui/logo-tile";
import type { Deal, Lang } from "@/lib/types";

const EASE = [0.4, 0, 0.2, 1] as const; // mirrors --ease

/** Stage → badge tint: reads as progression (neutral → active mint → near-decision navy). */
const STAGE_VARIANT: Record<Deal["stage"], BadgeProps["variant"]> = {
  screening: "neutral",
  analysis: "mint",
  "ic-review": "navy",
  declined: "danger",
};

/**
 * "Recent workspaces", the live (non-declined) deals as tappable cards under
 * the omnibox. Monogram tile (no vendored logo yet), name, stage badge, sector
 * and status line; hover-lifts and routes into the company workspace. Cards
 * reveal with a staggered rise (motion law, cap 8).
 */
export function RecentWorkspaces({ deals }: { deals: Deal[] }) {
  const t = useTranslations("home");
  const tStage = useTranslations("home.stages");
  const locale = useLocale() as Lang;
  const reduce = useReducedMotion();

  if (deals.length === 0) return null;

  return (
    <section className="mt-10">
      <h2 className="text-text-secondary mb-3 text-[0.8125rem] font-bold tracking-[0.04em] uppercase">
        {t("recent.title")}
      </h2>
      <motion.ul
        initial={reduce ? false : "hidden"}
        animate="show"
        variants={{ show: { transition: { staggerChildren: 0.04 } } }}
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        {deals.slice(0, 8).map((deal) => (
          <motion.li
            key={deal.id}
            variants={{
              hidden: { opacity: 0, y: 8 },
              show: {
                opacity: 1,
                y: 0,
                transition: { duration: 0.25, ease: EASE },
              },
            }}
          >
            <Link
              href={`/deals/${deal.id}`}
              className="rounded-card border-border bg-card shadow-card focus-visible:ring-accent focus-visible:ring-offset-bg block h-full border p-4 transition duration-[var(--duration-fast)] ease-[var(--ease)] outline-none hover:-translate-y-px hover:shadow-[var(--shadow-hover)] focus-visible:ring-2 focus-visible:ring-offset-2"
            >
              <div className="flex items-start gap-3">
                <LogoTile
                  label={deal.name.en}
                  initial={deal.name[locale].charAt(0)}
                  size={40}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-navy truncate text-[0.9375rem] font-bold">
                      {deal.name[locale]}
                    </p>
                    <Badge
                      variant={STAGE_VARIANT[deal.stage]}
                      size="sm"
                      className="shrink-0"
                    >
                      {tStage(deal.stage)}
                    </Badge>
                  </div>
                  <p className="text-text-secondary mt-0.5 truncate text-xs font-medium">
                    {deal.sector[locale]}
                  </p>
                </div>
              </div>
              <p className="text-text-secondary mt-3 line-clamp-2 text-[0.8125rem] leading-relaxed">
                {deal.statusLine[locale]}
              </p>
            </Link>
          </motion.li>
        ))}
      </motion.ul>
    </section>
  );
}
