"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { Check, CornerDownLeft, Lock, Minus, Sparkles } from "lucide-react";
import { getAgent } from "@/lib/ai/agents";
import { Button } from "@/components/ui/button";
import { LucideIcon } from "@/components/shell/lucide-icon";
import { baseField, type EditPair } from "@/lib/model/edit-parser";
import {
  subscribeModelEditPrefill,
  takeModelEditPrefill,
  type ModelEditPrefill,
} from "@/lib/demo/model-edit-bus";
import { cn, formatPercent, formatSAR } from "@/lib/utils";
import type { LiveModel } from "@/components/model/use-live-model";
import type { AgentId, Lang } from "@/lib/types";

const EASE = [0.4, 0, 0.2, 1] as const;

/** Per-stage beat. Start→done inside one beat keeps every reveal <400ms
 * (AGENTS.md motion law); reduced motion collapses the whole run to instant. */
const STEP_MS = 340;

/** Assumption fields whose edit moves debt-cost / zakat inputs — the only
 * edits where the Compliance agent has anything to re-check (the Shariah
 * ratios themselves derive purely from sourced balance-sheet actuals). */
const COMPLIANCE_RELEVANT = new Set(["spread", "zakat"]);

interface EditResponse {
  kind: "edit" | "source-locked" | "unparsed";
  assumptionKey?: string;
  value?: number;
  also?: EditPair[];
  target?: string;
  summary?: string;
}

type StageStatus = "pending" | "active" | "done" | "skipped" | "flagged";

interface Stage {
  agent: AgentId;
  status: StageStatus;
  /** message key under model.edit.stages */
  captionKey: string;
}

interface Run {
  id: number;
  kind: "edit" | "source-locked";
  stages: Stage[];
  finished: boolean;
}

const CHIPS = [
  { id: "growth", key: "growth" },
  { id: "terminal", key: "terminal" },
  { id: "margin", key: "margin" },
  { id: "locked", key: "locked" },
] as const;

function editStages(assumptionKey: string): Stage[] {
  const relevant = COMPLIANCE_RELEVANT.has(baseField(assumptionKey));
  return [
    { agent: "valuation", status: "pending", captionKey: "valuation" },
    {
      agent: "critical-review",
      status: "pending",
      captionKey: "critical-review",
    },
    {
      agent: "compliance",
      status: "pending",
      captionKey: relevant ? "compliance" : "compliance-skip",
    },
    { agent: "writing", status: "pending", captionKey: "writing" },
  ];
}

function lockedStages(): Stage[] {
  return [
    { agent: "valuation", status: "pending", captionKey: "valuation" },
    {
      agent: "critical-review",
      status: "pending",
      captionKey: "critical-review-locked",
    },
  ];
}

/**
 * The conversational edit composer (WS-C): a slim command bar over the Live
 * Model. The instruction goes to /api/model-edit (scripted-first, offline in
 * cached mode); an admitted edit plays as the specialist team working —
 * Valuation recomputes (the numbers move when its stage completes) → Critical
 * Review re-verifies provenance → Compliance re-checks Shariah ratios only for
 * debt/zakat-relevant edits (otherwise visibly "no re-check needed") → Writing
 * refreshes the one-line recommendation, computed from the NEW outputs via the
 * house formatters (no invented numbers). A source-locked attempt is
 * choreographed too: Critical Review raises the lock.
 */
export function EditComposer({
  model,
  companyId,
}: {
  model: LiveModel;
  companyId: string;
}) {
  const t = useTranslations("model.edit");
  const locale = useLocale() as Lang;
  const reduce = useReducedMotion();
  const step = reduce ? 0 : STEP_MS;

  const [text, setText] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [run, setRun] = React.useState<Run | null>(null);
  const [notice, setNotice] = React.useState<"locked" | "unparsed" | null>(
    null,
  );
  const timeouts = React.useRef<ReturnType<typeof setTimeout>[]>([]);
  const runId = React.useRef(0);

  React.useEffect(
    () => () => {
      for (const id of timeouts.current) clearTimeout(id);
    },
    [],
  );

  // ⌘K palette hand-off (WS-F, lib/demo/model-edit-bus.ts — same pull-and-clear
  // pattern as ChatView's golden-bus): a Live Model beat entry prefills the
  // instruction text, same as clicking one of the chips below, but leaves
  // submitting to the presenter's Enter/Apply (matches the golden-question
  // palette, which also only ever prefills).
  React.useEffect(() => {
    function apply(prefill: ModelEditPrefill) {
      setText(prefill.text);
    }
    const pending = takeModelEditPrefill();
    if (pending) apply(pending);
    return subscribeModelEditPrefill(apply);
  }, []);

  const at = (ms: number, fn: () => void) => {
    timeouts.current.push(setTimeout(fn, ms));
  };

  const setStage = (id: number, index: number, status: StageStatus) => {
    setRun((r) =>
      r && r.id === id
        ? {
            ...r,
            stages: r.stages.map((s, i) =>
              i === index ? { ...s, status } : s,
            ),
          }
        : r,
    );
  };

  const finish = (id: number) => {
    setRun((r) => (r && r.id === id ? { ...r, finished: true } : r));
  };

  /** Play the edit choreography; apply the edit when Valuation's beat lands. */
  const playEdit = (res: EditResponse) => {
    const key = res.assumptionKey!;
    const stages = editStages(key);
    const id = ++runId.current;
    setRun({ id, kind: "edit", stages, finished: false });

    let tms = 0;
    stages.forEach((stage, i) => {
      const isSkip = stage.captionKey === "compliance-skip";
      at(tms, () => setStage(id, i, isSkip ? "skipped" : "active"));
      tms += isSkip ? Math.round(step / 2) : step;
      if (!isSkip) {
        at(tms, () => {
          setStage(id, i, "done");
          if (stage.agent === "valuation") {
            // the numbers move exactly when Valuation's stage completes
            model.setAssumption(key, res.value!);
            for (const extra of res.also ?? []) {
              model.setAssumption(extra.assumptionKey, extra.value);
            }
          }
        });
      }
    });
    at(tms, () => finish(id));
  };

  /** Source-locked: Valuation picks it up, Critical Review raises the lock. */
  const playLocked = () => {
    const stages = lockedStages();
    const id = ++runId.current;
    setRun({ id, kind: "source-locked", stages, finished: false });

    at(0, () => setStage(id, 0, "active"));
    at(step, () => {
      setStage(id, 0, "done");
      setStage(id, 1, "active");
    });
    at(step * 2, () => {
      setStage(id, 1, "flagged");
      finish(id);
      setNotice("locked");
    });
  };

  const submit = async (instruction: string) => {
    const trimmed = instruction.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    setNotice(null);
    setRun(null);
    for (const id of timeouts.current) clearTimeout(id);
    timeouts.current = [];
    try {
      const res = await fetch("/api/model-edit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          instruction: trimmed,
          lang: locale,
          assumptions: model.assumptions,
          companyId,
        }),
      });
      const data = (await res.json()) as EditResponse;
      if (data.kind === "edit" && data.assumptionKey != null) {
        playEdit(data);
      } else if (data.kind === "source-locked") {
        playLocked();
      } else {
        setNotice("unparsed");
      }
    } catch {
      setNotice("unparsed");
    } finally {
      setBusy(false);
    }
  };

  const recommendation = useRecommendation(model, locale, t);
  const showRecommendation =
    run?.kind === "edit" && run.finished && recommendation;

  return (
    <section
      data-testid="edit-composer"
      className="border-border bg-card rounded-card mt-6 border p-3"
    >
      <form
        className="flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void submit(text);
        }}
      >
        <Sparkles
          className="text-accent-700 size-4 shrink-0"
          aria-hidden="true"
        />
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t("placeholder")}
          aria-label={t("inputLabel")}
          data-testid="edit-composer-input"
          className="text-navy placeholder:text-text-secondary min-w-0 flex-1 bg-transparent text-sm outline-none"
        />
        <Button
          type="submit"
          variant="secondary"
          size="sm"
          className="h-8 shrink-0 px-3 text-xs"
          disabled={busy || !text.trim()}
          endIcon={
            <CornerDownLeft
              className="size-3.5 rtl:-scale-x-100"
              aria-hidden="true"
            />
          }
        >
          {t("submit")}
        </Button>
      </form>

      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {CHIPS.map((chip) => (
          <button
            key={chip.id}
            type="button"
            disabled={busy}
            data-testid={`edit-chip-${chip.id}`}
            onClick={() => {
              const instruction = t(`chips.${chip.key}`);
              setText(instruction);
              void submit(instruction);
            }}
            className="bg-navy-50 text-navy-700 hover:bg-navy-100 focus-visible:ring-accent focus-visible:ring-offset-card rounded-pill px-2.5 py-1 text-xs font-semibold transition-colors duration-[var(--duration-fast)] ease-[var(--ease)] outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50"
          >
            {t(`chips.${chip.key}`)}
          </button>
        ))}
      </div>

      <AnimatePresence initial={false}>
        {run && (
          <motion.div
            key={run.id}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: EASE }}
            data-testid="edit-choreography"
            className="border-border mt-3 border-t pt-2"
          >
            <p className="text-navy mb-1 flex items-center gap-2 text-[0.8125rem] font-bold">
              {run.finished ? (
                <Check className="text-accent size-4" aria-hidden="true" />
              ) : (
                <WorkingDot />
              )}
              {t("working")}
            </p>
            <ul>
              {run.stages.map((stage, i) => (
                <StageItem key={stage.agent} stage={stage} index={i} t={t} />
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence initial={false}>
        {showRecommendation && (
          <motion.p
            key={`rec-${run.id}`}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: EASE }}
            data-testid="edit-recommendation"
            className="bg-accent-50 text-accent-700 rounded-btn financial mt-3 px-3 py-2 text-[0.8125rem] font-semibold tabular-nums"
          >
            {recommendation}
          </motion.p>
        )}
        {notice === "locked" && (
          <motion.p
            key="locked"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: EASE }}
            data-testid="edit-source-locked"
            className="bg-warning-50 text-warning-700 rounded-btn mt-3 flex items-start gap-2 px-3 py-2 text-[0.8125rem] font-semibold"
          >
            <Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            {t("sourceLocked")}
          </motion.p>
        )}
        {notice === "unparsed" && (
          <motion.p
            key="unparsed"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: EASE }}
            data-testid="edit-unparsed"
            className="text-text-secondary mt-3 text-[0.8125rem]"
          >
            {t("unparsed")}
          </motion.p>
        )}
      </AnimatePresence>
    </section>
  );
}

/** The one-line recommendation, recomputed from the CURRENT outputs — per-share
 * fair value and weighted IRR vs the sourced IC hurdle, house formatters only. */
function useRecommendation(
  model: LiveModel,
  locale: Lang,
  t: ReturnType<typeof useTranslations>,
): string | null {
  const nodes = model.outputs.nodes;
  const perShare = nodes["base.perShare"];
  const irr = nodes["weightedReturn"];
  const hurdle = nodes["ic.hurdle"];
  if (!perShare || !irr || !hurdle) return null;
  return t(
    irr.value >= hurdle.value ? "recommendationAbove" : "recommendationBelow",
    {
      perShare: formatSAR(perShare.value, locale, { unit: "abs", decimals: 2 }),
      irr: formatPercent(irr.value, locale, { decimals: 1 }),
      hurdle: formatPercent(hurdle.value, locale, { decimals: 0 }),
    },
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

/** One choreography row — the Agent Activity visual language (icon tile,
 * bilingual agent name, caption, shimmer-dot → check morph). */
function StageItem({
  stage,
  index,
  t,
}: {
  stage: Stage;
  index: number;
  t: ReturnType<typeof useTranslations>;
}) {
  const reduce = useReducedMotion();
  const locale = useLocale() as Lang;
  const other: Lang = locale === "ar" ? "en" : "ar";
  const agent = getAgent(stage.agent);
  if (stage.status === "pending") return null;

  const skipped = stage.status === "skipped";
  return (
    <motion.li
      initial={reduce ? false : { opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.22,
        ease: EASE,
        delay: Math.min(index, 8) * 0.04,
      }}
      data-testid={`edit-stage-${stage.agent}`}
      data-status={stage.status}
      className={cn("flex items-start gap-2.5 py-1.5", skipped && "opacity-60")}
    >
      <span className="bg-accent-50 text-accent-700 rounded-btn mt-0.5 grid size-6 shrink-0 place-items-center">
        <LucideIcon name={agent.icon} className="size-3.5" strokeWidth={2} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-1.5">
          <span className="text-navy text-sm font-semibold">
            {agent.name[locale]}
          </span>
          <span className="text-text-secondary truncate text-xs">
            {agent.name[other]}
          </span>
        </div>
        <p className="text-text-secondary truncate text-xs">
          {t(`stages.${stage.captionKey}`)}
        </p>
      </div>
      <StageStatusIcon status={stage.status} />
    </motion.li>
  );
}

function StageStatusIcon({ status }: { status: StageStatus }) {
  const reduce = useReducedMotion();
  if (status === "done") {
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
  if (status === "flagged") {
    return (
      <motion.span
        initial={reduce ? false : { scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.25, ease: EASE }}
        className="text-warning-700 mt-0.5 grid size-5 place-items-center"
        aria-hidden="true"
      >
        <Lock className="size-4" strokeWidth={2.5} />
      </motion.span>
    );
  }
  if (status === "skipped") {
    return (
      <span
        className="text-text-secondary mt-0.5 grid size-5 place-items-center"
        aria-hidden="true"
      >
        <Minus className="size-4" strokeWidth={2} />
      </span>
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
