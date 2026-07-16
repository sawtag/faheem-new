"use client";

import * as React from "react";
import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { DealCard } from "@/components/deals/deal-card";
import { STAGES, dealsByOrigin, dealsByStage } from "@/lib/deals";
import { cn } from "@/lib/utils";
import type { Deal } from "@/lib/types";

const EASE = [0.4, 0, 0.2, 1] as const;

const STAGE_KEY: Record<Deal["stage"], string> = {
  screening: "screening",
  analysis: "analysis",
  "ic-review": "icReview",
  declined: "declined",
};

/** Stage accents: header dot + the hairline rule under each column header. */
const STAGE_STYLE: Record<Deal["stage"], { dot: string; rule: string }> = {
  screening: { dot: "bg-navy-400", rule: "bg-navy-200" },
  analysis: { dot: "bg-accent", rule: "bg-accent-200" },
  "ic-review": { dot: "bg-navy", rule: "bg-navy-300" },
  declined: { dot: "bg-danger", rule: "bg-danger-50" },
};

/**
 * The pipeline board: origin filter pills (the private→public pivot) over a
 * four-column governed flow, Screening → Analysis → IC Review → Declined.
 * Columns never collapse (the flow IS the story); a filtered-out stage shows
 * a quiet dashed slot instead. Human-gate markers bridge the column gaps,
 * echoing the "human decides at every gate" narrative.
 */
export function PipelineBoard({ deals }: { deals: Deal[] }) {
  const t = useTranslations("deals");
  const [origin, setOrigin] = React.useState<"all" | Deal["origin"]>("all");

  const filters = [
    { value: "all", label: t("board.filterAll") },
    { value: "inbound", label: t("board.filterInbound") },
    { value: "market-screen", label: t("board.filterMarket") },
  ] as const;

  const visible = dealsByOrigin(deals, origin);
  const columns = STAGES.map((stage) => ({
    stage,
    deals: dealsByStage(stage, visible),
  }));

  // stagger index across the whole board (cap 8 per motion law)
  let revealIndex = 0;

  return (
    <>
      <div
        role="group"
        aria-label={t("board.filterLabel")}
        className="mb-8 flex flex-wrap gap-2"
      >
        {filters.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setOrigin(f.value)}
            aria-pressed={origin === f.value}
            className={cn(
              "rounded-pill focus-visible:ring-accent focus-visible:ring-offset-bg px-3.5 py-1.5 text-[0.8125rem] font-semibold transition-colors duration-[var(--duration-fast)] ease-[var(--ease)] outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
              origin === f.value
                ? "bg-accent-50 text-accent-700"
                : "border-border bg-card text-text-secondary hover:border-navy-300 hover:text-navy border",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        {columns.map(({ stage, deals: stageDeals }, col) => {
          const style = STAGE_STYLE[stage];
          const declined = stage === "declined";
          return (
            <section
              key={stage}
              aria-label={t(`stage.${STAGE_KEY[stage]}`)}
              className="relative flex flex-col"
            >
              <div className="flex h-6 items-center gap-2">
                <span
                  aria-hidden="true"
                  className={cn("rounded-pill size-2 shrink-0", style.dot)}
                />
                <h2
                  className={cn(
                    "truncate text-[0.8125rem] font-bold tracking-[0.04em] uppercase",
                    declined ? "text-text-secondary/70" : "text-text-secondary",
                  )}
                >
                  {t(`stage.${STAGE_KEY[stage]}`)}
                </h2>
                <Badge variant="neutral" size="sm" className="financial">
                  {stageDeals.length}
                </Badge>
              </div>

              {/* human-gate marker bridging this column to the next (xl only) */}
              {col < columns.length - 1 && (
                <span
                  data-testid="human-gate"
                  title={t("gate.humanGate")}
                  className="border-border bg-card text-navy-400 rounded-pill absolute -end-6 top-0 z-10 hidden size-6 place-items-center border shadow-[var(--shadow-card)] xl:grid"
                >
                  <ArrowRight
                    className="size-3 rtl:-scale-x-100"
                    aria-hidden="true"
                  />
                  <span className="sr-only">{t("gate.humanGate")}</span>
                </span>
              )}

              <div
                aria-hidden="true"
                className={cn("rounded-pill mt-3 h-0.5", style.rule)}
              />

              <div className="mt-4 flex flex-1 flex-col gap-4">
                {stageDeals.length === 0 ? (
                  <div className="border-border rounded-card grid min-h-28 flex-1 place-items-center border border-dashed p-6">
                    <p className="text-text-secondary/70 text-[0.8125rem]">
                      {t("board.emptyStage")}
                    </p>
                  </div>
                ) : (
                  stageDeals.map((deal) => {
                    const i = Math.min(revealIndex++, 8);
                    return (
                      <motion.div
                        key={`${origin}-${deal.id}`}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                          duration: 0.25,
                          ease: EASE,
                          delay: i * 0.035,
                        }}
                      >
                        <DealCard deal={deal} />
                      </motion.div>
                    );
                  })
                )}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
