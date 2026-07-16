"use client";

import * as React from "react";
import Link from "next/link";
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowUpRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn, formatPercent } from "@/lib/utils";
import { BASE_ASSUMPTIONS, buildModel } from "@/lib/model/compute";
import type { Lang } from "@/lib/types";

const EASE = [0.4, 0, 0.2, 1] as const;

/**
 * Scenario strip under the workbook generation card (the "Run the DCF"
 * beat): bear / base / bull per-share values and IRRs plus the
 * probability-weighted value, recomputed in-browser from the SAME
 * lib/model engine the xlsx builder runs, so the strip can never drift
 * from the workbook it sits next to. Numbers count up on first reveal
 * (400ms, tabular-nums, motion language §numbers).
 */
export function ScenarioSummary() {
  const t = useTranslations("generate.scenarios");
  const locale = useLocale() as Lang;
  const reduce = useReducedMotion();

  const { result } = React.useMemo(() => buildModel(BASE_ASSUMPTIONS), []);
  const probs = {
    bear: BASE_ASSUMPTIONS.probBear,
    base: BASE_ASSUMPTIONS.probBase,
    bull: BASE_ASSUMPTIONS.probBull,
  };
  const weightedUpside = result.weightedPerShare / result.price - 1;

  const tiles = [
    { key: "bear" as const, scenario: result.bear },
    { key: "base" as const, scenario: result.base },
    { key: "bull" as const, scenario: result.bull },
  ];

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-navy text-sm font-bold">{t("title")}</h3>
        <Link
          href="/deals/jahez/model"
          className="text-accent-700 hover:text-accent-800 focus-visible:ring-accent rounded-btn inline-flex items-center gap-1 text-xs font-semibold underline-offset-2 outline-none hover:underline focus-visible:ring-2"
        >
          {t("openModel")}
          <ArrowUpRight
            className="size-3.5 rtl:-scale-x-100"
            aria-hidden="true"
          />
        </Link>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {tiles.map(({ key, scenario }, i) => (
          <motion.div
            key={key}
            initial={reduce ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease: EASE, delay: i * 0.035 }}
            className={cn(
              "rounded-btn border p-3",
              key === "base"
                ? "border-accent-300 bg-accent-50/40"
                : "border-border bg-bg",
            )}
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-navy text-xs font-bold">{t(key)}</span>
              <span className="text-text-secondary financial text-[0.6875rem]">
                {t("prob", {
                  p: formatPercent(probs[key] * 100, locale, { decimals: 0 }),
                })}
              </span>
            </div>
            <p className="text-navy financial mt-1.5 text-xl font-extrabold">
              <CountUpDecimal value={scenario.perShare} />
            </p>
            <p className="text-text-secondary financial mt-0.5 text-xs">
              {t("irrUpside", {
                irr: formatPercent(scenario.irr * 100, locale, { decimals: 1 }),
                upside: formatPercent(scenario.upside * 100, locale, {
                  decimals: 1,
                  signed: true,
                }),
              })}
            </p>
          </motion.div>
        ))}
      </div>

      <div className="border-border mt-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t pt-3">
        <p className="text-navy financial text-sm font-bold">
          {t("weighted", {
            value: `SAR ${result.weightedPerShare.toFixed(2)}`,
          })}
          <span className="text-text-secondary ms-2 text-xs font-medium">
            {t("vsClose", {
              close: `SAR ${result.price.toFixed(2)}`,
              upside: formatPercent(weightedUpside * 100, locale, {
                decimals: 1,
                signed: true,
              }),
            })}
          </span>
        </p>
        <p className="text-text-secondary financial text-xs">
          {t("waccG", {
            wacc: formatPercent(result.wacc * 100, locale, { decimals: 1 }),
            g: formatPercent(result.base.g * 100, locale, { decimals: 1 }),
          })}
        </p>
      </div>
      <p className="text-text-secondary mt-2 text-xs">
        {t("horizonNote")} {t("engineNote")}
      </p>
    </Card>
  );
}

/** SAR per-share figure counting up to two decimals over 400ms on first reveal.
 *  Western digits in both languages (AGENTS.md rule 2 for financial figures). */
function CountUpDecimal({ value }: { value: number }) {
  const reduce = useReducedMotion();
  const mv = useMotionValue(reduce ? value : 0);
  const text = useTransform(mv, (v) =>
    new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(v),
  );

  React.useEffect(() => {
    if (reduce) {
      mv.set(value);
      return;
    }
    const controls = animate(mv, value, { duration: 0.4, ease: EASE });
    return () => controls.stop();
  }, [value, reduce, mv]);

  return (
    <span>
      SAR <motion.span>{text}</motion.span>
    </span>
  );
}
