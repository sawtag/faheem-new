"use client";

import * as React from "react";
import { Check, CircleAlert, FileText, Lock, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { Cite, Lang, Localized, ScreeningRow } from "@/lib/types";

const VERDICT: Record<
  ScreeningRow["verdict"],
  {
    variant: NonNullable<BadgeProps["variant"]>;
    icon: typeof Check;
    key: string;
  }
> = {
  pass: { variant: "mint", icon: Check, key: "pass" },
  warn: { variant: "warning", icon: CircleAlert, key: "warn" },
  fail: { variant: "danger", icon: X, key: "fail" },
};

/**
 * The Screening Agent's mandate-fit scorecard (spec §11) — criterion rows with
 * pass/warn/fail verdicts, each citing the Lunar IC Charter. Pure render from
 * deals.json rows; `onCite` receives the citation so the workspace can open
 * the PdfPanel at the cited page.
 */
export function ScreeningScorecard({
  rows,
  verdict,
  onCite,
}: {
  rows: ScreeningRow[];
  verdict: Localized;
  onCite: (cite: Cite) => void;
}) {
  const t = useTranslations("deals.scorecard");
  const locale = useLocale() as Lang;

  return (
    <Card padding="none" elevated data-testid="screening-scorecard">
      <div className="border-border border-b px-6 py-5">
        <h2 className="text-h3 text-navy font-extrabold">{t("title")}</h2>
        <p className="text-text-secondary mt-1 text-[0.8125rem]">
          {t("subtitle")}
        </p>
      </div>

      <ul>
        {rows.map((row) => {
          const v = VERDICT[row.verdict];
          const Icon = v.icon;
          return (
            <li
              key={row.criterion.en}
              data-testid="scorecard-row"
              className="border-border hover:bg-navy-50/50 flex items-start gap-4 border-b px-6 py-4 transition-colors duration-[var(--duration-fast)] ease-[var(--ease)]"
            >
              <Badge
                variant={v.variant}
                size="sm"
                className="mt-0.5 shrink-0"
                data-verdict={row.verdict}
              >
                <Icon className="size-3" aria-hidden="true" />
                {t(v.key)}
              </Badge>
              <div className="min-w-0 flex-1">
                <p className="text-navy text-sm font-semibold">
                  {row.criterion[locale]}
                </p>
                <p className="text-text-secondary mt-0.5 text-[0.8125rem] leading-relaxed">
                  {row.note[locale]}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onCite(row.cite)}
                aria-label={t("citeLabel", { page: row.cite.page })}
                className="bg-accent-50 text-accent-700 hover:bg-accent-100 focus-visible:ring-accent focus-visible:ring-offset-card rounded-pill financial mt-0.5 inline-flex shrink-0 items-center gap-1 px-2.5 py-1 text-xs font-semibold transition-colors duration-[var(--duration-fast)] ease-[var(--ease)] outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
              >
                <FileText className="size-3" aria-hidden="true" />
                {t("cite", { page: row.cite.page })}
              </button>
            </li>
          );
        })}
      </ul>

      <div className="px-6 py-5">
        <p className="text-navy text-sm leading-relaxed font-semibold">
          {verdict[locale]}
        </p>
        <p className="text-text-secondary mt-2 flex items-center gap-1.5 text-xs">
          <Lock className="size-3.5 shrink-0" aria-hidden="true" />
          {t("anonymized")}
        </p>
      </div>
    </Card>
  );
}
