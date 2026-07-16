"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { Composer, type ComposerSubmit } from "@/components/chat/composer";
import { GlyphBackdrop } from "@/components/ui/glyph-backdrop";
import { QuickActions } from "@/components/home/quick-actions";
import { SetupCard } from "@/components/home/setup-card";
import type { Lang } from "@/lib/types";

const EASE = [0.4, 0, 0.2, 1] as const; // mirrors --ease
const PLACEHOLDERS = ["p1", "p2", "p3", "p4"] as const;
const ROTATE_MS = 3500;

/**
 * The omnibox home, on camera at every demo beat transition. A serif two-tone
 * greeting, the shared Composer in its hero variant (rotating contextual
 * placeholder, full affordances), quick-action pills that prefill it, and a
 * quiet overnight-activity line under them. Firm context: submitting hands
 * off to `/chat/new`.
 */
export function HomeHero() {
  const t = useTranslations("home");
  const locale = useLocale() as Lang;
  const router = useRouter();
  const reduce = useReducedMotion();

  // rotating placeholder, pauses while the composer is focused
  const [phIndex, setPhIndex] = React.useState(0);
  const [focused, setFocused] = React.useState(false);
  React.useEffect(() => {
    if (focused || reduce) return;
    const id = setInterval(
      () => setPhIndex((i) => (i + 1) % PLACEHOLDERS.length),
      ROTATE_MS,
    );
    return () => clearInterval(id);
  }, [focused, reduce]);

  // quick-action → prefill (nonce lets the same pill re-fire)
  const [prefill, setPrefill] = React.useState<{
    text: string;
    nonce: number;
  }>();
  const nonce = React.useRef(0);
  function pick(prompt: string) {
    nonce.current += 1;
    setPrefill({ text: prompt, nonce: nonce.current });
  }

  function onSubmit(payload: ComposerSubmit) {
    router.push(`/chat/new?q=${encodeURIComponent(payload.question)}`);
  }

  return (
    <div className="relative isolate flex flex-1 flex-col">
      <GlyphBackdrop variant="hero" />
      <div className="relative z-10 mx-auto flex w-full max-w-[830px] flex-1 flex-col justify-center px-6 py-16">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: EASE }}
        >
          <motion.h1
            initial={reduce ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: EASE, delay: 0.05 }}
            className="text-navy text-center font-serif text-[2.25rem] leading-[1.15] font-semibold tracking-[-0.01em] text-balance"
          >
            {t.rich("greeting", {
              name: (chunks) => <span className="text-accent">{chunks}</span>,
            })}
          </motion.h1>

          <div className="mt-8">
            <Composer
              context={{ kind: "firm" }}
              lang={locale}
              variant="hero"
              onSubmit={onSubmit}
              placeholder={t(`placeholders.${PLACEHOLDERS[phIndex]}`)}
              prefill={prefill}
              onFocusChange={setFocused}
            />
          </div>

          <QuickActions onPick={pick} />
          <SetupCard />

          <p className="text-text-secondary mt-10 flex items-center justify-center gap-1.5 text-center text-sm">
            <CheckCircle className="size-3.5 shrink-0" aria-hidden="true" />
            <span>{t("activity.summary")}</span>
            <Link
              href="/audit"
              className="text-text-secondary hover:text-navy focus-visible:ring-accent rounded-btn font-medium underline-offset-2 outline-none hover:underline focus-visible:ring-2"
            >
              {t("activity.link")}
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
