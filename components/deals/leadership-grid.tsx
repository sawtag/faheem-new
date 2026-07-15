"use client";

import * as React from "react";
import { motion } from "motion/react";
import { BookOpen } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Avatar } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import type { Leader } from "@/lib/deals";
import type { Lang } from "@/lib/types";

const EASE = [0.4, 0, 0.2, 1] as const;

function LeaderCard({
  leader,
  index,
  onSource,
}: {
  leader: Leader;
  index: number;
  onSource: (packPage: number) => void;
}) {
  const t = useTranslations("deals.leadership");
  const locale = useLocale() as Lang;

  return (
    <motion.li
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.25,
        ease: EASE,
        delay: Math.min(index, 8) * 0.035,
      }}
      className="min-w-0"
    >
      <Card
        hover
        elevated
        padding="sm"
        data-testid="bio-card"
        className="h-full"
      >
        <div className="flex items-start gap-3">
          <Avatar name={leader.name} size="lg" square />
          <div className="min-w-0 flex-1">
            <p className="text-navy text-sm leading-snug font-bold">
              {leader.name}
            </p>
            <p className="text-text-secondary mt-0.5 text-xs font-medium">
              {leader.role[locale]}
            </p>
          </div>
        </div>
        <p className="text-text-secondary mt-3 text-[0.8125rem] leading-relaxed">
          {locale === "ar" && leader.oneLiner.ar
            ? leader.oneLiner.ar
            : leader.oneLiner.en}
        </p>
        <button
          type="button"
          onClick={() => onSource(leader.packPage)}
          aria-label={t("sourceLabel", { name: leader.name })}
          className="text-accent-700 hover:text-accent-800 focus-visible:ring-accent focus-visible:ring-offset-card rounded-btn mt-3 inline-flex items-center gap-1.5 text-xs font-semibold underline-offset-2 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-offset-2"
        >
          <BookOpen className="size-3.5 shrink-0" aria-hidden="true" />
          <bdi dir="ltr">{leader.source}</bdi>
        </button>
      </Card>
    </motion.li>
  );
}

/**
 * Jahez leadership tab, board + executive bio grid from data/leadership.json
 * (initials tiles, no photos, assets policy). The source link opens the
 * leadership pack in the PdfPanel at that bio's page.
 */
export function LeadershipGrid({
  leaders,
  onSource,
}: {
  leaders: Leader[];
  onSource: (packPage: number) => void;
}) {
  const t = useTranslations("deals.leadership");
  const groups = [
    { key: "board", members: leaders.filter((l) => l.group === "board") },
    {
      key: "executive",
      members: leaders.filter((l) => l.group === "executive"),
    },
  ] as const;

  return (
    <div className="flex flex-col gap-8">
      {groups.map(
        (group) =>
          group.members.length > 0 && (
            <section key={group.key} aria-label={t(group.key)}>
              <h2 className="text-text-secondary mb-3 text-[0.8125rem] font-bold tracking-[0.04em] uppercase">
                {t(group.key)}
              </h2>
              <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {group.members.map((leader, i) => (
                  <LeaderCard
                    key={leader.name}
                    leader={leader}
                    index={i}
                    onSource={onSource}
                  />
                ))}
              </ul>
            </section>
          ),
      )}
    </div>
  );
}
