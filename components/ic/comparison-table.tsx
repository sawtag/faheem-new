"use client";

import * as React from "react";
import { animate, motion, useReducedMotion } from "motion/react";
import { FileText } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { LogoTile } from "@/components/ui/logo-tile";
import { Skeleton } from "@/components/ui/skeleton";
import manifest from "@/data/corpus/manifest.json";
import type { CorpusDoc, Deal, IcMetrics, Lang } from "@/lib/types";
import { formatPercent, westernNumber } from "@/lib/utils";
import { hurdleDelta, riskBand, riskSegments } from "@/components/ic/metrics";

const DOC_TITLES = new Map(
  (manifest as CorpusDoc[]).map((d) => [d.id, d.title]),
);

const EASE = [0.4, 0, 0.2, 1] as const;

/** The six committee metrics, in sheet order (spec §11). */
const ROWS = [
  "irr",
  "expectedReturn",
  "riskScore",
  "mandateFit",
  "compliance",
  "recommendation",
] as const;
type RowKey = (typeof ROWS)[number];

/**
 * The committee sheet: one column per analysis-complete deal, six metric rows,
 * rendered straight from `deals.json` `icMetrics`. A deal still in analysis (no
 * `icMetrics`) shows a pending state, skeleton cells + caption, never fake
 * numbers (the Jahez metrics land at model sign-off before demo day).
 */
export function ComparisonTable({
  columns,
  onOpenDoc,
}: {
  columns: Deal[];
  onOpenDoc: (docId: string, page: number) => void;
}) {
  const t = useTranslations("ic.table");
  const locale = useLocale() as Lang;

  const hurdle = columns.find((d) => d.icMetrics)?.icMetrics?.hurdle;
  const hurdleLabel =
    hurdle != null ? formatPercent(hurdle, locale, { decimals: 0 }) : "";

  return (
    <div className="border-border bg-card rounded-card overflow-x-auto border shadow-[var(--shadow-card)]">
      <table
        data-testid="ic-comparison-table"
        className="financial w-full border-collapse text-start"
      >
        <caption className="sr-only">{t("caption")}</caption>
        <thead>
          <tr className="border-border border-b">
            <th
              scope="col"
              className="text-text-secondary w-[34%] min-w-[9rem] px-5 py-4 text-start align-bottom text-[0.6875rem] font-bold tracking-[0.06em] uppercase"
            >
              {t("metric")}
            </th>
            {columns.map((deal) => (
              <ColumnHeader key={deal.id} deal={deal} locale={locale} />
            ))}
          </tr>
        </thead>
        <tbody>
          {ROWS.map((row, i) => (
            <motion.tr
              key={row}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, ease: EASE, delay: i * 0.04 }}
              className="border-border border-b last:border-b-0"
            >
              <th
                scope="row"
                className="px-5 py-4 text-start align-top font-normal"
              >
                <span className="text-navy block text-sm font-semibold">
                  {t(row)}
                </span>
                {row === "irr" && hurdleLabel && (
                  <span className="text-text-secondary mt-0.5 block text-xs">
                    {t("irrVsHurdle", { hurdle: hurdleLabel })}
                  </span>
                )}
              </th>
              {columns.map((deal) => (
                <td key={deal.id} className="px-5 py-4 align-top">
                  <MetricCell
                    row={row}
                    deal={deal}
                    locale={locale}
                    onOpenDoc={onOpenDoc}
                  />
                </td>
              ))}
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─────────────────────────────── column header ───────────────────────────────

function ColumnHeader({ deal, locale }: { deal: Deal; locale: Lang }) {
  const t = useTranslations("ic.table");
  const pending = !deal.icMetrics;
  return (
    <th
      scope="col"
      data-testid={`ic-col-${deal.id}`}
      className="min-w-[11rem] px-5 py-4 text-start align-bottom"
    >
      <div className="flex items-center gap-2.5">
        <LogoTile
          label={deal.name.en}
          initial={deal.name[locale].charAt(0)}
          size={40}
        />
        <div className="min-w-0">
          <span className="text-navy block truncate text-[0.9375rem] font-bold">
            {deal.name[locale]}
          </span>
          <span className="text-text-secondary block truncate text-xs font-medium">
            {deal.sector[locale]}
          </span>
        </div>
      </div>
      <div className="mt-2">
        <Badge variant={pending ? "neutral" : "mint"} size="sm">
          {pending ? t("pendingBadge") : t("reviewBadge")}
        </Badge>
      </div>
    </th>
  );
}

// ──────────────────────────────── metric cells ───────────────────────────────

function MetricCell({
  row,
  deal,
  locale,
  onOpenDoc,
}: {
  row: RowKey;
  deal: Deal;
  locale: Lang;
  onOpenDoc: (docId: string, page: number) => void;
}) {
  const t = useTranslations("ic.table");
  const m = deal.icMetrics;

  // Pending column: honest skeletons for metric cells, one caption in the last row.
  if (!m) {
    if (row === "recommendation") {
      return (
        <p
          data-testid={`ic-pending-${deal.id}`}
          className="text-text-secondary max-w-[16rem] text-xs leading-snug italic"
        >
          {t("pending")}
        </p>
      );
    }
    return <Skeleton className="rounded-btn h-6 w-20" />;
  }

  switch (row) {
    case "irr":
      return <IrrCell m={m} locale={locale} dealId={deal.id} />;
    case "expectedReturn":
      return (
        <StatNumber
          value={m.expectedReturn}
          format={(n) => formatPercent(n, locale)}
          className="text-navy text-xl font-bold"
        />
      );
    case "riskScore":
      return <RiskCell m={m} locale={locale} />;
    case "mandateFit":
      return (
        <Badge variant={m.mandateFit === "pass" ? "mint" : "warning"}>
          {m.mandateFit === "pass" ? t("pass") : t("warn")}
        </Badge>
      );
    case "compliance":
      return (
        <Badge variant={m.compliance === "pass" ? "mint" : "danger"}>
          {m.compliance === "pass" ? t("pass") : t("fail")}
        </Badge>
      );
    case "recommendation":
      return (
        <div className="max-w-[18rem]">
          <p className="text-text text-sm leading-snug">
            {m.recommendation[locale]}
          </p>
          <CiteChip
            docId={m.cite.docId}
            page={m.cite.page}
            locale={locale}
            onOpen={onOpenDoc}
          />
        </div>
      );
  }
}

function IrrCell({
  m,
  locale,
  dealId,
}: {
  m: IcMetrics;
  locale: Lang;
  dealId: string;
}) {
  const t = useTranslations("ic.table");
  const delta = hurdleDelta(m.irr, m.hurdle);
  const tone =
    delta.tone === "above"
      ? "text-accent-700"
      : delta.tone === "below"
        ? "text-danger-700"
        : "text-text-secondary";
  const mark =
    delta.tone === "above" ? "▲" : delta.tone === "below" ? "▼" : "–";
  const label =
    delta.tone === "equal"
      ? t("deltaEqual")
      : t("bps", { bps: westernNumber(Math.abs(delta.bps), locale) });
  return (
    <div>
      <StatNumber
        value={m.irr}
        format={(n) => formatPercent(n, locale)}
        className="text-navy text-xl font-bold"
      />
      <span
        data-testid={`ic-irr-delta-${dealId}`}
        data-tone={delta.tone}
        className={`mt-1 flex items-center gap-1 text-xs font-semibold ${tone}`}
      >
        <span aria-hidden="true">{mark}</span>
        <span className="financial">{label}</span>
      </span>
    </div>
  );
}

function RiskCell({ m, locale }: { m: IcMetrics; locale: Lang }) {
  const t = useTranslations("ic.table");
  const filled = riskSegments(m.riskScore);
  const band = riskBand(m.riskScore);
  const fill =
    band === "low"
      ? "bg-accent-400"
      : band === "high"
        ? "bg-danger"
        : "bg-navy-400";
  return (
    <div>
      {/* dir=ltr so the "5 / 10" ratio never reorders to "10 / 5" in RTL. */}
      <span dir="ltr" className="inline-block">
        <StatNumber
          value={m.riskScore}
          format={(n) => t("riskOutOf", { score: westernNumber(n, locale, 1) })}
          className="text-navy text-xl font-bold"
        />
      </span>
      <span
        className="mt-2 flex max-w-[8rem] gap-0.5"
        role="img"
        aria-label={t("riskOutOf", {
          score: westernNumber(m.riskScore, locale, 1),
        })}
      >
        {Array.from({ length: 10 }, (_, i) => (
          <span
            key={i}
            className={`rounded-pill h-1.5 flex-1 ${i < filled ? fill : "bg-navy-100"}`}
          />
        ))}
      </span>
    </div>
  );
}

function CiteChip({
  docId,
  page,
  locale,
  onOpen,
}: {
  docId: string;
  page: number;
  locale: Lang;
  onOpen: (docId: string, page: number) => void;
}) {
  const t = useTranslations("ic.table");
  const title = DOC_TITLES.get(docId)?.[locale] ?? docId;
  return (
    <button
      type="button"
      onClick={() => onOpen(docId, page)}
      className="bg-accent-50 text-accent-700 hover:bg-accent-100 focus-visible:ring-accent focus-visible:ring-offset-card rounded-pill mt-2 inline-flex max-w-full items-center gap-1.5 px-2 py-1 text-xs font-semibold transition-colors duration-[var(--duration-fast)] ease-[var(--ease)] outline-none focus-visible:ring-2 focus-visible:ring-offset-1"
      aria-label={`${t("source")}: ${title}`}
    >
      <FileText className="size-3.5 shrink-0" aria-hidden="true" />
      <span className="truncate">{title}</span>
      <span className="financial shrink-0 opacity-80">
        {t("page", { page })}
      </span>
    </button>
  );
}

// ───────────────────────────── count-up number ─────────────────────────────

function StatNumber({
  value,
  format,
  className,
}: {
  value: number;
  format: (n: number) => string;
  className?: string;
}) {
  const reduce = useReducedMotion();
  // Reduced motion → render the final figure immediately (initial state); only
  // the animated path drives setState, and only from the rAF callback.
  const [n, setN] = React.useState(reduce ? value : 0);

  React.useEffect(() => {
    if (reduce) return;
    const controls = animate(0, value, {
      duration: 0.4,
      ease: EASE,
      onUpdate: (v) => setN(v),
    });
    return () => controls.stop();
  }, [value, reduce]);

  return <span className={`financial ${className ?? ""}`}>{format(n)}</span>;
}
