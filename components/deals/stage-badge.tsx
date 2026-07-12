import { useTranslations } from "next-intl";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import type { Deal } from "@/lib/types";

/**
 * Pipeline-stage status badge — one visual mapping shared by the board cards
 * and the workspace stage banner so a stage always reads the same everywhere.
 */
const STAGE_VARIANT: Record<
  Deal["stage"],
  NonNullable<BadgeProps["variant"]>
> = {
  screening: "neutral",
  analysis: "mint",
  "ic-review": "navy",
  declined: "danger",
};

/** i18n key under `deals.stage.*` per stage (kebab id → camel key). */
const STAGE_KEY: Record<Deal["stage"], string> = {
  screening: "screening",
  analysis: "analysis",
  "ic-review": "icReview",
  declined: "declined",
};

export function StageBadge({
  stage,
  size = "md",
}: {
  stage: Deal["stage"];
  size?: BadgeProps["size"];
}) {
  const t = useTranslations("deals.stage");
  return (
    <Badge variant={STAGE_VARIANT[stage]} size={size}>
      {t(STAGE_KEY[stage])}
    </Badge>
  );
}
