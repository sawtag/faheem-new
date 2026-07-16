"use client";

import * as React from "react";
import { Popover } from "radix-ui";
import { Info } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import manifest from "@/data/corpus/manifest.json";
import { Badge } from "@/components/ui/badge";
import { Formula } from "@/components/model/formula";
import { riskBand, type RiskBand } from "@/components/ic/metrics";
import { FORMULAS } from "@/lib/model/formulas";
import { hasRiskRegister, riskRegister } from "@/lib/model/risk-register";
import { cn, westernNumber } from "@/lib/utils";
import type { CorpusDoc, Lang } from "@/lib/types";

const DOC_TITLES = new Map(
  (manifest as CorpusDoc[]).map((d) => [d.id, d.title]),
);

/** Lunar's firm-level risk-appetite statement, the framing citation shared by
 * both variants (the doc states the appetite on p.1; it does NOT define the
 * P×I matrix or the 0-10 scale, so it never sources the number or formula). */
const APPETITE_CITE = { docId: "lunar-risk-appetite", page: 1 } as const;

const BAND_VARIANT: Record<RiskBand, "mint" | "warning" | "danger"> = {
  low: "mint",
  moderate: "warning",
  high: "danger",
};

/** The six register products (P×I), which ARE `BASE_ASSUMPTIONS.riskWeights`. */
const products = riskRegister.map((r) => r.probability * r.impact);
const worst = Math.max(...products);
const average = products.reduce((a, b) => a + b, 0) / products.length;

/**
 * Click-to-explain for a risk score. Wraps a score element in a Radix popover
 * that leads with Lunar's qualitative band, then supports it with the derivation:
 *   - computed variant (deal has the quantified register, e.g. Jahez): the six
 *     probability × impact rows, worst/average, the peak-weighted composite
 *     formula, the resulting score, an assumptions note, a firm-specific caveat,
 *     and the analysis-doc source of the number.
 *   - sourced variant (no register): the scale note plus the analysis-doc source.
 * Every figure comes from real data (riskRegister / deals.json score / manifest);
 * nothing is invented. Framed as Lunar's own applied judgment, not a market standard.
 */
export function RiskBreakdown({
  score,
  companyId,
  cite,
  children,
  align = "start",
  triggerClassName,
}: {
  /** the deals.json risk score to display as the composite result */
  score: number;
  /** decides computed vs sourced (does this company have a scored register?) */
  companyId: string;
  /** the analysis-doc citation that states the number (icMetrics.cite) */
  cite: { docId: string; page: number };
  /** the score element that becomes the popover trigger */
  children: React.ReactNode;
  align?: "start" | "center" | "end";
  triggerClassName?: string;
}) {
  const t = useTranslations("deals.riskBreakdown");
  const locale = useLocale() as Lang;
  const band = riskBand(score);
  const computed = hasRiskRegister(companyId);

  const scoreStr = westernNumber(score, locale, 1);
  const docTitle = (id: string) => DOC_TITLES.get(id)?.[locale] ?? id;

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          data-testid="risk-breakdown-trigger"
          aria-label={t("triggerAria", { score: scoreStr })}
          className={cn(
            "group/risk rounded-btn focus-visible:ring-accent focus-visible:ring-offset-card relative z-10 inline-flex cursor-pointer items-center gap-1 text-start outline-none focus-visible:ring-2 focus-visible:ring-offset-1",
            triggerClassName,
          )}
        >
          {children}
          <Info
            className="text-text-secondary/60 group-hover/risk:text-accent-700 size-3 shrink-0 transition-colors duration-[var(--duration-fast)] ease-[var(--ease)]"
            aria-hidden="true"
          />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align={align}
          sideOffset={8}
          collisionPadding={12}
          data-testid="risk-breakdown-content"
          className="faheem-pop rounded-card border-border bg-card shadow-modal z-50 flex w-[21rem] max-w-[calc(100vw-2rem)] flex-col gap-3 border p-4"
        >
          {/* lead: qualitative band, then the supporting number */}
          <header className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <Badge variant={BAND_VARIANT[band]} size="md">
                {t(`bands.${band}`)}
              </Badge>
              <span
                dir="ltr"
                data-testid="risk-composite-result"
                className="financial text-navy text-lg font-extrabold tabular-nums"
              >
                {t("outOf", { score: scoreStr })}
              </span>
            </div>
            <p className="text-navy text-sm font-bold">
              {computed ? t("computedTitle") : t("sourcedTitle")}
            </p>
          </header>

          {!computed && (
            <p className="text-text-secondary text-xs leading-relaxed">
              {t("scaleNote")}
            </p>
          )}

          {computed && (
            <div className="flex flex-col gap-3">
              <table
                data-testid="risk-register"
                className="w-full border-collapse"
              >
                <thead>
                  <tr className="border-border border-b">
                    <th className="text-text-secondary pb-1.5 text-start text-[0.625rem] font-semibold tracking-[0.04em] uppercase">
                      {t("registerHeader.risk")}
                    </th>
                    {(["p", "i", "weight"] as const).map((c) => (
                      <th
                        key={c}
                        className="text-text-secondary financial ps-2 pb-1.5 text-end text-[0.625rem] font-semibold tracking-[0.04em] uppercase"
                      >
                        {t(`registerHeader.${c}`)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {riskRegister.map((r) => (
                    <tr
                      key={r.id}
                      data-testid="risk-register-row"
                      className="border-border/60 border-b last:border-0"
                    >
                      <th
                        scope="row"
                        className="text-navy py-1.5 pe-2 text-start text-xs font-medium"
                      >
                        {t(`rows.${r.id}`)}
                      </th>
                      <td className="text-text-secondary financial py-1.5 ps-2 text-end text-xs tabular-nums">
                        {westernNumber(r.probability, locale)}
                      </td>
                      <td className="text-text-secondary financial py-1.5 ps-2 text-end text-xs tabular-nums">
                        {westernNumber(r.impact, locale)}
                      </td>
                      <td className="text-navy financial py-1.5 ps-2 text-end text-xs font-bold tabular-nums">
                        {westernNumber(r.probability * r.impact, locale)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="text-text-secondary financial flex items-center gap-4 text-xs tabular-nums">
                <span>
                  {t("worst")}{" "}
                  <span className="text-navy font-bold">
                    {westernNumber(worst, locale)}
                  </span>
                </span>
                <span>
                  {t("average")}{" "}
                  <span className="text-navy font-bold">
                    {westernNumber(average, locale, 1)}
                  </span>
                </span>
              </div>

              <div>
                <p className="text-text-secondary mb-1 text-[0.625rem] font-semibold tracking-[0.04em] uppercase">
                  {t("formulaLabel")}
                </p>
                <Formula tex={FORMULAS["risk-composite"]!.katex} />
                <p
                  dir="ltr"
                  className="financial text-navy mt-1 text-sm font-bold tabular-nums"
                >
                  {t("result", { score: scoreStr })}
                </p>
              </div>

              <p className="text-text-secondary text-xs leading-relaxed">
                {t("assumptionsNote")}
              </p>
              <p className="text-text-secondary text-xs leading-relaxed italic">
                {t("firmSpecificNote")}
              </p>
            </div>
          )}

          {/* firm-relative framing, sourced to Lunar's risk-appetite statement */}
          <p className="border-border text-text-secondary border-t pt-2.5 text-[0.6875rem] leading-relaxed">
            {t("framing", {
              doc: docTitle(APPETITE_CITE.docId),
              page: westernNumber(APPETITE_CITE.page, locale),
            })}
          </p>
          {/* source of the number itself: the deal's analysis doc */}
          <p className="text-text-secondary/80 financial text-[0.6875rem] tabular-nums">
            {t("numberSource", {
              doc: docTitle(cite.docId),
              page: westernNumber(cite.page, locale),
            })}
          </p>

          <Popover.Arrow className="fill-card" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
