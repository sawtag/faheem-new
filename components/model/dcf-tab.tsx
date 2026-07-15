"use client";

import { useLocale, useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { AnswerChart } from "@/components/chat/answer-chart";
import { YEARS } from "@/lib/model/compute";
import { formatSAR } from "@/lib/utils";
import type { Lang } from "@/lib/types";
import type { ChartSpec } from "@/lib/chart-data";
import type { ModelKey, ModelOutputs } from "@/lib/model/types";
import {
  GridTable,
  ModelCell,
  RowLabel,
  useModelCtx,
} from "@/components/model/model-grid";
import { ModelSectionCard } from "@/components/model/model-section-card";

const ALL_YEARS = YEARS.map((_, i) => i); // 0..7 FY23A..FY30E
const FORECAST_IDX = [0, 1, 2, 3, 4]; // base-scenario indices → FY26E..FY30E
const F0 = 3;

/** Actual/Forecast column legend. */
function Legend() {
  const t = useTranslations();
  return (
    <div className="mb-2 flex items-center gap-4" dir="ltr">
      <span className="text-text-secondary flex items-center gap-1.5 text-[0.6875rem] font-semibold">
        <span
          className="bg-navy-100 inline-block size-2.5 rounded-[3px]"
          aria-hidden="true"
        />
        {t("model.live.dcf.legend.actual")}
      </span>
      <span className="text-text-secondary flex items-center gap-1.5 text-[0.6875rem] font-semibold">
        <span
          className="bg-accent-100 inline-block size-2.5 rounded-[3px]"
          aria-hidden="true"
        />
        {t("model.live.dcf.legend.forecast")}
      </span>
    </div>
  );
}

/** Year header row; actuals (idx<3) muted, forecast accent. */
function YearHead({ indices }: { indices: number[] }) {
  return (
    <thead>
      <tr>
        <th aria-hidden="true" />
        {indices.map((i) => (
          <th
            key={i}
            className={`financial px-2 pb-1.5 text-end text-xs font-bold tabular-nums ${
              i < F0 ? "text-text-secondary" : "text-accent-700"
            }`}
          >
            {YEARS[i]}
          </th>
        ))}
      </tr>
    </thead>
  );
}

/** Revenue build, plain 0..7 series, 8 year columns, actuals dimmed. */
function RevenueGrid() {
  const t = useTranslations();
  const rows = ["orders", "aov", "gmv", "netRev", "takeRate"];
  return (
    <GridTable>
      <YearHead indices={ALL_YEARS} />
      <tbody>
        {rows.map((metric) => (
          <tr key={metric}>
            <RowLabel
              fallback={t(`model.nodes.series.${metric}`)}
              strong={metric === "netRev"}
            />
            {ALL_YEARS.map((i) => (
              <ModelCell key={i} nodeKey={`${metric}.${i}`} muted={i < F0} />
            ))}
          </tr>
        ))}
      </tbody>
    </GridTable>
  );
}

/** Forecast statement → FCFF, base scenario, FY26E..FY30E. */
function StatementGrid() {
  const t = useTranslations();
  const rows = ["ebitda", "dna", "ebit", "nopat", "capex", "dnwc", "fcff"];
  return (
    <GridTable>
      <YearHead indices={FORECAST_IDX.map((i) => F0 + i)} />
      <tbody>
        {rows.map((metric) => (
          <tr key={metric}>
            <RowLabel
              fallback={t(`model.nodes.series.${metric}`)}
              strong={metric === "fcff"}
            />
            {FORECAST_IDX.map((i) => (
              <ModelCell key={i} nodeKey={`base.${metric}.${i}`} />
            ))}
          </tr>
        ))}
      </tbody>
    </GridTable>
  );
}

/** PV chain (pvf, pvFcff) + the valuation bridge scalars. */
function PvBridge() {
  const t = useTranslations();
  const pvRows = ["pvf", "pvFcff"];
  const bridge: [ModelKey, boolean][] = [
    ["base.sumPv", false],
    ["base.tv", false],
    ["base.pvTv", false],
    ["base.ev", true],
    ["netCash", false],
    ["base.equity", true],
    ["base.perShare", true],
    ["base.upside", false],
    ["base.irr", true],
  ];
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.3fr_1fr]">
      <div>
        <GridTable>
          <YearHead indices={FORECAST_IDX.map((i) => F0 + i)} />
          <tbody>
            {pvRows.map((metric) => (
              <tr key={metric}>
                <RowLabel fallback={t(`model.nodes.series.${metric}`)} />
                {FORECAST_IDX.map((i) => (
                  <ModelCell key={i} nodeKey={`base.${metric}.${i}`} />
                ))}
              </tr>
            ))}
          </tbody>
        </GridTable>
      </div>
      <div>
        <GridTable>
          <tbody>
            {bridge.map(([key, strong]) => (
              <tr key={key} className="border-border/60 border-b last:border-0">
                <RowLabel nodeKey={key} strong={strong} />
                <ModelCell nodeKey={key} className="w-28" />
              </tr>
            ))}
          </tbody>
        </GridTable>
      </div>
    </div>
  );
}

/** CAPM/WACC chain + capital structure, side by side. */
function WaccBuild() {
  const left: [ModelKey, boolean][] = [
    ["rf", false],
    ["erp", false],
    ["beta", false],
    ["ke", false],
    ["kdPre", false],
    ["kdAfter", false],
    ["wacc", true],
  ];
  const right: [ModelKey, boolean][] = [
    ["price", false],
    ["shares", false],
    ["E", false],
    ["debt", false],
    ["V", false],
    ["we", false],
    ["wd", false],
    ["netCash", false],
  ];
  const col = (rows: [ModelKey, boolean][]) => (
    <GridTable>
      <tbody>
        {rows.map(([key, strong]) => (
          <tr key={key} className="border-border/60 border-b last:border-0">
            <RowLabel nodeKey={key} strong={strong} />
            <ModelCell nodeKey={key} className="w-28" />
          </tr>
        ))}
      </tbody>
    </GridTable>
  );
  return (
    <div className="grid grid-cols-1 gap-x-8 gap-y-2 sm:grid-cols-2">
      {col(left)}
      {col(right)}
    </div>
  );
}

// ─────────────────────────────── charts ───────────────────────────────

function fcffSpec(
  nodes: ModelOutputs["nodes"],
  lang: Lang,
  seriesLabel: string,
): ChartSpec {
  const cats = FORECAST_IDX.map((i) => YEARS[F0 + i] as string);
  return {
    kind: "bar",
    unit: "currency",
    categories: cats,
    series: [seriesLabel],
    omittedRows: 0,
    bars: FORECAST_IDX.map((i) => {
      const v = nodes[`base.fcff.${i}`]!.value;
      return {
        category: YEARS[F0 + i] as string,
        series: seriesLabel,
        value: v,
        display: formatSAR(v, lang),
        negative: v < 0,
      };
    }),
  };
}

function perShareSpec(
  nodes: ModelOutputs["nodes"],
  lang: Lang,
  seriesLabel: string,
  scenarioLabels: Record<string, string>,
): ChartSpec {
  const order = ["bear", "base", "bull"];
  return {
    kind: "bar",
    unit: "number",
    categories: order.map((s) => scenarioLabels[s]!),
    series: [seriesLabel],
    omittedRows: 0,
    bars: order.map((s) => {
      const v = nodes[`${s}.perShare`]!.value;
      return {
        category: scenarioLabels[s]!,
        series: seriesLabel,
        value: v,
        display: formatSAR(v, lang, { unit: "abs", decimals: 2 }),
        negative: false,
      };
    }),
  };
}

function Charts() {
  const t = useTranslations();
  const locale = useLocale() as Lang;
  const { nodes } = useModelCtx();
  const scenarioLabels = {
    bear: t("model.nodes.scenarios.bear"),
    base: t("model.nodes.scenarios.base"),
    bull: t("model.nodes.scenarios.bull"),
  };
  const fcff = fcffSpec(nodes, locale, t("model.live.dcf.charts.fcffSeries"));
  const perShare = perShareSpec(
    nodes,
    locale,
    t("model.live.dcf.charts.perShareSeries"),
    scenarioLabels,
  );
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <Card padding="md" elevated className="min-w-0">
        <h3 className="text-navy mb-1 text-[0.9375rem] font-bold">
          {t("model.live.dcf.charts.fcff")}
        </h3>
        <AnswerChart spec={fcff} lang={locale} />
      </Card>
      <Card padding="md" elevated className="min-w-0">
        <h3 className="text-navy mb-1 text-[0.9375rem] font-bold">
          {t("model.live.dcf.charts.perShare")}
        </h3>
        <AnswerChart spec={perShare} lang={locale} />
      </Card>
    </div>
  );
}

export function DcfTab() {
  return (
    <div className="flex flex-col gap-5">
      <ModelSectionCard
        titleKey="model.live.dcf.wacc.title"
        captionKey="model.live.dcf.wacc.caption"
      >
        <WaccBuild />
      </ModelSectionCard>

      <ModelSectionCard
        titleKey="model.live.dcf.drivers.title"
        captionKey="model.live.dcf.drivers.caption"
      >
        <Legend />
        <RevenueGrid />
      </ModelSectionCard>

      <ModelSectionCard
        titleKey="model.live.dcf.statement.title"
        captionKey="model.live.dcf.statement.caption"
      >
        <StatementGrid />
      </ModelSectionCard>

      <ModelSectionCard
        titleKey="model.live.dcf.pv.title"
        captionKey="model.live.dcf.pv.caption"
      >
        <PvBridge />
      </ModelSectionCard>

      <Charts />
    </div>
  );
}
