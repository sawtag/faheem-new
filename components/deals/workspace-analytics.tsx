"use client";

import * as React from "react";
import { animate, motion, useReducedMotion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import {
  axisTicks,
  buildJahezAnalytics,
  niceMax,
  type GroupedBarData,
  type LineData,
} from "@/lib/chart-data";
import modelInputs from "@/data/model-inputs.json";
import manifest from "@/data/corpus/manifest.json";
import type { CorpusDoc, Lang, ModelInput } from "@/lib/types";

const EASE = [0.4, 0, 0.2, 1] as const;
const INPUTS = modelInputs as ModelInput[];
const DOC_TITLES = new Map(
  (manifest as CorpusDoc[]).map((d) => [d.id, d.title]),
);
const SERIES_FILL = ["var(--color-navy)", "var(--color-accent)"] as const;

const VB = { w: 400, h: 216 } as const;
const PAD = { top: 16, right: 12, bottom: 34, left: 42 } as const;
const PLOT_W = VB.w - PAD.left - PAD.right;
const PLOT_H = VB.h - PAD.top - PAD.bottom;

function western(value: number, lang: Lang, maxFrac = 1): string {
  return new Intl.NumberFormat(lang === "ar" ? "ar-u-nu-latn" : "en-US", {
    maximumFractionDigits: maxFrac,
  }).format(value);
}
function docTitle(id: string | undefined, lang: Lang): string {
  return (id && DOC_TITLES.get(id)?.[lang]) || (id ?? "");
}

/** 0→1 progress over `duration`s once, on first reveal (count-up + draw-in). */
function useProgress(reduce: boolean | null, duration = 0.4): number {
  const [p, setP] = React.useState(reduce ? 1 : 0);
  React.useEffect(() => {
    if (reduce) return;
    const controls = animate(0, 1, { duration, ease: EASE, onUpdate: setP });
    return () => controls.stop();
  }, [reduce, duration]);
  return p;
}

/**
 * Jahez overview analytics (jahez only): one card, two panels reading straight
 * from model-inputs.json — ① GMV vs Net revenue grouped bars FY2023–FY2025,
 * ② gross + Adj. EBITDA margin trend FY2024→FY2025. Every value carries its
 * source in the panel footer; nothing is derived (AGENTS.md rule 5). Count-up /
 * draw-in on first reveal per the motion law.
 */
export function WorkspaceAnalytics() {
  const t = useTranslations("deals.analytics");
  const locale = useLocale() as Lang;
  const data = React.useMemo(() => buildJahezAnalytics(INPUTS), []);

  return (
    <motion.section
      aria-label={t("title")}
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: EASE }}
    >
      <Card padding="md" elevated>
        <h2 className="text-text-secondary mb-4 text-[0.8125rem] font-bold tracking-[0.04em] uppercase">
          {t("title")}
        </h2>
        <div className="grid grid-cols-1 gap-x-8 gap-y-6 lg:grid-cols-2">
          <Panel
            title={t("growthTitle")}
            series={data.growth.series.map((s) => t(`series.${s.key}`))}
            footnote={t("growthSource", {
              doc: docTitle(data.growth.source.docId, locale),
              page: data.growth.source.page,
              fy23doc: docTitle(data.growth.source.fallbackDocId, locale),
            })}
          >
            <GrowthBars data={data.growth} lang={locale} />
          </Panel>
          <Panel
            title={t("marginTitle")}
            series={data.margins.series.map((s) => t(`series.${s.key}`))}
            footnote={t("marginSource", {
              doc: docTitle(data.margins.source.docId, locale),
              page: data.margins.source.page,
            })}
          >
            <MarginLine data={data.margins} lang={locale} />
          </Panel>
        </div>
      </Card>
    </motion.section>
  );
}

function Panel({
  title,
  series,
  footnote,
  children,
}: {
  title: string;
  series: string[];
  footnote: string;
  children: React.ReactNode;
}) {
  return (
    <section className="min-w-0">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="text-navy text-sm font-bold">{title}</h3>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {series.map((s, i) => (
            <span
              key={s}
              className="text-text-secondary flex items-center gap-1.5 text-xs font-medium"
            >
              <span
                aria-hidden="true"
                className="inline-block size-2.5 rounded-[2px]"
                style={{ backgroundColor: SERIES_FILL[i % SERIES_FILL.length] }}
              />
              {s}
            </span>
          ))}
        </div>
      </div>
      {children}
      <p className="text-text-secondary mt-2 text-xs">{footnote}</p>
    </section>
  );
}

function AxisGrid({
  max,
  unit,
  lang,
}: {
  max: number;
  unit: "currency" | "percent";
  lang: Lang;
}) {
  return (
    <>
      {axisTicks(max, 4).map((v) => {
        const top = niceMax(max);
        const y = PAD.top + PLOT_H - (v / top) * PLOT_H;
        return (
          <g key={v}>
            <line
              x1={PAD.left}
              x2={PAD.left + PLOT_W}
              y1={y}
              y2={y}
              stroke="var(--color-border)"
              strokeWidth={1}
            />
            <text
              x={PAD.left - 6}
              y={y + 3.5}
              textAnchor="end"
              className="financial"
              fill="var(--color-text-secondary)"
              fontSize={10}
            >
              {unit === "percent"
                ? `${western(v, lang, 0)}%`
                : western(v, lang, 0)}
            </text>
          </g>
        );
      })}
    </>
  );
}

function GrowthBars({ data, lang }: { data: GroupedBarData; lang: Lang }) {
  const reduce = useReducedMotion();
  const p = useProgress(reduce);
  const all = data.series.flatMap((s) =>
    s.values.filter((v): v is number => v !== null),
  );
  const top = niceMax(Math.max(...all));
  const baseline = PAD.top + PLOT_H;
  const yOf = (v: number) => PAD.top + PLOT_H - (v / top) * PLOT_H;

  const bandW = PLOT_W / data.periods.length;
  const seriesN = data.series.length;
  const groupW = bandW * 0.6;
  const barW = groupW / seriesN;

  return (
    <svg
      viewBox={`0 0 ${VB.w} ${VB.h}`}
      className="h-auto w-full"
      role="img"
      aria-label={data.series.map((s) => s.key).join(", ")}
    >
      <text
        x={PAD.left}
        y={PAD.top - 6}
        textAnchor="end"
        className="financial"
        fill="var(--color-text-secondary)"
        fontSize={10}
      >
        SAR m
      </text>
      <AxisGrid max={top} unit="currency" lang={lang} />
      {data.periods.map((period, pi) => {
        const bandStart = PAD.left + pi * bandW;
        const groupStart = bandStart + (bandW - groupW) / 2;
        return (
          <g key={period}>
            {data.series.map((s, si) => {
              const raw = s.values[pi];
              if (raw === null || raw === undefined) return null;
              const shown = raw * p;
              const x = groupStart + si * barW;
              const w = barW * 0.84;
              const yFull = yOf(raw);
              const h = (baseline - yFull) * p;
              const y = baseline - h;
              return (
                <g key={s.key}>
                  <rect
                    x={x}
                    y={y}
                    width={w}
                    height={Math.max(0, h)}
                    rx={2}
                    fill={SERIES_FILL[si % SERIES_FILL.length]}
                  />
                  <text
                    x={x + w / 2}
                    y={y - 4}
                    textAnchor="middle"
                    className="financial"
                    fill="var(--color-text-secondary)"
                    fontSize={9.5}
                    fontWeight={600}
                  >
                    {western(shown, lang, 0)}
                  </text>
                </g>
              );
            })}
            <text
              x={bandStart + bandW / 2}
              y={baseline + 16}
              textAnchor="middle"
              fill="var(--color-text-secondary)"
              fontSize={11}
              fontWeight={500}
            >
              {period}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function MarginLine({ data, lang }: { data: LineData; lang: Lang }) {
  const reduce = useReducedMotion();
  const p = useProgress(reduce);
  const all = data.series.flatMap((s) => s.values);
  const top = niceMax(Math.max(...all));
  const n = data.periods.length;
  const xOf = (i: number) => PAD.left + (PLOT_W * (i + 0.5)) / n;
  const yOf = (v: number) => PAD.top + PLOT_H - (v / top) * PLOT_H;

  return (
    <svg
      viewBox={`0 0 ${VB.w} ${VB.h}`}
      className="h-auto w-full"
      role="img"
      aria-label={data.series.map((s) => s.key).join(", ")}
    >
      <text
        x={PAD.left}
        y={PAD.top - 6}
        textAnchor="end"
        className="financial"
        fill="var(--color-text-secondary)"
        fontSize={10}
      >
        %
      </text>
      <AxisGrid max={top} unit="percent" lang={lang} />
      {data.series.map((s, si) => {
        const color = SERIES_FILL[si % SERIES_FILL.length];
        const pts = s.values.map((v, i) => [xOf(i), yOf(v)] as const);
        const line = pts.map(([x, y]) => `${x},${y}`).join(" ");
        return (
          <g key={s.key}>
            <motion.polyline
              points={line}
              fill="none"
              stroke={color}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={reduce ? false : { pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.4, ease: EASE }}
            />
            {pts.map(([x, y], i) => (
              <g key={i}>
                <circle
                  cx={x}
                  cy={y}
                  r={3.5}
                  fill="var(--color-card)"
                  stroke={color}
                  strokeWidth={2}
                />
                <text
                  x={x}
                  y={y - 9}
                  textAnchor="middle"
                  className="financial"
                  fill="var(--color-text-secondary)"
                  fontSize={10}
                  fontWeight={600}
                >
                  {`${western(s.values[i]! * p, lang, 1)}%`}
                </text>
              </g>
            ))}
          </g>
        );
      })}
      {data.periods.map((period, i) => (
        <text
          key={period}
          x={xOf(i)}
          y={PAD.top + PLOT_H + 16}
          textAnchor="middle"
          fill="var(--color-text-secondary)"
          fontSize={11}
          fontWeight={500}
        >
          {period}
        </text>
      ))}
    </svg>
  );
}
