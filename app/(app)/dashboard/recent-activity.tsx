"use client";

import Link from "next/link";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import {
  ArrowRight,
  Bot,
  CheckCheck,
  FileOutput,
  Mail,
  MessageSquareText,
  SlidersHorizontal,
  Trash2,
  Wrench,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { LogoTile } from "@/components/ui/logo-tile";
import { StageBadge } from "@/components/deals/stage-badge";
import type { AuditEntry, Deal, Lang, Localized } from "@/lib/types";

const ACTION_ICON = {
  question: MessageSquareText,
  artifact: FileOutput,
  "stage-advance": CheckCheck,
  "model-edit": SlidersHorizontal,
  "ic-draft": Mail,
  "agent-created": Bot,
  "agent-deleted": Trash2,
  "skill-created": Wrench,
  "skill-deleted": Trash2,
} as const;

/** "Jul 12, 09:41", Western digits both locales (mirrors the audit trail). */
function formatActivityTime(iso: string, lang: Lang): string {
  return new Intl.DateTimeFormat(lang === "ar" ? "ar-u-nu-latn" : "en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

export interface RecentDeal {
  id: string;
  name: Localized;
  sector: Localized;
  stage: Deal["stage"];
  statusLine: Localized;
  logo?: string;
}

function SectionHeader({
  title,
  linkHref,
  linkLabel,
}: {
  title: string;
  linkHref: string;
  linkLabel: string;
}) {
  return (
    <div className="border-border flex items-center justify-between border-b px-4 py-3">
      <h3 className="text-navy text-sm font-bold">{title}</h3>
      <Link
        href={linkHref}
        className="text-accent-700 hover:text-accent-800 focus-visible:ring-accent focus-visible:ring-offset-card rounded-btn inline-flex items-center gap-1 text-xs font-semibold outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
      >
        {linkLabel}
        <ArrowRight className="size-3 rtl:-scale-x-100" aria-hidden="true" />
      </Link>
    </div>
  );
}

function RecentAnalyses({ deals }: { deals: RecentDeal[] }) {
  const t = useTranslations("dashboard.recent");
  const locale = useLocale() as Lang;

  return (
    <Card padding="none" elevated className="flex flex-col overflow-hidden">
      <SectionHeader
        title={t("title")}
        linkHref="/deals"
        linkLabel={t("viewAll")}
      />
      <ul>
        {deals.map((deal) => (
          <li key={deal.id}>
            <Link
              href={`/deals/${deal.id}`}
              className="border-border hover:bg-navy-50 focus-visible:ring-accent flex items-center gap-3 border-b px-4 py-3 transition-colors duration-[var(--duration-fast)] ease-[var(--ease)] outline-none last:border-b-0 focus-visible:ring-2 focus-visible:ring-inset"
            >
              {deal.logo ? (
                <span className="border-border bg-card rounded-btn grid size-10 shrink-0 place-items-center border p-1.5">
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
                />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-navy truncate text-sm font-semibold">
                    {deal.name[locale]}
                  </span>
                  <StageBadge stage={deal.stage} size="sm" />
                </div>
                <p className="text-text-secondary truncate text-xs">
                  {deal.sector[locale]}
                </p>
                <p className="text-text-secondary/90 mt-0.5 line-clamp-1 text-xs">
                  {deal.statusLine[locale]}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function ContextChip({
  context,
  workspaceNames,
  firmLabel,
  locale,
}: {
  context: string;
  workspaceNames: Record<string, Localized>;
  firmLabel: string;
  locale: Lang;
}) {
  const label = context.startsWith("workspace:")
    ? (workspaceNames[context.slice("workspace:".length)]?.[locale] ??
      firmLabel)
    : firmLabel;
  return (
    <span className="bg-navy-50 rounded-pill inline-flex max-w-full items-center gap-1 px-2 py-0.5">
      <LogoTile label={label} size={16} />
      <span className="text-navy-700 truncate text-[0.6875rem] font-medium">
        {label}
      </span>
    </span>
  );
}

function ActivityFeed({
  activity,
  workspaceNames,
}: {
  activity: AuditEntry[];
  workspaceNames: Record<string, Localized>;
}) {
  const t = useTranslations("dashboard.activity");
  const tAudit = useTranslations("audit");
  const locale = useLocale() as Lang;

  const actionLabels: Record<AuditEntry["action"], string> = {
    question: tAudit("actionQuestion"),
    artifact: tAudit("actionArtifact"),
    "stage-advance": tAudit("actionScreening"),
    "model-edit": tAudit("actionModelEdit"),
    "ic-draft": tAudit("actionIcDraft"),
    "agent-created": tAudit("actionAgentCreated"),
    "agent-deleted": tAudit("actionAgentDeleted"),
    "skill-created": tAudit("actionSkillCreated"),
    "skill-deleted": tAudit("actionSkillDeleted"),
  };

  return (
    <Card padding="none" elevated className="flex flex-col overflow-hidden">
      <SectionHeader
        title={t("title")}
        linkHref="/audit"
        linkLabel={t("viewAll")}
      />
      <ul>
        {activity.map((entry) => {
          const ActionIcon = ACTION_ICON[entry.action];
          const detail = entry.question ?? entry.artifact;
          return (
            <li
              key={entry.ts + entry.action}
              className="border-border flex items-start gap-3 border-b px-4 py-3 last:border-b-0"
            >
              <ActionIcon
                className="text-navy mt-0.5 size-4 shrink-0"
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <p className="text-[0.8125rem]">
                  <span className="text-navy font-medium">
                    {actionLabels[entry.action]}
                  </span>
                  {detail && (
                    <span className="text-text-secondary line-clamp-1">
                      {detail}
                    </span>
                  )}
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <ContextChip
                    context={entry.context}
                    workspaceNames={workspaceNames}
                    firmLabel={tAudit("contextFirm")}
                    locale={locale}
                  />
                  <span className="text-text-secondary financial text-[0.6875rem]">
                    {formatActivityTime(entry.ts, locale)}
                  </span>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

/**
 * Dashboard bottom row: recent analyses (the live deals, each → its workspace)
 * beside the firm activity feed (the last six audit entries, → the full audit
 * trail). Both read the same seeded data the rest of the app renders.
 */
export function RecentActivity({
  deals,
  activity,
  workspaceNames,
}: {
  deals: RecentDeal[];
  activity: AuditEntry[];
  workspaceNames: Record<string, Localized>;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <RecentAnalyses deals={deals} />
      <ActivityFeed activity={activity} workspaceNames={workspaceNames} />
    </div>
  );
}
