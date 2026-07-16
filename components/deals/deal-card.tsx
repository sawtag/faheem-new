"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { CircleSlash2, Globe, Inbox } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { LogoTile } from "@/components/ui/logo-tile";
import { RiskBreakdown } from "@/components/deals/risk-breakdown";
import { hurdleDelta } from "@/components/ic/metrics";
import { useCountUp } from "@/lib/use-count-up";
import { cn, formatPercent, westernNumber } from "@/lib/utils";
import type { Deal, IcMetrics, Lang, ScreeningRow } from "@/lib/types";

const SEGMENT: Record<ScreeningRow["verdict"], string> = {
  pass: "bg-accent-400",
  warn: "bg-warning",
  fail: "bg-danger",
};

/**
 * Screening evidence strip: one tinted segment per scorecard criterion
 * (pass/warn/fail), with the verdict tally and the charter it was checked
 * against. Pure render of deals.json `screening.rows`; the workspace holds
 * the full cited scorecard.
 */
function ScreeningStrip({ rows }: { rows: ScreeningRow[] }) {
  const t = useTranslations("deals");
  const locale = useLocale() as Lang;

  const tally = { pass: 0, warn: 0, fail: 0 };
  for (const row of rows) tally[row.verdict] += 1;
  const parts = (
    [
      ["pass", "text-accent-700"],
      ["warn", "text-warning-700"],
      ["fail", "text-danger-700"],
    ] as const
  ).filter(([verdict]) => tally[verdict] > 0);

  return (
    <div className="border-border mt-4 border-t pt-3">
      <div className="flex items-center gap-1">
        {rows.map((row) => (
          <span
            key={row.criterion.en}
            data-testid="screen-segment"
            data-verdict={row.verdict}
            title={`${row.criterion[locale]}: ${t(`scorecard.${row.verdict}`)}`}
            className={cn("rounded-pill h-1.5 flex-1", SEGMENT[row.verdict])}
          />
        ))}
      </div>
      <div className="financial mt-2 flex items-baseline justify-between gap-2 text-[0.6875rem]">
        <p className="flex flex-wrap gap-x-1.5">
          {parts.map(([verdict, tone]) => (
            <span key={verdict} className={cn("font-semibold", tone)}>
              {westernNumber(tally[verdict], locale)}{" "}
              {t(`scorecard.${verdict}`)}
            </span>
          ))}
        </p>
        <p className="text-text-secondary/80 shrink-0">
          {t("board.screenSource")}
        </p>
      </div>
    </div>
  );
}

/** Count-up stat figure (motion law: 400ms, tabular-nums via `financial`). */
function StatValue({
  value,
  format,
  className,
}: {
  value: number;
  format: (n: number) => string;
  className?: string;
}) {
  const n = useCountUp(value);
  return <span className={cn("financial", className)}>{format(n)}</span>;
}

/**
 * Analysis / IC-review evidence strip: implied IRR with its signed bps gap to
 * the mandate hurdle, the hurdle itself, and the risk score, all straight from
 * deals.json `icMetrics` with the analysis-summary source caption (rule 5).
 */
function MetricsStrip({ m, dealId }: { m: IcMetrics; dealId: string }) {
  const t = useTranslations("deals.board");
  const locale = useLocale() as Lang;

  const delta = hurdleDelta(m.irr, m.hurdle);
  const tone =
    delta.tone === "above"
      ? "text-accent-700"
      : delta.tone === "below"
        ? "text-danger-700"
        : "text-text-secondary";
  const mark =
    delta.tone === "above" ? "▲" : delta.tone === "below" ? "▼" : "–";
  const deltaLabel =
    delta.tone === "equal"
      ? t("atHurdle")
      : t("bps", { bps: westernNumber(Math.abs(delta.bps), locale) });

  return (
    <div className="border-border mt-4 border-t pt-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-text-secondary text-[0.6875rem] font-semibold tracking-[0.04em] uppercase">
            {t("irrLabel")}
          </p>
          <StatValue
            value={m.irr}
            format={(n) => formatPercent(n, locale)}
            className="text-navy mt-0.5 block text-lg leading-tight font-extrabold"
          />
          <p
            data-testid="card-irr-delta"
            data-tone={delta.tone}
            className={cn(
              "financial mt-0.5 text-[0.6875rem] font-semibold",
              tone,
            )}
          >
            {mark} {deltaLabel}
          </p>
        </div>
        <div>
          <p className="text-text-secondary text-[0.6875rem] font-semibold tracking-[0.04em] uppercase">
            {t("hurdleLabel")}
          </p>
          <StatValue
            value={m.hurdle}
            format={(n) => formatPercent(n, locale, { decimals: 0 })}
            className="text-navy-700 mt-0.5 block text-lg leading-tight font-bold"
          />
          <RiskBreakdown
            score={m.riskScore}
            companyId={dealId}
            cite={m.cite}
            triggerClassName="text-text-secondary financial mt-0.5 text-[0.6875rem]"
          >
            {t("risk", { score: westernNumber(m.riskScore, locale, 1) })}
          </RiskBreakdown>
        </div>
      </div>
      <p className="text-text-secondary/80 financial mt-2 text-[0.6875rem]">
        {t("metricsSource", { page: m.cite.page })}
      </p>
    </div>
  );
}

/**
 * One pipeline card. Real logos come from deals.json (`logo` path, Jahez's is
 * vendored); fictional companies fall back to the monogram tile (assets
 * policy). Below the status line each card carries its stage evidence:
 * screening deals show the scorecard verdict strip, analysis/IC deals show
 * IRR vs the mandate hurdle, declined deals show the decline reason.
 */
export function DealCard({ deal }: { deal: Deal }) {
  const t = useTranslations("deals.board");
  const locale = useLocale() as Lang;
  const declined = deal.stage === "declined";

  const originLabel =
    deal.originDetail?.[locale] ??
    (deal.origin === "inbound" ? t("originInbound") : t("originMarket"));
  const OriginIcon = deal.origin === "inbound" ? Inbox : Globe;

  return (
    <Card
      hover={!declined}
      elevated={!declined}
      padding="none"
      className={cn("group relative", declined && "bg-bg")}
      data-testid="deal-card"
      data-deal={deal.id}
    >
      {/* Stretched-link card: the name is the single navigating anchor, its
          ::after overlay extends the hit-target to the whole card, and any
          interactive child (the risk breakdown) lifts above it with z-10. This
          keeps a lone <a> per card while letting the risk score open its own
          popover without an interactive-in-anchor nesting. */}
      <div className="p-5">
        <div className="flex items-start gap-3">
          {deal.logo ? (
            <span
              className={cn(
                "border-border bg-card rounded-btn grid size-10 shrink-0 place-items-center border p-1.5",
                declined && "opacity-60",
              )}
            >
              <Image
                src={deal.logo}
                alt=""
                width={28}
                height={28}
                unoptimized
                className="size-full object-contain"
              />
            </span>
          ) : (
            <LogoTile
              label={deal.name.en}
              initial={deal.name[locale].charAt(0)}
              size={40}
              className={cn(declined && "opacity-60")}
            />
          )}
          <div className="min-w-0 flex-1">
            <Link
              href={`/deals/${deal.id}`}
              className={cn(
                "rounded-btn block truncate text-base font-bold outline-none after:absolute after:inset-0 after:content-[''] focus-visible:after:ring-2 focus-visible:after:ring-inset",
                "after:rounded-card focus-visible:after:ring-accent",
                declined ? "text-text-secondary" : "text-navy",
              )}
            >
              {deal.name[locale]}
            </Link>
            <p className="text-text-secondary truncate text-[0.8125rem]">
              {deal.sector[locale]}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          <Badge
            variant={deal.origin === "inbound" ? "mvp" : "mint"}
            size="sm"
            className={cn(declined && "opacity-70")}
          >
            <OriginIcon className="size-3" aria-hidden="true" />
            {originLabel}
          </Badge>
          {deal.ask && (
            <span className="text-navy-700 financial text-[0.8125rem] font-semibold">
              {deal.ask[locale]}
            </span>
          )}
        </div>

        {declined && deal.declineReason ? (
          <p className="text-text-secondary/80 mt-3 flex items-start gap-1.5 text-[0.8125rem] leading-relaxed">
            <CircleSlash2
              className="text-danger-700/60 mt-0.5 size-3.5 shrink-0"
              aria-hidden="true"
            />
            {deal.declineReason[locale]}
          </p>
        ) : (
          <p className="text-text-secondary mt-3 line-clamp-2 text-[0.8125rem] leading-relaxed">
            {deal.statusLine[locale]}
          </p>
        )}

        {deal.screening && <ScreeningStrip rows={deal.screening.rows} />}
        {deal.icMetrics && <MetricsStrip m={deal.icMetrics} dealId={deal.id} />}
      </div>
    </Card>
  );
}
