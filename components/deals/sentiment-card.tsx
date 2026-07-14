"use client";

import * as React from "react";
import { motion } from "motion/react";
import { Eye, Gauge, Info } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn, formatDate } from "@/lib/utils";
import { postsForEntry, sentimentByCompany } from "@/lib/sentiment";
import type { Lang, SentimentEntry, SocialPost } from "@/lib/types";

const EASE = [0.4, 0, 0.2, 1] as const;

const LABEL_BADGE: Record<SentimentEntry["label"], BadgeProps["variant"]> = {
  constructive: "mint",
  cautious: "warning",
  "negative-drift": "danger",
};

/** i18n key segments can't contain a literal "-" cleanly in every consumer, so
 * map the one hyphenated sourceType to a camelCase message key. */
const SOURCE_TYPE_KEY: Record<SocialPost["sourceType"], string> = {
  forum: "forum",
  social: "social",
  "news-headline": "newsHeadline",
};

/**
 * Market Sentiment card (live-model-provenance plan §0): a label + one-line
 * rationale, ALWAYS captioned "signal only — not a valuation input", with a
 * peek affordance into the illustrative social pack it draws its themes from.
 * Reads data/sentiment.json + data/social-pack.json directly (same pattern as
 * WorkspaceAnalytics reading model-inputs.json — no server-page plumbing).
 * Renders nothing if the company has no recorded sentiment read (jahez only,
 * today — the pack is Saudi q-commerce-specific, so extending it to other
 * workspaces without their own themed pack would not be honest).
 */
export function SentimentCard({
  companyId,
  compact = false,
}: {
  companyId: string;
  /** dashboard placement — smaller type, clamped rationale, same disclosure */
  compact?: boolean;
}) {
  const t = useTranslations("sentiment");
  const locale = useLocale() as Lang;
  const [open, setOpen] = React.useState(false);

  const entry = sentimentByCompany(companyId);
  if (!entry) return null;
  const posts = postsForEntry(entry);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: EASE }}
      >
        <Card
          padding={compact ? "sm" : "md"}
          elevated
          data-testid="sentiment-card"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="bg-accent-50 text-accent-700 rounded-btn grid size-8 shrink-0 place-items-center">
                <Gauge className="size-4" aria-hidden="true" />
              </span>
              <div>
                <h3 className="text-navy text-sm font-bold">{t("title")}</h3>
                {!compact && (
                  <p className="text-text-secondary text-xs">{t("caption")}</p>
                )}
              </div>
            </div>
            <Badge variant={LABEL_BADGE[entry.label]} size="sm">
              {t(`labels.${entry.label}`)}
            </Badge>
          </div>

          <p
            className={cn(
              "text-navy mt-3 leading-relaxed",
              compact ? "text-xs" : "text-[0.8125rem]",
            )}
          >
            {entry.rationale[locale]}
          </p>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-text-secondary flex items-center gap-1.5 text-[0.6875rem] font-semibold italic">
              <Info className="size-3.5 shrink-0" aria-hidden="true" />
              {t("signalOnly")}
            </p>
            <Button
              variant="outline"
              size="sm"
              startIcon={<Eye className="size-3.5" aria-hidden="true" />}
              onClick={() => setOpen(true)}
              className="h-8 px-3 text-xs"
            >
              {t("viewPack")}
            </Button>
          </div>
        </Card>
      </motion.div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[80vh] max-w-[560px] overflow-y-auto">
          <DialogTitle>{t("dialog.title")}</DialogTitle>
          <DialogDescription>{t("dialog.caption")}</DialogDescription>
          <ul className="mt-4 flex flex-col gap-3">
            {posts.map((post) => (
              <li
                key={post.id}
                className="border-border rounded-card border p-3"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <bdi
                    className="text-navy text-[0.8125rem] font-semibold"
                    dir="ltr"
                  >
                    {post.handle}
                  </bdi>
                  <Badge variant="neutral" size="sm">
                    {t(
                      `dialog.sourceTypes.${SOURCE_TYPE_KEY[post.sourceType]}`,
                    )}
                  </Badge>
                  <span className="text-text-secondary financial text-[0.6875rem]">
                    {formatDate(post.postedAt, locale)}
                  </span>
                </div>
                <p className="text-navy mt-2 text-[0.8125rem] leading-relaxed">
                  {post.text[locale]}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <Badge variant="mvp" size="sm">
                    {t(`dialog.tones.${post.tone}`)}
                  </Badge>
                  <Badge variant="warning" size="sm">
                    {t("dialog.illustrativeTag")}
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </>
  );
}
