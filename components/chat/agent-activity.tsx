"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { BadgeCheck, Check, ChevronUp } from "lucide-react";
import { useTranslations } from "next-intl";
import { getAgent } from "@/lib/ai/agents";
import type { Lang } from "@/lib/types";
import { LucideIcon } from "@/components/shell/lucide-icon";
import type { StageRow } from "@/components/chat/reduce";

const EASE = [0.4, 0, 0.2, 1] as const;

/**
 * Choreographed agent-activity timeline (the multi-agent proof). Each stage
 * reveals with a staggered entrance and a shimmer→check morph, then the whole
 * timeline collapses to a one-line summary chip when the answer completes.
 * Drives its own reveal clock so the choreography reads identically whether
 * stages arrive live (paced) or all at once (cached replay / seeded history).
 */
export function AgentActivity({
  stageRows,
  done,
  elapsedMs,
  sourcesCount,
  docTitle,
  lang,
}: {
  stageRows: StageRow[];
  done: boolean;
  elapsedMs?: number;
  sourcesCount: number;
  docTitle: (docId: string) => string;
  lang: Lang;
}) {
  const t = useTranslations("chat.activity");
  const [expanded, setExpanded] = React.useState(!done);
  const wasDone = React.useRef(done);

  // Auto-collapse shortly after completion so the final checks are seen first.
  React.useEffect(() => {
    if (done && !wasDone.current) {
      const id = setTimeout(() => setExpanded(false), 800);
      wasDone.current = true;
      return () => clearTimeout(id);
    }
    wasDone.current = done;
  }, [done]);

  if (stageRows.length === 0) return null;

  const seconds =
    elapsedMs != null ? Math.max(1, Math.round(elapsedMs / 1000)) : undefined;
  const summary =
    seconds != null
      ? t("doneSeconds", { count: stageRows.length, seconds })
      : t("doneSources", { count: stageRows.length, sources: sourcesCount });

  return (
    <div className="mb-3">
      <AnimatePresence mode="wait" initial={false}>
        {expanded ? (
          <motion.div
            key="panel"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: EASE }}
            className="border-border bg-card rounded-card border p-3"
          >
            <div className="mb-1.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {done ? (
                  <BadgeCheck
                    className="text-accent size-4"
                    aria-hidden="true"
                  />
                ) : (
                  <WorkingDot />
                )}
                <span className="text-navy text-[0.8125rem] font-bold">
                  {done ? summary : `${t("working")}…`}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setExpanded(false)}
                aria-label={t("hide")}
                className="text-text-secondary hover:bg-navy-50 hover:text-navy focus-visible:ring-accent focus-visible:ring-offset-card rounded-btn grid size-6 place-items-center transition-colors duration-[var(--duration-fast)] ease-[var(--ease)] outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
              >
                <ChevronUp className="size-4" aria-hidden="true" />
              </button>
            </div>
            <ul>
              {stageRows.map((row, i) => (
                <StageRowItem
                  key={row.agent}
                  row={row}
                  index={i}
                  lang={lang}
                  docTitle={docTitle}
                  readingLabel={t("reading")}
                />
              ))}
            </ul>
          </motion.div>
        ) : (
          <motion.button
            key="chip"
            type="button"
            onClick={() => setExpanded(true)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: EASE }}
            aria-label={t("show")}
            className="bg-navy-50 text-navy-700 hover:bg-navy-100 focus-visible:ring-accent focus-visible:ring-offset-card rounded-pill inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold transition-colors duration-[var(--duration-fast)] ease-[var(--ease)] outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          >
            <BadgeCheck className="text-accent size-3.5" aria-hidden="true" />
            {summary}
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

function WorkingDot() {
  const reduce = useReducedMotion();
  return (
    <motion.span
      aria-hidden="true"
      className="bg-accent rounded-pill size-2"
      animate={reduce ? {} : { opacity: [1, 0.35, 1] }}
      transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

function StageRowItem({
  row,
  index,
  lang,
  docTitle,
  readingLabel,
}: {
  row: StageRow;
  index: number;
  lang: Lang;
  docTitle: (docId: string) => string;
  readingLabel: string;
}) {
  const reduce = useReducedMotion();
  const agent = getAgent(row.agent);
  const other: Lang = lang === "ar" ? "en" : "ar";

  const titles = row.docIds.slice(0, 2).map(docTitle);
  const extra = row.docIds.length - titles.length;
  const reading =
    titles.length > 0
      ? `${readingLabel}: ${titles.join(" · ")}${extra > 0 ? ` +${extra}` : ""}`
      : null;

  return (
    <motion.li
      initial={reduce ? false : { opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.22,
        ease: EASE,
        delay: Math.min(index, 8) * 0.04,
      }}
      className="flex items-start gap-2.5 py-1.5"
    >
      <span className="bg-accent-50 text-accent-700 rounded-btn mt-0.5 grid size-6 shrink-0 place-items-center">
        <LucideIcon name={agent.icon} className="size-3.5" strokeWidth={2} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-1.5">
          <span className="text-navy text-sm font-semibold">
            {agent.name[lang]}
          </span>
          <span className="text-text-secondary truncate text-xs">
            {agent.name[other]}
          </span>
        </div>
        {reading && (
          <p className="text-text-secondary truncate text-xs">{reading}</p>
        )}
      </div>
      <StatusIndicator done={row.done} index={index} />
    </motion.li>
  );
}

function StatusIndicator({ done, index }: { done: boolean; index: number }) {
  const reduce = useReducedMotion();
  const [ready, setReady] = React.useState(reduce);
  React.useEffect(() => {
    if (reduce) return;
    const id = setTimeout(() => setReady(true), 150 + index * 140);
    return () => clearTimeout(id);
  }, [index, reduce]);

  if (done && ready) {
    return (
      <motion.span
        initial={reduce ? false : { scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.25, ease: EASE }}
        className="text-accent mt-0.5 grid size-5 place-items-center"
        aria-hidden="true"
      >
        <Check className="size-4" strokeWidth={2.75} />
      </motion.span>
    );
  }
  return (
    <span className="mt-0.5 grid size-5 place-items-center" aria-hidden="true">
      <motion.span
        className="bg-accent-300 rounded-pill size-2"
        animate={reduce ? {} : { opacity: [1, 0.3, 1] }}
        transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
      />
    </span>
  );
}
