"use client";

import * as React from "react";
import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import {
  PackageCheck,
  Radio,
  RotateCcw,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { FaheemMode } from "@/lib/types";
import {
  clearModeCookie,
  currentLastResponseCached,
  publishMode,
  setModeCookie,
  subscribeLastResponseCached,
  subscribeMode,
} from "@/lib/demo/mode-bus";
import { cn } from "@/lib/utils";

const EASE = [0.4, 0, 0.2, 1] as const;
const ORDER: FaheemMode[] = ["cached", "auto", "live"];
const ICONS = { cached: PackageCheck, auto: Sparkles, live: Radio } as const;

/**
 * The /settings centerpiece: the answer-engine mode switch (settings spec,
 * 2026-07-16). Three radio cards write the `faheem_mode` cookie via the shared
 * mode-bus helper and publish on the mode channel, so this section and the ⌘.
 * overlay never disagree within a session. The chat route re-reads the cookie
 * per request; no reload needed.
 */
export function ModeSection({
  initialMode,
  envDefault,
  initiallyOverridden,
  keyConfigured,
}: {
  initialMode: FaheemMode;
  /** what `resolveMode` yields with no cookie, the reset target */
  envDefault: FaheemMode;
  initiallyOverridden: boolean;
  keyConfigured: boolean;
}) {
  const t = useTranslations("settings.engine");
  const tMode = useTranslations("demo.mode");
  const [mode, setMode] = React.useState<FaheemMode>(initialMode);
  const [overridden, setOverridden] = React.useState(initiallyOverridden);
  const [lastCached, setLastCached] = React.useState<boolean | null>(() =>
    currentLastResponseCached(),
  );
  // publishMode notifies subscribers synchronously; the flag skips our own echo
  const selfPublish = React.useRef(false);

  React.useEffect(() => subscribeLastResponseCached(setLastCached), []);
  React.useEffect(
    () =>
      subscribeMode((m) => {
        if (selfPublish.current) return;
        // external publisher (the ⌘. overlay) always writes the cookie
        setMode(m);
        setOverridden(true);
      }),
    [],
  );

  function broadcast(next: FaheemMode) {
    selfPublish.current = true;
    publishMode(next);
    selfPublish.current = false;
  }

  function pick(next: FaheemMode) {
    setMode(next);
    setOverridden(true);
    setModeCookie(next);
    broadcast(next);
  }

  function reset() {
    clearModeCookie();
    setMode(envDefault);
    setOverridden(false);
    broadcast(envDefault);
  }

  return (
    <section aria-label={t("label")}>
      <h2 className="text-text-secondary text-[0.8125rem] font-bold tracking-[0.04em] uppercase">
        {t("label")}
      </h2>
      <p className="text-text-secondary mt-1 text-[0.8125rem]">
        {t("caption")}
      </p>

      <div
        role="radiogroup"
        aria-label={t("label")}
        className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3"
      >
        {ORDER.map((m, i) => {
          const Icon = ICONS[m];
          const selected = mode === m;
          const needsKey = m !== "cached" && !keyConfigured;
          return (
            <motion.button
              key={m}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => pick(m)}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: i * 0.035, ease: EASE }}
              className={cn(
                "rounded-card focus-visible:ring-accent focus-visible:ring-offset-bg flex flex-col border p-4 text-start transition-colors duration-[var(--duration-fast)] ease-[var(--ease)] outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
                selected
                  ? "border-accent bg-accent-50/60 shadow-[var(--shadow-card)]"
                  : "border-border bg-card hover:border-navy-300",
              )}
            >
              <span className="flex w-full items-center gap-2">
                <Icon
                  className={cn(
                    "size-[18px] shrink-0",
                    selected ? "text-accent" : "text-text-secondary",
                  )}
                  aria-hidden="true"
                />
                <span
                  className={cn(
                    "text-[0.9375rem] font-bold",
                    selected ? "text-navy-900" : "text-navy",
                  )}
                >
                  {tMode(`values.${m}`)}
                </span>
                {m === "auto" && (
                  <Badge variant="mint" size="sm">
                    {t("recommended")}
                  </Badge>
                )}
                <span
                  aria-hidden="true"
                  className={cn(
                    "ms-auto grid size-4 shrink-0 place-items-center rounded-full border-2",
                    selected ? "border-accent" : "border-navy-200",
                  )}
                >
                  {selected && (
                    <span className="bg-accent size-1.5 rounded-full" />
                  )}
                </span>
              </span>
              <span className="text-navy-700 mt-2 text-xs font-semibold">
                {t(`modes.${m}.tagline`)}
              </span>
              <span className="text-text-secondary mt-1 text-xs leading-relaxed">
                {t(`modes.${m}.description`)}
              </span>
              {needsKey && (
                <span className="text-warning-700 mt-2 inline-flex items-center gap-1 text-[0.6875rem] font-semibold">
                  <TriangleAlert
                    className="size-3 shrink-0"
                    aria-hidden="true"
                  />
                  {t("keyHint")}
                </span>
              )}
            </motion.button>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
        <Badge variant={overridden ? "navy" : "neutral"} size="md">
          {t("effective", { mode: tMode(`values.${mode}`) })}
        </Badge>
        <span className="text-text-secondary text-xs">
          {overridden ? t("sourceOverride") : t("sourceEnv")}
        </span>
        {overridden && (
          <button
            type="button"
            onClick={reset}
            className="text-accent-700 hover:text-accent-800 focus-visible:ring-accent focus-visible:ring-offset-bg rounded-btn inline-flex items-center gap-1 text-xs font-semibold outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          >
            <RotateCcw className="size-3 rtl:-scale-x-100" aria-hidden="true" />
            {t("reset")}
          </button>
        )}
        <span className="text-text-secondary ms-auto text-xs">
          {tMode("lastResponse")}{" "}
          <span
            className={cn(
              "font-semibold",
              lastCached === null
                ? "text-text-secondary"
                : lastCached
                  ? "text-accent-700"
                  : "text-warning-700",
            )}
          >
            {lastCached === null
              ? tMode("lastResponseNone")
              : lastCached
                ? tMode("lastResponseCached")
                : tMode("lastResponseLive")}
          </span>
        </span>
      </div>
    </section>
  );
}
