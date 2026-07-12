"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { CircleSlash2, Globe, Inbox } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { LogoTile } from "@/components/ui/logo-tile";
import { StageBadge } from "@/components/deals/stage-badge";
import { cn } from "@/lib/utils";
import type { Deal, Lang } from "@/lib/types";

/**
 * One pipeline card. Real logos come from deals.json (`logo` path — Jahez's is
 * vendored); fictional companies fall back to the monogram tile (assets
 * policy). Declined deals render muted with the decline reason in place of the
 * status line.
 */
export function DealCard({ deal }: { deal: Deal }) {
  const t = useTranslations("deals.board");
  const locale = useLocale() as Lang;
  const declined = deal.stage === "declined";

  const originLabel =
    deal.originDetail?.[locale] ??
    (deal.origin === "inbound" ? t("originInbound") : t("originMarket"));
  const OriginIcon = deal.origin === "inbound" ? Inbox : Globe;

  return (
    <Card
      hover={!declined}
      elevated={!declined}
      padding="none"
      className={cn("group relative", declined && "bg-bg")}
      data-testid="deal-card"
      data-deal={deal.id}
    >
      <Link
        href={`/deals/${deal.id}`}
        className="focus-visible:ring-accent focus-visible:ring-offset-bg rounded-card block p-5 outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
      >
        <div className="flex items-start gap-3">
          {deal.logo ? (
            <span
              className={cn(
                "border-border bg-card rounded-btn grid size-10 shrink-0 place-items-center border p-1.5",
                declined && "opacity-60",
              )}
            >
              <Image
                src={deal.logo}
                alt=""
                width={28}
                height={28}
                unoptimized
                className="size-full object-contain"
              />
            </span>
          ) : (
            <LogoTile
              label={deal.name.en}
              initial={deal.name[locale].charAt(0)}
              size={40}
              className={cn(declined && "opacity-60")}
            />
          )}
          <div className="min-w-0 flex-1">
            <p
              className={cn(
                "truncate text-base font-bold",
                declined ? "text-text-secondary" : "text-navy",
              )}
            >
              {deal.name[locale]}
            </p>
            <p className="text-text-secondary truncate text-[0.8125rem]">
              {deal.sector[locale]}
            </p>
          </div>
          <StageBadge stage={deal.stage} size="sm" />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          <Badge
            variant={deal.origin === "inbound" ? "mvp" : "mint"}
            size="sm"
            className={cn(declined && "opacity-70")}
          >
            <OriginIcon className="size-3" aria-hidden="true" />
            {originLabel}
          </Badge>
          {deal.ask && (
            <span className="text-navy-700 financial text-[0.8125rem] font-semibold">
              {deal.ask[locale]}
            </span>
          )}
        </div>

        {declined && deal.declineReason ? (
          <p className="text-text-secondary/80 mt-3 flex items-start gap-1.5 text-[0.8125rem] leading-relaxed">
            <CircleSlash2
              className="text-danger-700/60 mt-0.5 size-3.5 shrink-0"
              aria-hidden="true"
            />
            {deal.declineReason[locale]}
          </p>
        ) : (
          <p className="text-text-secondary mt-3 line-clamp-2 text-[0.8125rem] leading-relaxed">
            {deal.statusLine[locale]}
          </p>
        )}
      </Link>
    </Card>
  );
}
