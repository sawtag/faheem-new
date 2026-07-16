"use client";

import * as React from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn, formatPercent } from "@/lib/utils";
import type { Deal, Lang, Localized } from "@/lib/types";
import { useCountUp } from "@/lib/use-count-up";

const EASE = [0.4, 0, 0.2, 1] as const;

/** Latin-digit integer in both locales (counts, stage tallies). */
function western(value: number, lang: Lang): string {
  return new Intl.NumberFormat(lang === "ar" ? "ar-u-nu-latn" : "en-US").format(
    value,
  );
}

/** kebab stage id → `deals.stage.*` key (mirrors components/deals/stage-badge). */
const STAGE_KEY: Record<Deal["stage"], string> = {
  screening: "screening",
  analysis: "analysis",
  "ic-review": "icReview",
  declined: "declined",
};

export interface DashboardStats {
  pipeline: {
    activeCount: number;
    byStage: { stage: Deal["stage"]; count: number }[];
  };
  aum: { value: number; page: number };
  mandate: {
    exposure: number;
    cap: number;
    headroomPp: number;
    warn: boolean;
    expPage: number;
    capPage: number;
  };
  icQueue: { count: number; nextName: Localized | null };
}

/** Shared card shell: caption label on top, source/footer pinned to the bottom. */
function StatCard({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Card padding="sm" elevated className="flex min-w-0 flex-col">
      <p className="text-text-secondary text-xs font-semibold tracking-[0.04em] uppercase">
        {label}
      </p>
      {children}
    </Card>
  );
}

function PipelineCard({ pipeline }: { pipeline: DashboardStats["pipeline"] }) {
  const t = useTranslations("dashboard.stats.pipeline");
  const tStage = useTranslations("deals.stage");
  const locale = useLocale() as Lang;
  const count = useCountUp(pipeline.activeCount);

  return (
    <StatCard label={t("label")}>
      <p className="text-navy financial mt-1.5 text-2xl font-extrabold">
        {western(Math.round(count), locale)}
      </p>
      <p className="text-text-secondary mt-2 text-xs">
        {pipeline.byStage
          .map(
            (s) => `${western(s.count, locale)} ${tStage(STAGE_KEY[s.stage])}`,
          )
          .join(" · ")}
      </p>
      <p className="text-text-secondary mt-auto pt-2 text-xs">{t("caption")}</p>
    </StatCard>
  );
}

function AumCard({ aum }: { aum: DashboardStats["aum"] }) {
  const t = useTranslations("dashboard.stats.aum");
  const locale = useLocale() as Lang;
  const value = useCountUp(aum.value);

  return (
    <StatCard label={t("label")}>
      <p className="text-navy financial mt-1.5 text-2xl font-extrabold">
        {t("value", {
          value: new Intl.NumberFormat(
            locale === "ar" ? "ar-u-nu-latn" : "en-US",
            { minimumFractionDigits: 1, maximumFractionDigits: 1 },
          ).format(value),
        })}
      </p>
      <p className="text-text-secondary mt-auto pt-2 text-xs">
        {t("source", { page: aum.page })}
      </p>
    </StatCard>
  );
}

function LimitBar({
  exposure,
  cap,
  warn,
  ariaLabel,
}: {
  exposure: number;
  cap: number;
  warn: boolean;
  ariaLabel: string;
}) {
  const reduce = useReducedMotion();
  const util = Math.min(1, exposure / cap);

  return (
    <div
      className="relative mt-2 h-2.5 w-full"
      role="img"
      aria-label={ariaLabel}
    >
      <div className="bg-navy-100 rounded-pill absolute inset-0 overflow-hidden">
        <motion.div
          className={cn(
            "rounded-pill h-full",
            warn ? "bg-warning" : "bg-accent",
          )}
          initial={reduce ? false : { width: 0 }}
          animate={{ width: `${util * 100}%` }}
          transition={{ duration: 0.4, ease: EASE }}
        />
      </div>
      {/* danger tick marking the cap at the inline-end edge of the track */}
      <span
        aria-hidden="true"
        className="bg-danger rounded-pill absolute inset-y-[-2px] end-0 w-[2px]"
      />
    </div>
  );
}

function MandateCard({ mandate }: { mandate: DashboardStats["mandate"] }) {
  const t = useTranslations("dashboard.stats.mandate");
  const locale = useLocale() as Lang;
  const exposure = useCountUp(mandate.exposure);

  return (
    <StatCard label={t("label")}>
      <p className="text-navy financial mt-1.5 text-2xl font-extrabold">
        {formatPercent(exposure, locale, { decimals: 1 })}
      </p>
      <p className="text-text-secondary text-xs">{t("exposureLabel")}</p>
      <LimitBar
        exposure={mandate.exposure}
        cap={mandate.cap}
        warn={mandate.warn}
        ariaLabel={t("barAria", {
          exposure: formatPercent(mandate.exposure, locale, { decimals: 1 }),
          cap: western(mandate.cap, locale),
        })}
      />
      <p className="text-navy-700 mt-2 text-xs font-medium">
        {t("headroom", {
          value: new Intl.NumberFormat(
            locale === "ar" ? "ar-u-nu-latn" : "en-US",
            { minimumFractionDigits: 1, maximumFractionDigits: 1 },
          ).format(mandate.headroomPp),
          cap: western(mandate.cap, locale),
        })}
      </p>
      <p className="text-text-secondary mt-auto pt-2 text-xs">
        {t("source", { expPage: mandate.expPage, capPage: mandate.capPage })}
      </p>
    </StatCard>
  );
}

function IcQueueCard({ icQueue }: { icQueue: DashboardStats["icQueue"] }) {
  const t = useTranslations("dashboard.stats.icQueue");
  const locale = useLocale() as Lang;
  const count = useCountUp(icQueue.count);

  return (
    <StatCard label={t("label")}>
      <p className="text-navy financial mt-1.5 text-2xl font-extrabold">
        {western(Math.round(count), locale)}
      </p>
      <p className="text-text-secondary mt-2 text-xs">
        {icQueue.nextName
          ? t("next", { name: icQueue.nextName[locale] })
          : t("empty")}
      </p>
      <Link
        href="/ic"
        className="text-accent-700 hover:text-accent-800 focus-visible:ring-accent focus-visible:ring-offset-card rounded-btn mt-auto inline-flex items-center gap-1 pt-2 text-xs font-semibold outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
      >
        {t("link")}
        <ArrowRight className="size-3 rtl:-scale-x-100" aria-hidden="true" />
      </Link>
    </StatCard>
  );
}

/**
 * Firm mission-control stats row, four cards, each value carrying its source
 * or derivation (AGENTS.md rule 5): the live-pipeline tally (derived from
 * deals.json), AUM (IC Charter p.1), the mandate-headroom governance bar
 * (Portfolio p.1 vs the IC Charter's 10% cap p.4), and the IC review queue.
 * Every figure counts up on first reveal (motion law, 400ms, tabular-nums).
 */
export function StatsRow({ stats }: { stats: DashboardStats }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <PipelineCard pipeline={stats.pipeline} />
      <AumCard aum={stats.aum} />
      <MandateCard mandate={stats.mandate} />
      <IcQueueCard icQueue={stats.icQueue} />
    </div>
  );
}
