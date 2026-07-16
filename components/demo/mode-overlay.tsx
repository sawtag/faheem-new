"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";
import type { FaheemMode } from "@/lib/types";
import {
  currentLastResponseCached,
  publishMode,
  setModeCookie,
  subscribeLastResponseCached,
  subscribeMode,
} from "@/lib/demo/mode-bus";
import { cn } from "@/lib/utils";

const MODES: FaheemMode[] = ["live", "auto", "cached"];

/**
 * Stage-only mode overlay (P5a §3.4/T2.1's cookie `faheem_mode` panic switch,
 * finally getting a UI), ⌘./Ctrl+. toggles a tiny bottom-corner panel; no
 * visible affordance otherwise. Shows the effective mode (cookie > env
 * default, `initialMode` is resolved server-side in app/(app)/layout.tsx) and
 * a 3-way switch that writes the cookie directly, the next `/api/chat`
 * fetch picks it up with no reload, since `route.ts` re-reads the cookie
 * header per-request. Also surfaces the last response's cache status via the
 * mode-bus (published from components/chat/stream.ts).
 */
export function ModeOverlay({ initialMode }: { initialMode: FaheemMode }) {
  const t = useTranslations("demo.mode");
  const [open, setOpen] = React.useState(false);
  const [mode, setMode] = React.useState<FaheemMode>(initialMode);
  const [lastCached, setLastCached] = React.useState<boolean | null>(() =>
    currentLastResponseCached(),
  );

  React.useEffect(() => subscribeLastResponseCached(setLastCached), []);
  // stay in sync with /settings (and any other publisher) within the session
  React.useEffect(() => subscribeMode(setMode), []);

  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === ".") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function pick(next: FaheemMode) {
    setMode(next);
    setModeCookie(next);
    publishMode(next);
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.98 }}
          transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
          className="border-border bg-card shadow-modal rounded-card fixed end-4 bottom-4 z-[70] w-64 border p-3"
          role="dialog"
          aria-label={t("title")}
          data-testid="mode-overlay"
        >
          <p className="text-text-secondary text-[0.6875rem] font-bold tracking-[0.04em] uppercase">
            {t("title")}
          </p>
          <div className="mt-2 grid grid-cols-3 gap-1">
            {MODES.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => pick(m)}
                aria-pressed={mode === m}
                className={cn(
                  "rounded-btn px-2 py-1.5 text-xs font-semibold transition-colors duration-[var(--duration-fast)] ease-[var(--ease)]",
                  mode === m
                    ? "bg-navy text-card"
                    : "bg-navy-50 text-navy-700 hover:bg-navy-100",
                )}
              >
                {t(`values.${m}`)}
              </button>
            ))}
          </div>
          <p className="text-text-secondary mt-2.5 text-xs">
            {t("lastResponse")}{" "}
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
                ? t("lastResponseNone")
                : lastCached
                  ? t("lastResponseCached")
                  : t("lastResponseLive")}
            </span>
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
