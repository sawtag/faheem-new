"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { StageBadge } from "@/components/deals/stage-badge";
import type { Deal } from "@/lib/types";

const EASE = [0.4, 0, 0.2, 1] as const;

const STAGE_MSG_KEY: Record<Deal["stage"], string> = {
  screening: "screening",
  analysis: "analysis",
  "ic-review": "icReview",
  declined: "declined",
};

/**
 * Workspace stage banner, the human decision gate made visible. Screening
 * shows "Advance to Analyst Stage" (flips the stage badge with a 250ms morph +
 * writes an audit entry via the caller); analysis shows "Send to IC" (visual
 * only, morphs to a queued state). The badge is keyed on stage so the flip
 * animates through AnimatePresence.
 */
export function StageBanner({
  stage,
  declineReason,
  onAdvance,
}: {
  stage: Deal["stage"];
  declineReason?: string;
  onAdvance: () => void;
}) {
  const t = useTranslations("deals.gate");
  const [sentToIc, setSentToIc] = React.useState(false);

  return (
    <div
      data-testid="stage-banner"
      className="border-border bg-card rounded-card flex flex-wrap items-center gap-x-4 gap-y-3 border px-5 py-4"
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={stage}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.25, ease: EASE }}
          className="inline-flex"
        >
          <StageBadge stage={stage} />
        </motion.span>
      </AnimatePresence>

      <p className="text-text-secondary min-w-0 flex-1 text-sm">
        {stage === "declined" && declineReason
          ? declineReason
          : t(`message.${STAGE_MSG_KEY[stage]}`)}
      </p>

      {stage === "screening" ? (
        <Button size="sm" onClick={onAdvance}>
          {t("advance")}
        </Button>
      ) : stage === "analysis" ? (
        sentToIc ? (
          <motion.span
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.25, ease: EASE }}
            className="bg-accent-50 text-accent-700 rounded-btn inline-flex h-9 items-center gap-1.5 px-3.5 text-sm font-bold"
          >
            <Check className="size-4" aria-hidden="true" />
            {t("queued")}
          </motion.span>
        ) : (
          <Button size="sm" variant="outline" onClick={() => setSentToIc(true)}>
            {t("sendToIc")}
          </Button>
        )
      ) : null}
    </div>
  );
}
