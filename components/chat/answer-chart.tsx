"use client";

import * as React from "react";
import { motion, useReducedMotion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { Tooltip } from "@/components/ui/tooltip";
import {
  axisTicks,
  niceMax,
  type ChartSpec,
  type UnitFamily,
} from "@/lib/chart-data";
import type { Lang } from "@/lib/types";

const EASE = [0.4, 0, 0.2, 1] as const;
const VB_W = 560;
const VB_H = 244;
const PAD = { top: 20, right: 12, bottom: 38, left: 42 } as const;
const PLOT_W = VB_W - PAD.left - PAD.right;
const PLOT_H = VB_H - PAD.top - PAD.bottom;
/** navy for the first series, emerald for the second (two-series design law). */
const SERIES_FILL = ["var(--color-navy)", "var(--color-accent)"] as const;

function western(value: number, lang: Lang, maxFrac = 1): string {
  return new Intl.NumberFormat(lang === "ar" ? "ar-u-nu-latn" : "en-US", {
    maximumFractionDigits: maxFrac,
  }).format(value);
}

function tickLabel(value: number, unit: UnitFamily, lang: Lang): string {
  const n = western(value, lang, value >= 100 ? 0 : 1);
  return unit === "percent" ? `${n}%` : n;
}

/** Compact on-bar label: percent keeps its %, currency drops the SAR/m (axis carries the unit). */
function barLabel(value: number, unit: UnitFamily, lang: Lang): string {
  const n = western(value, lang, Math.abs(value) >= 100 ? 0 : 1);
  return unit === "percent" ? `${n}%` : n;
}

/**
 * Hand-rolled grouped/simple bar chart drawn from a `ChartSpec` (no chart
 * library). Bars grow in once (staggered, reduced-motion safe), hover reveals a
 * navy tooltip with the exact recorded cell value, and an optional dashed
 * reference line marks a hurdle/threshold. Colours + hairlines come from theme
 * tokens only.
 */
export function AnswerChart({ spec, lang }: { spec: ChartSpec; lang?: Lang }) {
  const t = useTranslations("chat.table");
  const activeLocale = useLocale();
  const locale = (lang ?? activeLocale) as Lang;
  const reduce = useReducedMotion();

  const values = spec.bars.map((b) => b.value);
  const rawMax = Math.max(0, ...values, spec.hurdle?.value ?? 0);
  const domainMax = niceMax(rawMax);
  const domainMin = Math.min(0, ...values);
  const range = domainMax - domainMin || 1;
  const yOf = (v: number) =>
    PAD.top + PLOT_H - ((v - domainMin) / range) * PLOT_H;
  const zeroY = yOf(0);

  const bandW = PLOT_W / spec.categories.length;
  const seriesN = spec.series.length;
  const groupW = bandW * 0.64;
  const barW = groupW / seriesN;
  const ticks = axisTicks(domainMax, 4);
  const unitLabel =
    spec.unit === "percent"
      ? t("axis.percent")
      : spec.unit === "currency"
        ? t("axis.sarM")
        : "";
  const showValues = spec.categories.length * seriesN <= 6;

  return (
    <figure className="mt-1">
      {seriesN >= 2 && (
        <figcaption className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 px-1">
          {spec.series.map((s, i) => (
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
        </figcaption>
      )}

      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        className="h-auto w-full"
        role="img"
        aria-label={t("chartAria", {
          series: spec.series.join(", "),
          categories: spec.categories.join(", "),
        })}
      >
        {unitLabel && (
          <text
            x={PAD.left}
            y={PAD.top - 8}
            textAnchor="end"
            className="financial"
            fill="var(--color-text-secondary)"
            fontSize={10.5}
          >
            {unitLabel}
          </text>
        )}

        {/* gridlines + y ticks */}
        {ticks.map((v) => {
          const y = yOf(v);
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
                fontSize={10.5}
              >
                {tickLabel(v, spec.unit, locale)}
              </text>
            </g>
          );
        })}

        {/* hurdle / threshold reference line */}
        {spec.hurdle && (
          <g>
            <line
              x1={PAD.left}
              x2={PAD.left + PLOT_W}
              y1={yOf(spec.hurdle.value)}
              y2={yOf(spec.hurdle.value)}
              stroke="var(--color-navy-300)"
              strokeWidth={1.5}
              strokeDasharray="5 4"
            />
            <text
              x={PAD.left + PLOT_W}
              y={yOf(spec.hurdle.value) - 4}
              textAnchor="end"
              className="financial"
              fill="var(--color-navy-600)"
              fontSize={10.5}
              fontWeight={600}
            >
              {t("hurdle", { value: western(spec.hurdle.value, locale) })}
            </text>
          </g>
        )}

        {/* bars */}
        {spec.categories.map((cat, ci) => {
          const bandStart = PAD.left + ci * bandW;
          const groupStart = bandStart + (bandW - groupW) / 2;
          return (
            <g key={cat}>
              {spec.series.map((s, si) => {
                const bar = spec.bars.find(
                  (b) => b.category === cat && b.series === s,
                );
                if (!bar) return null;
                const x = groupStart + si * barW;
                const top = yOf(bar.value);
                const h = Math.abs(top - zeroY);
                const y = Math.min(top, zeroY);
                const w = barW * 0.82;
                const cx = x + w / 2;
                const fill = bar.negative
                  ? "var(--color-danger)"
                  : SERIES_FILL[si % SERIES_FILL.length];
                const delay = Math.min(ci * seriesN + si, 8) * 0.045;
                return (
                  <React.Fragment key={s}>
                    <Tooltip
                      content={`${cat} · ${s}: ${bar.display}`}
                      side="top"
                    >
                      <motion.rect
                        x={x}
                        width={w}
                        rx={2}
                        fill={fill}
                        initial={reduce ? false : { height: 0, y: zeroY }}
                        animate={{ height: h, y }}
                        transition={{ duration: 0.35, ease: EASE, delay }}
                        style={{ cursor: "default" }}
                      />
                    </Tooltip>
                    {showValues && (
                      <text
                        x={cx}
                        y={
                          (bar.value >= 0 ? y : y + h) -
                          (bar.value >= 0 ? 5 : -12)
                        }
                        textAnchor="middle"
                        className="financial"
                        fill="var(--color-text-secondary)"
                        fontSize={10}
                        fontWeight={600}
                      >
                        {barLabel(bar.value, spec.unit, locale)}
                      </text>
                    )}
                  </React.Fragment>
                );
              })}
              <text
                x={bandStart + bandW / 2}
                y={PAD.top + PLOT_H + 16}
                textAnchor="middle"
                fill="var(--color-text-secondary)"
                fontSize={11}
                fontWeight={500}
              >
                {cat.length > 18 ? `${cat.slice(0, 17)}…` : cat}
              </text>
            </g>
          );
        })}
      </svg>
    </figure>
  );
}
