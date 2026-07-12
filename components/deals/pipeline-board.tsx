"use client";

import * as React from "react";
import { motion } from "motion/react";
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

/**
 * The pipeline board: origin filter pills (the private→public pivot) over
 * stage-grouped sections of deal cards. Filtering hides cards; empty stage
 * sections collapse away entirely.
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
  const sections = STAGES.map((stage) => ({
    stage,
    deals: dealsByStage(stage, visible),
  })).filter((s) => s.deals.length > 0);

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

      {sections.length === 0 ? (
        <p className="text-text-secondary py-16 text-center text-[0.9375rem]">
          {t("board.empty")}
        </p>
      ) : (
        <div className="flex flex-col gap-10">
          {sections.map(({ stage, deals: stageDeals }) => (
            <section key={stage} aria-label={t(`stage.${STAGE_KEY[stage]}`)}>
              <div className="mb-4 flex items-center gap-2">
                <h2 className="text-text-secondary text-[0.8125rem] font-bold tracking-[0.04em] uppercase">
                  {t(`stage.${STAGE_KEY[stage]}`)}
                </h2>
                <Badge variant="neutral" size="sm" className="financial">
                  {stageDeals.length}
                </Badge>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {stageDeals.map((deal) => {
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
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
