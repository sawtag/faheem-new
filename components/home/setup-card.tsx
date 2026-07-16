"use client";

import * as React from "react";
import Link from "next/link";
import { X, Link2 } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const EASE = [0.4, 0, 0.2, 1] as const; // mirrors --ease
const DONE_KEY = "faheem_onboarding_done";
const DISMISSED_KEY = "faheem_setup_dismissed";

/**
 * Slim entry point into the /onboarding takeover, shown on the home hero
 * until the firm finishes setup or dismisses the card. Renders null until
 * mounted (localStorage read) to avoid a hydration mismatch.
 */
export function SetupCard() {
  const t = useTranslations("home.setup");
  const reduce = useReducedMotion();
  const [hidden, setHidden] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHidden(
      localStorage.getItem(DONE_KEY) === "1" ||
        localStorage.getItem(DISMISSED_KEY) === "1",
    );
  }, []);

  if (hidden !== false) return null;

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, "1");
    setHidden(true);
  }

  return (
    // height animates from 0 so the centered hero re-flows smoothly instead
    // of jumping when the card mounts after the localStorage read
    <motion.div
      initial={reduce ? false : { opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      transition={{ duration: 0.25, ease: EASE, delay: 0.1 }}
      className="mx-auto w-full max-w-[640px] overflow-hidden"
    >
      <Card padding="sm" className="mt-5 flex items-center gap-3">
        <div className="bg-accent-50 text-accent rounded-btn grid size-9 shrink-0 place-items-center">
          <Link2 className="size-4.5" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-navy text-sm font-semibold">{t("title")}</p>
          <p className="text-text-secondary text-xs">{t("caption")}</p>
        </div>
        <Button size="sm" asChild className="shrink-0">
          <Link href="/onboarding">{t("cta")}</Link>
        </Button>
        <button
          type="button"
          onClick={dismiss}
          aria-label={t("dismiss")}
          className="text-text-secondary hover:bg-navy-50 hover:text-navy focus-visible:ring-accent focus-visible:ring-offset-card rounded-btn grid size-6 shrink-0 place-items-center transition-colors duration-[var(--duration-fast)] ease-[var(--ease)] outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </Card>
    </motion.div>
  );
}
