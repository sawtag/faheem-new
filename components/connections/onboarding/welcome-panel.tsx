"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { Bot, Link2, Scale } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const EASE = [0.4, 0, 0.2, 1] as const; // mirrors --ease

// Three mini preview cards, one per setup step (design-briefs §2.4 welcome).
const PREVIEWS = [
  { key: "Connect", Icon: Link2 },
  { key: "Agents", Icon: Bot },
  { key: "Mandate", Icon: Scale },
] as const;

/** Day-one welcome panel: the serif two-tone greeting that opens the takeover,
 *  three step previews, and the Begin / Skip actions (design-briefs §2.4). */
export function WelcomePanel({ onBegin }: { onBegin: () => void }) {
  const t = useTranslations("onboarding");
  const reduce = useReducedMotion();

  const rise = (delay: number) => ({
    initial: reduce ? false : { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.25, ease: EASE, delay },
  });

  return (
    <div className="mx-auto flex max-w-[720px] flex-col items-center text-center">
      <motion.p
        {...rise(0)}
        className="text-accent text-xs font-bold tracking-[0.14em] uppercase"
      >
        {t("welcome.eyebrow")}
      </motion.p>

      <motion.h1
        {...rise(0.05)}
        className="text-navy mt-4 font-serif text-[2.375rem] leading-[1.12] font-semibold tracking-[-0.01em] text-balance"
      >
        {t.rich("welcome.title", {
          name: (chunks) => <span className="text-accent">{chunks}</span>,
        })}
      </motion.h1>

      <motion.p
        {...rise(0.1)}
        className="text-text-secondary mt-4 max-w-[560px] text-[0.9375rem] leading-relaxed text-balance"
      >
        {t("welcome.subtitle")}
      </motion.p>

      <div className="mt-9 grid w-full grid-cols-1 gap-4 sm:grid-cols-3">
        {PREVIEWS.map(({ key, Icon }, i) => (
          <motion.div
            key={key}
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: EASE, delay: 0.18 + i * 0.04 }}
          >
            <Card className="flex h-full flex-col items-start gap-3 p-5 text-start">
              <span
                className="bg-accent-50 text-accent-700 rounded-btn grid size-10 place-items-center"
                aria-hidden="true"
              >
                <Icon className="size-5" />
              </span>
              <div>
                <p className="text-navy text-sm font-bold">
                  {t(`welcome.card${key}`)}
                </p>
                <p className="text-text-secondary mt-1 text-[0.8125rem] leading-snug">
                  {t(`welcome.card${key}Desc`)}
                </p>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      <motion.div
        {...rise(0.3)}
        className="mt-10 flex items-center justify-center gap-3"
      >
        <Button onClick={onBegin}>{t("welcome.begin")}</Button>
        <Button variant="ghost" asChild>
          <Link href="/">{t("welcome.skip")}</Link>
        </Button>
      </motion.div>
    </div>
  );
}
