"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import {
  ArrowRight,
  CheckCheck,
  CircleCheck,
  FileText,
  ScrollText,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { LogoTile } from "@/components/ui/logo-tile";
import { LucideIcon } from "@/components/shell/lucide-icon";
import { FileCard } from "@/components/generate/file-card";
import { ArtifactPreview } from "@/components/generate/artifact-preview";
import { cn } from "@/lib/utils";
import type { ArtifactMeta, Lang, Localized } from "@/lib/types";
import { useCountUp } from "@/lib/use-count-up";

const EASE = [0.4, 0, 0.2, 1] as const;

function western(value: number, lang: Lang): string {
  return new Intl.NumberFormat(lang === "ar" ? "ar-u-nu-latn" : "en-US").format(
    value,
  );
}

export interface RunLaneDisplay {
  agent: string;
  icon: string;
  nameEn: string;
  nameAr: string;
  summary: Localized;
  docs: { id: string; title: Localized }[];
}

export interface RunDisplay {
  workspace: string;
  workspaceName: Localized;
  workspaceLogo?: string;
  citationsTotal: number;
  elapsedMin: number;
  lanes: RunLaneDisplay[];
}

export interface OutputDisplay {
  meta: ArtifactMeta;
  sizeBytes: number;
}

export interface ScreeningRunDisplay {
  workspace: string;
  workspaceName: Localized;
  workspaceLogo?: string;
  checks: number;
}

/** Real vendored logo tile, or a monogram fallback (assets policy). */
function WorkspaceTile({
  name,
  logo,
  locale,
  size = 44,
}: {
  name: Localized;
  logo?: string;
  locale: Lang;
  size?: 24 | 44;
}) {
  if (logo) {
    return (
      <span
        className="border-border bg-card rounded-btn grid shrink-0 place-items-center border p-1.5"
        style={{ width: size, height: size }}
      >
        <Image
          src={logo}
          alt=""
          width={size - 12}
          height={size - 12}
          unoptimized
          className="size-full object-contain"
        />
      </span>
    );
  }
  return (
    <LogoTile
      label={name.en}
      initial={name[locale].charAt(0)}
      size={size === 24 ? 24 : 40}
    />
  );
}

/** Shimmer → check morph, staggered 250ms across the lanes (the "live-ish" cascade). */
function LaneStatus({ index, label }: { index: number; label: string }) {
  const reduce = useReducedMotion();
  const [done, setDone] = React.useState<boolean>(!!reduce);

  React.useEffect(() => {
    if (reduce) return;
    const id = window.setTimeout(
      () => setDone(true),
      250 + Math.min(index, 8) * 250,
    );
    return () => window.clearTimeout(id);
  }, [index, reduce]);

  return (
    <span
      className="mt-0.5 grid size-5 shrink-0 place-items-center"
      role="img"
      aria-label={done ? label : undefined}
    >
      {done ? (
        <motion.span
          initial={reduce ? false : { scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.25, ease: EASE }}
        >
          <CircleCheck className="text-accent size-5" aria-hidden="true" />
        </motion.span>
      ) : (
        <span
          className="faheem-skeleton rounded-pill size-4"
          aria-hidden="true"
        />
      )}
    </span>
  );
}

function DocChip({ id, title }: { id: string; title: string }) {
  return (
    <a
      href={`/api/documents/${id}`}
      target="_blank"
      rel="noreferrer"
      title={title}
      className="bg-navy-50 text-navy-700 hover:bg-navy-100 focus-visible:ring-accent focus-visible:ring-offset-card rounded-pill inline-flex max-w-[180px] items-center gap-1 px-2 py-0.5 text-[0.6875rem] font-medium transition-colors duration-[var(--duration-fast)] ease-[var(--ease)] outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
    >
      <FileText className="size-3 shrink-0" aria-hidden="true" />
      <span className="truncate">{title}</span>
    </a>
  );
}

function Lane({
  lane,
  index,
  locale,
  completeLabel,
  docsLabel,
}: {
  lane: RunLaneDisplay;
  index: number;
  locale: Lang;
  completeLabel: string;
  docsLabel: string;
}) {
  const reduce = useReducedMotion();
  // In EN the lane name stands alone; in AR the EN name stays as the
  // secondary label (the agents-directory pattern, design-briefs §3.7).
  const lead = locale === "ar" ? lane.nameAr : lane.nameEn;
  const secondary = locale === "ar" ? lane.nameEn : null;

  return (
    <motion.li
      initial={reduce ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.25,
        ease: EASE,
        delay: Math.min(index, 8) * 0.035,
      }}
      className="flex items-start gap-3"
    >
      <LaneStatus index={index} label={completeLabel} />
      <span className="bg-accent-50 text-accent-700 rounded-btn grid size-9 shrink-0 place-items-center">
        <LucideIcon name={lane.icon} className="size-4.5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="text-navy text-[0.9375rem] font-bold">{lead}</span>
          {secondary && (
            <span className="text-text-secondary text-xs font-medium">
              {secondary}
            </span>
          )}
        </div>
        <p className="text-text-secondary mt-0.5 text-[0.8125rem]">
          {lane.summary[locale]}
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5" aria-label={docsLabel}>
          {lane.docs.map((doc) => (
            <DocChip key={doc.id} id={doc.id} title={doc.title[locale]} />
          ))}
        </div>
      </div>
    </motion.li>
  );
}

function ProgressBar({ label }: { label: string }) {
  const reduce = useReducedMotion();
  const locale = useLocale() as Lang;
  const pct = useCountUp(100);

  return (
    <div className="mt-4">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-text-secondary text-xs font-medium">{label}</span>
        <span className="text-navy financial text-xs font-semibold">
          {western(Math.round(pct), locale)}%
        </span>
      </div>
      <div className="bg-navy-100 rounded-pill h-1.5 w-full overflow-hidden">
        <motion.div
          className="bg-accent rounded-pill h-full"
          initial={reduce ? false : { width: 0 }}
          animate={{ width: "100%" }}
          transition={{ duration: 0.4, ease: EASE }}
        />
      </div>
    </div>
  );
}

/**
 * Analysis Runs, the /dashboard centerpiece and the screen's differentiator:
 * one recorded Jahez deep-dive rendered as an orchestrated, auditable run (7
 * specialist lanes with the real documents each consumed, a shimmer→check
 * cascade on first reveal, the three landed deliverables wired to the existing
 * in-app preview, and a footer that ties every answer to the audit trail),
 * plus a collapsed Darb screening run. No engine contact, pure seed data.
 */
export function RunsPanel({
  run,
  outputs,
  screening,
}: {
  run: RunDisplay;
  outputs: OutputDisplay[];
  screening: ScreeningRunDisplay;
}) {
  const t = useTranslations("dashboard.runs");
  const locale = useLocale() as Lang;
  const [preview, setPreview] = React.useState<ArtifactMeta | null>(null);

  return (
    <section aria-label={t("title")}>
      <div className="mb-4">
        <h2 className="text-h3 text-navy font-extrabold">{t("title")}</h2>
        <p className="text-text-secondary mt-1 text-[0.9375rem]">
          {t("subtitle")}
        </p>
      </div>

      <Card elevated padding="none" data-testid="analysis-run">
        {/* run header */}
        <div className="p-6">
          <div className="flex items-start gap-4">
            <WorkspaceTile
              name={run.workspaceName}
              logo={run.workspaceLogo}
              locale={locale}
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-navy text-base font-bold">
                  {run.workspaceName[locale]}
                </h3>
                <Badge variant="mint" size="sm">
                  {t("status.complete")}
                </Badge>
              </div>
              <p className="text-text-secondary mt-0.5 text-[0.8125rem]">
                {t("kind.deepDive")} ·{" "}
                {t("elapsed", { minutes: run.elapsedMin })}
              </p>
            </div>
          </div>
          <ProgressBar label={t("progressLabel")} />
        </div>

        {/* specialist lanes */}
        <div className="border-border border-t p-6">
          <div className="mb-4 flex items-center gap-2">
            <h4 className="text-text-secondary text-[0.8125rem] font-bold tracking-[0.04em] uppercase">
              {t("lanesTitle")}
            </h4>
            <Badge variant="neutral" size="sm" className="financial">
              {western(run.lanes.length, locale)}
            </Badge>
          </div>
          <ul className="flex flex-col gap-4">
            {run.lanes.map((lane, i) => (
              <Lane
                key={lane.agent}
                lane={lane}
                index={i}
                locale={locale}
                completeLabel={t("laneComplete", {
                  name: locale === "ar" ? lane.nameAr : lane.nameEn,
                })}
                docsLabel={t("docsRead")}
              />
            ))}
          </ul>
        </div>

        {/* deliverables */}
        <div className="border-border border-t p-6">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h4 className="text-text-secondary text-[0.8125rem] font-bold tracking-[0.04em] uppercase">
              {t("outputsTitle")}
            </h4>
            <span className="text-text-secondary text-xs">
              {t("citations", { count: run.citationsTotal })}
            </span>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {outputs.map((o) => (
              <FileCard
                key={o.meta.id}
                meta={o.meta}
                sizeBytes={o.sizeBytes}
                workspace={run.workspace}
                onPreview={() => setPreview(o.meta)}
              />
            ))}
          </div>
        </div>

        {/* audit footer */}
        <Link
          href="/audit"
          className="border-border text-navy-700 hover:bg-navy-50 focus-visible:ring-accent focus-visible:ring-offset-card flex items-center gap-2 border-t p-4 text-xs font-medium transition-colors duration-[var(--duration-fast)] ease-[var(--ease)] outline-none focus-visible:ring-2 focus-visible:ring-inset"
        >
          <ScrollText
            className="text-accent-700 size-4 shrink-0"
            aria-hidden="true"
          />
          <span>{t("auditFooter")}</span>
          <ArrowRight
            className="ms-auto size-3.5 shrink-0 rtl:-scale-x-100"
            aria-hidden="true"
          />
        </Link>
      </Card>

      {/* collapsed second run, Darb screening */}
      <Link
        href={`/deals/${screening.workspace}`}
        data-testid="screening-run"
        className="border-border bg-card hover:bg-navy-50 hover:border-navy-300 focus-visible:ring-accent focus-visible:ring-offset-bg rounded-card mt-3 flex items-center gap-3 border p-4 transition-colors duration-[var(--duration-fast)] ease-[var(--ease)] outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
      >
        <span className="bg-accent-50 text-accent-700 rounded-btn grid size-9 shrink-0 place-items-center">
          <CheckCheck className="size-4.5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-navy text-sm font-semibold">
            {screening.workspaceName[locale]} · {t("kind.screening")}
          </p>
          <p className="text-text-secondary financial text-xs">
            {t("checks", { count: screening.checks })}
          </p>
        </div>
        <Badge variant="mint" size="sm">
          {t("status.complete")}
        </Badge>
        <ArrowRight
          className={cn("text-text-secondary size-4 shrink-0 rtl:-scale-x-100")}
          aria-hidden="true"
        />
      </Link>

      <ArtifactPreview meta={preview} onClose={() => setPreview(null)} />
    </section>
  );
}
