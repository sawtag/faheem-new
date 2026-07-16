"use client";

import * as React from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { GlyphBackdrop } from "@/components/ui/glyph-backdrop";
import { Logo } from "@/components/ui/logo";
import { Stepper } from "@/components/ui/stepper";
import { LocaleToggle } from "@/components/shell/locale-toggle";
import { useConnectorsState } from "@/components/connections/use-connector-state";
import { WelcomePanel } from "@/components/connections/onboarding/welcome-panel";
import { StepConnect } from "@/components/connections/onboarding/step-connect";
import { StepAgents } from "@/components/connections/onboarding/step-agents";
import { StepMandate } from "@/components/connections/onboarding/step-mandate";
import { AssemblePanel } from "@/components/connections/onboarding/assemble-panel";
import { CompletePanel } from "@/components/connections/onboarding/complete-panel";
import {
  DEFAULT_MANDATE,
  isValidPercent,
  type MandateState,
} from "@/components/connections/onboarding/mandate-state";
import { AGENTS } from "@/lib/ai/agents";
import { cn } from "@/lib/utils";
import manifest from "@/data/corpus/manifest.json";
import type { AgentId, Lang } from "@/lib/types";

const EASE = [0.4, 0, 0.2, 1] as const; // mirrors --ease
const STEP_COUNT = 3;

// Workspace counts, derived from real data (never hardcoded): the corpus
// manifest and the agent registry are the single sources of truth.
const DOC_COUNT = manifest.length;
const PAGE_COUNT = manifest.reduce((sum, doc) => sum + doc.pages, 0);
const AGENT_COUNT = AGENTS.length;

type Phase = "welcome" | "steps" | "assemble" | "complete";

/**
 * Full-screen day-one takeover (design-briefs §2.4): a single client state
 * machine, welcome -> 3-step stepper -> assemble choreography -> complete.
 * Sits outside the `(app)` group so there is no sidebar; the connectors state
 * is a single fresh-onboarding instance shared across the steps.
 */
export function OnboardingFlow() {
  const t = useTranslations("onboarding");
  const locale = useLocale() as Lang;
  const reduce = useReducedMotion();
  const dir = locale === "ar" ? -1 : 1;

  const [phase, setPhase] = React.useState<Phase>("welcome");
  const [step, setStep] = React.useState(0);
  const [agentToggles, setAgentToggles] = React.useState<
    Partial<Record<AgentId, boolean>>
  >({});
  const [mandate, setMandate] = React.useState<MandateState>(DEFAULT_MANDATE);
  const [forceShowErrors, setForceShowErrors] = React.useState(false);
  const connectorsState = useConnectorsState({ fresh: true });

  const systemsConnected = connectorsState.connectors.filter(
    (c) => c.status === "connected",
  ).length;

  function toggleAgent(id: AgentId) {
    setAgentToggles((prev) => ({ ...prev, [id]: !(prev[id] ?? true) }));
  }

  function handleBack() {
    if (step === 0) {
      setPhase("welcome");
      return;
    }
    setStep((s) => Math.max(0, s - 1));
  }

  function handleContinue() {
    if (step < STEP_COUNT - 1) {
      setStep((s) => s + 1);
      return;
    }
    const valid =
      isValidPercent(mandate.irr) && isValidPercent(mandate.concentration);
    if (!valid) {
      setForceShowErrors(true);
      return;
    }
    setPhase("assemble");
  }

  const fade = {
    initial: reduce ? false : { opacity: 0, y: 4 },
    animate: { opacity: 1, y: 0 },
    exit: reduce ? undefined : { opacity: 0 },
    transition: { duration: 0.25, ease: EASE },
  };

  return (
    <div className="bg-bg relative isolate flex min-h-svh flex-col overflow-hidden">
      <GlyphBackdrop variant="hero" />

      <header className="relative z-10 flex items-center gap-4 px-6 py-5 sm:px-10">
        <Link
          href="/"
          aria-label="Faheem"
          className="focus-visible:ring-accent rounded-btn outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
        >
          <Logo
            variant={locale === "ar" ? "horizontal-bilingual" : "horizontal"}
            size={26}
            animated
          />
        </Link>
        <div className="flex-1" />
        <LocaleToggle />
        <Button variant="ghost" size="sm" asChild>
          <Link href="/">{t("exit")}</Link>
        </Button>
      </header>

      <main className="relative z-10 flex flex-1 flex-col px-6 pb-16">
        <div
          className={cn(
            "mx-auto flex w-full max-w-[960px] flex-1 flex-col",
            // The stepper phases stay top-anchored (they can outgrow the
            // viewport and scroll); welcome / assemble / complete center in the
            // remaining height so they never strand a large empty area below.
            phase === "steps" ? "justify-start" : "justify-center",
          )}
        >
          <AnimatePresence mode="wait" initial={false}>
            {phase === "welcome" && (
              <motion.div key="welcome" {...fade}>
                <WelcomePanel onBegin={() => setPhase("steps")} />
              </motion.div>
            )}

            {phase === "steps" && (
              <motion.div key="steps" {...fade}>
                <div className="flex items-start gap-6 pt-2">
                  <Stepper
                    current={step}
                    steps={[
                      { label: t("step1") },
                      { label: t("step2") },
                      { label: t("step3") },
                    ]}
                    className="flex-1"
                  />
                  <span className="text-text-secondary financial shrink-0 pt-1.5 text-[0.8125rem] font-semibold">
                    {t("stepCount", { n: step + 1 })}
                  </span>
                </div>

                <Card
                  padding="lg"
                  elevated
                  className="mt-8 flex min-h-[480px] flex-col overflow-hidden"
                >
                  <div className="flex-1">
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.div
                        key={step}
                        initial={reduce ? false : { opacity: 0, x: 12 * dir }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={reduce ? undefined : { opacity: 0 }}
                        transition={{ duration: 0.25, ease: EASE }}
                      >
                        {step === 0 && (
                          <StepConnect connectorsState={connectorsState} />
                        )}
                        {step === 1 && (
                          <StepAgents
                            toggles={agentToggles}
                            onToggle={toggleAgent}
                          />
                        )}
                        {step === 2 && (
                          <StepMandate
                            mandate={mandate}
                            onChange={setMandate}
                            forceShowErrors={forceShowErrors}
                          />
                        )}
                      </motion.div>
                    </AnimatePresence>
                  </div>

                  <div className="border-border mt-8 flex items-center justify-between border-t pt-4">
                    <Button variant="ghost" onClick={handleBack}>
                      {t("back")}
                    </Button>
                    <Button onClick={handleContinue}>
                      {step === STEP_COUNT - 1 ? t("finish") : t("continue")}
                    </Button>
                  </div>
                </Card>
              </motion.div>
            )}

            {phase === "assemble" && (
              <motion.div key="assemble" {...fade}>
                <AssemblePanel
                  docs={DOC_COUNT}
                  pages={PAGE_COUNT}
                  agents={AGENT_COUNT}
                  onDone={() => setPhase("complete")}
                />
              </motion.div>
            )}

            {phase === "complete" && (
              <motion.div key="complete" {...fade}>
                <CompletePanel
                  systems={systemsConnected}
                  docs={DOC_COUNT}
                  pages={PAGE_COUNT}
                  agents={AGENT_COUNT}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
