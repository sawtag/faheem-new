"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { motion, useReducedMotion } from "motion/react";
import { CheckCheck, FileOutput, MessageSquareText } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { LogoTile } from "@/components/ui/logo-tile";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { AuditEntry, Lang, Localized } from "@/lib/types";
import { newEntries } from "./diff-entries";

const POLL_MS = 5000;
const EASE = [0.4, 0, 0.2, 1] as const;
const COLUMNS = "140px 160px 160px 1fr 100px";

type ContextFilter = "all" | "jahez" | "darb" | "thara-pay" | "firm";

const ACTION_ICON = {
  question: MessageSquareText,
  artifact: FileOutput,
  "stage-advance": CheckCheck,
} as const;

/** "Jul 12, 09:41" — no year, Western digits both locales (design-briefs §3.4); distinct from lib/utils.ts's formatDate, which always includes the year. */
function formatAuditTime(iso: string, lang: Lang): string {
  const numLocale = lang === "ar" ? "ar-u-nu-latn" : "en-US";
  return new Intl.DateTimeFormat(numLocale, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

async function fetchEntries(): Promise<AuditEntry[] | null> {
  try {
    const res = await fetch("/api/audit", { cache: "no-store" });
    if (!res.ok) return null;
    const data: unknown = await res.json();
    return Array.isArray(data) ? (data as AuditEntry[]) : null;
  } catch {
    return null;
  }
}

function SkeletonRow() {
  return (
    <div
      role="row"
      className="border-border grid h-12 items-center gap-3 border-b px-4"
      style={{ gridTemplateColumns: COLUMNS }}
    >
      <Skeleton className="h-4 w-20" />
      <div className="flex items-center gap-2">
        <Skeleton className="rounded-pill size-6" />
        <Skeleton className="h-3 w-12" />
      </div>
      <Skeleton className="rounded-pill h-6 w-24" />
      <Skeleton className="h-3 w-2/3" />
      <Skeleton className="h-3 w-10 justify-self-end" />
    </div>
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
    ? (workspaceNames[context.slice("workspace:".length)]?.[locale] ?? context)
    : firmLabel;

  return (
    <span className="bg-navy-50 rounded-pill inline-flex max-w-full items-center gap-1.5 px-2 py-1">
      <LogoTile label={label} size={16} />
      <span className="text-navy-700 truncate text-xs font-medium">
        {label}
      </span>
    </span>
  );
}

function Row({
  entry,
  isNew,
  workspaceNames,
  firmLabel,
  aliLabel,
  actionLabels,
  locale,
}: {
  entry: AuditEntry;
  isNew: boolean;
  workspaceNames: Record<string, Localized>;
  firmLabel: string;
  aliLabel: string;
  actionLabels: Record<AuditEntry["action"], string>;
  locale: Lang;
}) {
  const reduce = useReducedMotion();
  const ActionIcon = ACTION_ICON[entry.action];
  const detail = entry.question ?? entry.artifact;
  const hasCitations = !!entry.citationCount;

  return (
    <motion.div
      role="row"
      initial={isNew && !reduce ? { height: 0, opacity: 0 } : false}
      animate={{ height: 48, opacity: 1 }}
      transition={{ duration: reduce ? 0 : 0.25, ease: EASE }}
      className="overflow-hidden"
    >
      <div
        className="border-border hover:bg-navy-50 relative grid h-12 items-center gap-3 border-b px-4 transition-colors duration-[var(--duration-fast)] ease-[var(--ease)]"
        style={{ gridTemplateColumns: COLUMNS }}
      >
        {isNew && (
          <motion.span
            aria-hidden="true"
            className="bg-accent-50 pointer-events-none absolute inset-0"
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.4, ease: EASE }}
          />
        )}
        <span
          role="cell"
          className="financial text-text-secondary relative text-[0.8125rem] font-medium"
        >
          {formatAuditTime(entry.ts, locale)}
        </span>
        <span role="cell" className="relative flex items-center gap-2">
          <Avatar name="Ali" size="sm" />
          <span className="text-navy text-[0.8125rem] font-medium">
            {aliLabel}
          </span>
        </span>
        <span role="cell" className="relative">
          <ContextChip
            context={entry.context}
            workspaceNames={workspaceNames}
            firmLabel={firmLabel}
            locale={locale}
          />
        </span>
        <span
          role="cell"
          className="relative flex min-w-0 items-center gap-1.5 text-[0.8125rem]"
        >
          <ActionIcon
            className="text-navy size-4 shrink-0"
            aria-hidden="true"
          />
          <span className="text-navy shrink-0 font-medium whitespace-nowrap">
            {actionLabels[entry.action]}
          </span>
          {detail && (
            <span className="text-text-secondary truncate"> — {detail}</span>
          )}
        </span>
        <span role="cell" className="relative justify-self-end">
          {hasCitations ? (
            <Badge variant="mint" size="sm" className="financial">
              {entry.citationCount}
            </Badge>
          ) : (
            <span className="text-text-secondary text-[0.8125rem]">—</span>
          )}
        </span>
      </div>
    </motion.div>
  );
}

export function AuditTrail({
  workspaceNames,
}: {
  workspaceNames: Record<string, Localized>;
}) {
  const t = useTranslations("audit");
  const locale = useLocale() as Lang;
  const [entries, setEntries] = React.useState<AuditEntry[] | null>(null);
  const [freshKeys, setFreshKeys] = React.useState<Set<string>>(new Set());
  const [error, setError] = React.useState(false);
  const [filter, setFilter] = React.useState<ContextFilter>("all");

  React.useEffect(() => {
    let cancelled = false;
    let prior: AuditEntry[] | null = null;

    // Diffing only applies to POLL refreshes — the initial load seeds `prior`
    // without marking anything "new" (nothing should animate on first paint).
    async function tick(isPoll: boolean) {
      if (isPoll && document.visibilityState !== "visible") return;
      const data = await fetchEntries();
      if (cancelled) return;
      if (data === null) {
        setError(true);
        return;
      }
      setError(false);
      if (isPoll && prior) {
        const added = newEntries(prior, data);
        if (added.length > 0) {
          setFreshKeys(new Set(added.map((e) => e.ts + e.action)));
        }
      }
      prior = data;
      setEntries(data);
    }

    void tick(false);
    const id = setInterval(() => void tick(true), POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const actionLabels: Record<AuditEntry["action"], string> = {
    question: t("actionQuestion"),
    artifact: t("actionArtifact"),
    "stage-advance": t("actionScreening"),
  };

  const filters: { value: ContextFilter; label: string }[] = [
    { value: "all", label: t("filterAll") },
    { value: "jahez", label: workspaceNames.jahez?.[locale] ?? "Jahez" },
    { value: "darb", label: workspaceNames.darb?.[locale] ?? "Darb" },
    {
      value: "thara-pay",
      label: workspaceNames["thara-pay"]?.[locale] ?? "Thara Pay",
    },
    { value: "firm", label: t("filterFirm") },
  ];

  const contextFor: Record<Exclude<ContextFilter, "all">, string> = {
    jahez: "workspace:jahez",
    darb: "workspace:darb",
    "thara-pay": "workspace:thara-pay",
    firm: "firm",
  };

  const sorted = [...(entries ?? [])].sort((a, b) => b.ts.localeCompare(a.ts));
  const visible =
    filter === "all"
      ? sorted
      : sorted.filter((e) => e.context === contextFor[filter]);

  return (
    <>
      <header className="mb-8">
        <h1 className="text-h1 text-navy font-extrabold">{t("title")}</h1>
        <p className="text-text-secondary mt-2 text-[0.9375rem]">
          {t("subtitle")}
        </p>
      </header>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {filters.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              className={cn(
                "rounded-pill px-3.5 py-1.5 text-[0.8125rem] font-semibold transition-colors duration-[var(--duration-fast)] ease-[var(--ease)] outline-none",
                f.value === filter
                  ? "bg-accent-50 text-accent-700"
                  : "bg-card border-border text-text-secondary hover:text-navy border",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <span className="text-text-secondary text-xs font-medium">
          {t("lastDays")}
        </span>
      </div>

      {error && (
        <p className="text-text-secondary mb-2 text-xs font-medium">
          {t("paused")}
        </p>
      )}

      <div className="rounded-card border-border overflow-hidden border">
        <div
          role="row"
          className="bg-bg text-text-secondary grid h-10 items-center gap-3 px-4 text-[0.6875rem] font-semibold tracking-[0.04em] uppercase"
          style={{ gridTemplateColumns: COLUMNS }}
        >
          <span role="columnheader">{t("colTime")}</span>
          <span role="columnheader">{t("colUser")}</span>
          <span role="columnheader">{t("colContext")}</span>
          <span role="columnheader">{t("colAction")}</span>
          <span role="columnheader" className="justify-self-end">
            {t("colCitations")}
          </span>
        </div>

        {entries === null ? (
          <div role="rowgroup">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonRow key={i} />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <p className="text-text-secondary px-4 py-12 text-center text-[0.875rem] font-medium">
            {t("empty")}
          </p>
        ) : (
          <motion.div
            key={filter}
            role="rowgroup"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.15, ease: EASE }}
          >
            {visible.map((entry) => (
              <Row
                key={entry.ts + entry.action}
                entry={entry}
                isNew={freshKeys.has(entry.ts + entry.action)}
                workspaceNames={workspaceNames}
                firmLabel={t("contextFirm")}
                aliLabel={t("userAli")}
                actionLabels={actionLabels}
                locale={locale}
              />
            ))}
          </motion.div>
        )}
      </div>
    </>
  );
}
