"use client";

import * as React from "react";
import { Radar, TrendingDown } from "lucide-react";
import { animate, useReducedMotion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { ScreeningScorecard } from "@/components/deals/screening-scorecard";
import { WorkspaceAnalytics } from "@/components/deals/workspace-analytics";
import { cn, formatPercent, formatSAR } from "@/lib/utils";
import type { Cite, Deal, Lang, Localized } from "@/lib/types";

const EASE = [0.4, 0, 0.2, 1] as const;

/** One verified figure for the Jahez stats row — value + its source ref, read verbatim from model-inputs.json by the page. */
export interface WorkspaceStat {
  /** i18n key under `deals.overview.stats.*` */
  key: string;
  /** SAR millions (model-inputs "SAR m" unit) */
  value: number;
  docTitle: Localized;
  page: number;
  /** optional YoY delta in percent (e.g. -61.2) */
  deltaPct?: number;
}

/** 400ms count-up on first reveal (motion law) — skipped under reduced motion. */
function useCountUp(target: number): number {
  const reduced = useReducedMotion();
  const [value, setValue] = React.useState(reduced ? target : 0);
  React.useEffect(() => {
    if (reduced) return;
    const controls = animate(0, target, {
      duration: 0.4,
      ease: EASE,
      onUpdate: setValue,
    });
    return () => controls.stop();
  }, [target, reduced]);
  return value;
}

function StatCard({ stat }: { stat: WorkspaceStat }) {
  const t = useTranslations("deals.overview");
  const locale = useLocale() as Lang;
  const value = useCountUp(stat.value);

  return (
    <Card padding="sm" elevated className="min-w-0">
      <p className="text-text-secondary text-xs font-semibold tracking-[0.04em] uppercase">
        {t(`stats.${stat.key}`)}
      </p>
      <div className="mt-1.5 flex flex-wrap items-baseline gap-2">
        <p className="text-navy financial text-2xl font-extrabold">
          {formatSAR(value, locale)}
        </p>
        {stat.deltaPct !== undefined && (
          <span
            className={cn(
              "financial inline-flex items-center gap-0.5 text-xs font-semibold",
              stat.deltaPct < 0 ? "text-danger-700" : "text-accent-700",
            )}
          >
            {stat.deltaPct < 0 && (
              <TrendingDown className="size-3" aria-hidden="true" />
            )}
            {formatPercent(stat.deltaPct, locale, { signed: true })}{" "}
            {t("stats.yoy")}
          </span>
        )}
      </div>
      <p className="text-text-secondary mt-2 truncate text-xs">
        {t("source", { doc: stat.docTitle[locale], page: stat.page })}
      </p>
    </Card>
  );
}

/**
 * Overview tab content, per company: Darb = the Screening Agent scorecard;
 * Jahez = origin story (the market-screen pivot) + verified FY2025 key
 * figures; everyone else = the status line as a quiet card.
 */
export function WorkspaceOverview({
  deal,
  stats,
  onCite,
}: {
  deal: Deal;
  stats: WorkspaceStat[];
  onCite: (cite: Cite) => void;
}) {
  const t = useTranslations("deals.overview");
  const locale = useLocale() as Lang;

  if (deal.screening) {
    return (
      <ScreeningScorecard
        rows={deal.screening.rows}
        verdict={deal.screening.verdict}
        onCite={onCite}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {deal.originDetail && (
        <Card padding="sm" elevated className="flex items-center gap-3">
          <span className="bg-accent-50 text-accent-700 rounded-btn grid size-10 shrink-0 place-items-center">
            <Radar className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-text-secondary text-xs font-semibold tracking-[0.04em] uppercase">
              {t("originTitle")}
            </p>
            <p className="text-navy mt-0.5 text-sm font-semibold">
              {t("surfaced", { detail: deal.originDetail[locale] })}
            </p>
          </div>
        </Card>
      )}

      {stats.length > 0 && (
        <section aria-label={t("statsTitle")}>
          <h2 className="text-text-secondary mb-3 text-[0.8125rem] font-bold tracking-[0.04em] uppercase">
            {t("statsTitle")}
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {stats.map((stat) => (
              <StatCard key={stat.key} stat={stat} />
            ))}
          </div>
        </section>
      )}

      {deal.id === "jahez" && <WorkspaceAnalytics />}

      {!deal.originDetail && stats.length === 0 && (
        <Card padding="sm" elevated>
          <p className="text-text-secondary text-xs font-semibold tracking-[0.04em] uppercase">
            {t("statusTitle")}
          </p>
          <p className="text-navy mt-1 text-sm leading-relaxed">
            {deal.statusLine[locale]}
          </p>
        </Card>
      )}
    </div>
  );
}
