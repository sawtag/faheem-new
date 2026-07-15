"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  ARTIFACT_KINDS,
  type GenerateEvent,
} from "@/components/generate/protocol";
import { streamGenerate } from "@/components/generate/stream";
import {
  reduceGenerateEvents,
  type ArtifactRow,
} from "@/components/generate/reduce";
import { FileCard, KIND_TILE } from "@/components/generate/file-card";
import { ArtifactPreview } from "@/components/generate/artifact-preview";
import { DraftToIc } from "@/components/ic/draft-to-ic";
import type { ArtifactMeta } from "@/lib/types";

const EASE = [0.4, 0, 0.2, 1] as const;

/**
 * The deliverables flow: three artifact rows tick through
 * assembling → building → writing, each morphing into a Lunar-branded
 * FileCard as it lands. Mount-anywhere (chat inline, workspace Artifacts
 * tab) — starts generating on mount by default. When the full run lands,
 * the board deck AUTO-OPENS in the ArtifactPreview slide-over (a fixed
 * overlay, so the host layout — chat thread or tab — is untouched).
 */
export function GenerationPanel({
  workspace,
  artifacts = "all",
  autoStart = true,
}: {
  workspace: string;
  artifacts?: "all";
  autoStart?: boolean;
}) {
  const [events, setEvents] = React.useState<GenerateEvent[]>([]);
  const [preview, setPreview] = React.useState<ArtifactMeta | null>(null);
  const started = React.useRef(false);
  const autoOpened = React.useRef(false);
  const reduce = useReducedMotion();

  React.useEffect(() => {
    if (!autoStart || started.current) return;
    started.current = true;
    const controller = new AbortController();
    streamGenerate(artifacts, controller.signal, (event) => {
      setEvents((prev) => [...prev, event]);
    }).catch(() => {
      /* aborted (unmount / StrictMode remount) or network drop — the
         surviving mount re-streams; rows simply stay at their last state */
    });
    return () => {
      // Reset the single-flight guard so StrictMode's dev-only
      // mount→cleanup→remount cycle restarts the aborted stream (otherwise
      // the ref stays latched and the panel sits pending forever in dev).
      started.current = false;
      controller.abort();
    };
  }, [autoStart, artifacts]);

  const { rows, done } = reduceGenerateEvents(ARTIFACT_KINDS, events);
  const landedArtifacts = rows
    .map((row) => row.meta)
    .filter((meta): meta is ArtifactMeta => meta !== null);

  // The money moment: the run completes → progress ticks settle → the board
  // deck slides open on its own, one beat after the last card's morph.
  const deckMeta = rows.find((row) => row.kind === "pptx")?.meta ?? null;
  React.useEffect(() => {
    if (!done || !deckMeta || autoOpened.current) return;
    autoOpened.current = true;
    const id = window.setTimeout(() => setPreview(deckMeta), 400);
    return () => window.clearTimeout(id);
  }, [done, deckMeta]);

  return (
    <>
      <div className="flex flex-col gap-3">
        {rows.map((row, i) => {
          const meta = row.meta;
          return (
            <RowSlot
              key={row.kind}
              row={row}
              index={i}
              workspace={workspace}
              onPreview={meta ? () => setPreview(meta) : undefined}
            />
          );
        })}
      </div>
      {done && landedArtifacts.length > 0 && (
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: EASE, delay: 0.28 }}
          className="mt-3"
        >
          <DraftToIc workspace={workspace} artifacts={landedArtifacts} />
        </motion.div>
      )}
      <ArtifactPreview meta={preview} onClose={() => setPreview(null)} />
    </>
  );
}

function RowSlot({
  row,
  index,
  workspace,
  onPreview,
}: {
  row: ArtifactRow;
  index: number;
  workspace: string;
  onPreview?: () => void;
}) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.22,
        ease: EASE,
        delay: Math.min(index, 8) * 0.035,
      }}
    >
      <AnimatePresence mode="wait" initial={false}>
        {row.status === "done" && row.meta ? (
          <motion.div
            key="card"
            initial={reduce ? false : { opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2, ease: EASE }}
          >
            <FileCard
              meta={row.meta}
              sizeBytes={row.sizeBytes ?? 0}
              workspace={workspace}
              onPreview={onPreview}
            />
          </motion.div>
        ) : (
          <motion.div
            key="row"
            initial={false}
            exit={reduce ? undefined : { opacity: 0 }}
            transition={{ duration: 0.15, ease: EASE }}
          >
            <ProgressRow row={row} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function ProgressRow({ row }: { row: ArtifactRow }) {
  const t = useTranslations("generate");
  const { icon: Icon, tile } = KIND_TILE[row.kind];
  const label = t(`row.${row.kind}`);
  const phaseText =
    row.status === "error"
      ? t("errorArtifact")
      : row.phase
        ? row.phase === "building"
          ? t("phase.building", { noun: t(`noun.${row.kind}`) })
          : t(`phase.${row.phase}`)
        : null;

  return (
    <Card padding="sm" className="flex items-center gap-3">
      <span
        className={cn(
          "rounded-btn grid size-10 shrink-0 place-items-center transition-opacity duration-[var(--duration)] ease-[var(--ease)]",
          tile,
          row.status === "pending" && "opacity-50",
        )}
      >
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "text-sm font-semibold",
            row.status === "pending" ? "text-text-secondary" : "text-navy",
          )}
        >
          {label}
        </p>
        {phaseText ? (
          <p
            className={cn(
              "truncate text-xs",
              row.status === "error"
                ? "text-danger-700"
                : "text-text-secondary",
            )}
          >
            {phaseText}
          </p>
        ) : (
          <Skeleton className="mt-1 h-3 w-32" />
        )}
      </div>
      <StatusDot status={row.status} />
    </Card>
  );
}

function StatusDot({ status }: { status: ArtifactRow["status"] }) {
  const reduce = useReducedMotion();

  if (status === "error") {
    return (
      <span
        className="text-danger mt-0.5 grid size-5 shrink-0 place-items-center"
        aria-hidden="true"
      >
        <AlertCircle className="size-4" strokeWidth={2.5} />
      </span>
    );
  }

  if (status === "active") {
    return (
      <span
        className="grid size-5 shrink-0 place-items-center"
        aria-hidden="true"
      >
        <motion.span
          className="bg-accent-300 rounded-pill size-2"
          animate={reduce ? {} : { opacity: [1, 0.3, 1] }}
          transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
        />
      </span>
    );
  }

  // pending — hollow, waiting its turn
  return (
    <span
      className="border-border rounded-pill mt-0.5 size-2 shrink-0 border"
      aria-hidden="true"
    />
  );
}
