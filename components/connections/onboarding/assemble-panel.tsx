"use client";

import * as React from "react";
import { motion, useReducedMotion } from "motion/react";
import { Bot, Check, Library, Scale, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";

const EASE = [0.4, 0, 0.2, 1] as const; // mirrors --ease
// Stage i starts at i*STAGE_GAP; its check lands STAGE_DONE later; the whole
// sequence hands off to the complete phase TAIL after the last check (~3.3s
// total, every beat under the 400ms per-animation ceiling).
const STAGE_GAP_MS = 750;
const STAGE_DONE_MS = 650;
const TAIL_MS = 400;

const STAGE_ICONS = [Library, Bot, Scale, Sparkles] as const;

/** Assemble panel: the choreographed "building your workspace" beat, staged in
 *  the same grammar as the chat agent-activity timeline (reimplemented locally,
 *  fully offline). Auto-advances to the complete phase when the last check
 *  lands. Reduced motion jumps straight through. (design-briefs §2.4.) */
export function AssemblePanel({
  docs,
  pages,
  agents,
  onDone,
}: {
  docs: number;
  pages: number;
  agents: number;
  onDone: () => void;
}) {
  const t = useTranslations("onboarding");
  const reduce = useReducedMotion();
  const [started, setStarted] = React.useState(reduce ? 4 : 0);
  const [completed, setCompleted] = React.useState(reduce ? 4 : 0);

  // onDone is an ordinary parent callback; stash the latest in a ref (synced in
  // its own effect, per React's guidance) so the mount-only choreography effect
  // never re-runs on a parent re-render.
  const onDoneRef = React.useRef(onDone);
  React.useEffect(() => {
    onDoneRef.current = onDone;
  });

  const labels = React.useMemo(
    () => [
      t("assemble.indexing", { docs, pages }),
      t("assemble.agents", { agents }),
      t("assemble.charter"),
      t("assemble.ready"),
    ],
    [t, docs, pages, agents],
  );

  React.useEffect(() => {
    if (reduce) {
      const id = window.setTimeout(() => onDoneRef.current(), 0);
      return () => window.clearTimeout(id);
    }
    const timers: number[] = [];
    labels.forEach((_, i) => {
      timers.push(
        window.setTimeout(
          () => setStarted((n) => Math.max(n, i + 1)),
          i * STAGE_GAP_MS,
        ),
      );
      timers.push(
        window.setTimeout(
          () => setCompleted((n) => Math.max(n, i + 1)),
          i * STAGE_GAP_MS + STAGE_DONE_MS,
        ),
      );
    });
    timers.push(
      window.setTimeout(
        () => onDoneRef.current(),
        (labels.length - 1) * STAGE_GAP_MS + STAGE_DONE_MS + TAIL_MS,
      ),
    );
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [reduce, labels]);

  return (
    <div className="mx-auto max-w-[640px]">
      <h1 className="text-navy text-center text-2xl font-extrabold">
        {t("assemble.title")}
      </h1>
      <Card elevated padding="md" className="mt-8">
        <ul className="flex flex-col">
          {labels.map((label, i) => {
            const Icon = STAGE_ICONS[i];
            if (i >= started || !Icon) return null;
            const done = i < completed;
            return (
              <motion.li
                key={i}
                initial={reduce ? false : { opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22, ease: EASE }}
                className="flex items-center gap-3 py-2.5"
              >
                <span
                  className="bg-accent-50 text-accent-700 rounded-btn grid size-8 shrink-0 place-items-center"
                  aria-hidden="true"
                >
                  <Icon className="size-4" strokeWidth={2} />
                </span>
                <span className="text-navy flex-1 text-sm font-semibold">
                  {label}
                </span>
                <StatusMark done={done} reduce={reduce ?? false} />
              </motion.li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}

function StatusMark({ done, reduce }: { done: boolean; reduce: boolean }) {
  if (done) {
    return (
      <motion.span
        initial={reduce ? false : { scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.25, ease: EASE }}
        className="text-accent grid size-5 shrink-0 place-items-center"
        aria-hidden="true"
      >
        <Check className="size-4" strokeWidth={2.75} />
      </motion.span>
    );
  }
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
