"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Stepper } from "@/components/ui/stepper";
import { cn } from "@/lib/utils";
import { useConnectorsState } from "@/components/connections/use-connector-state";
import { StepConnect } from "@/components/connections/onboarding/step-connect";
import { StepAgents } from "@/components/connections/onboarding/step-agents";
import { StepMandate } from "@/components/connections/onboarding/step-mandate";
import { CompletePanel } from "@/components/connections/onboarding/complete-panel";
import {
  DEFAULT_MANDATE,
  isValidPercent,
  type MandateState,
} from "@/components/connections/onboarding/mandate-state";
import type { AgentId, Lang } from "@/lib/types";

const EASE = [0.4, 0, 0.2, 1] as const; // mirrors --ease
const STEP_COUNT = 3;

export function OnboardingStepper() {
  const t = useTranslations("onboarding");
  const locale = useLocale() as Lang;
  const dir = locale === "ar" ? -1 : 1;

  const [step, setStep] = React.useState(0);
  const [completed, setCompleted] = React.useState(false);
  const [agentToggles, setAgentToggles] = React.useState<
    Partial<Record<AgentId, boolean>>
  >({});
  const [mandate, setMandate] = React.useState<MandateState>(DEFAULT_MANDATE);
  const [forceShowErrors, setForceShowErrors] = React.useState(false);
  const connectorsState = useConnectorsState();

  function toggleAgent(id: AgentId) {
    setAgentToggles((prev) => ({ ...prev, [id]: !(prev[id] ?? true) }));
  }

  function handleBack() {
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
    setCompleted(true);
  }

  return (
    <div>
      <header>
        <h2 className="text-h2 text-navy font-extrabold">{t("title")}</h2>
        <p className="text-text-secondary mt-2 text-[0.9375rem]">
          {t("subtitle")}
        </p>
      </header>

      <div className="mt-6 flex items-start gap-6">
        <Stepper
          current={completed ? STEP_COUNT : step}
          steps={[
            { label: t("step1") },
            { label: t("step2") },
            { label: t("step3") },
          ]}
          className="flex-1"
        />
        {!completed && (
          <span className="text-text-secondary financial shrink-0 pt-1.5 text-[0.8125rem] font-semibold">
            {t("stepCount", { n: step + 1 })}
          </span>
        )}
      </div>

      <Card
        padding="lg"
        elevated
        className="mt-8 flex min-h-[480px] flex-col overflow-hidden"
      >
        <div className="flex-1">
          <AnimatePresence mode="wait" initial={false}>
            {completed ? (
              <motion.div
                key="complete"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.25, ease: EASE }}
                className="h-full"
              >
                <CompletePanel mandate={mandate} />
              </motion.div>
            ) : (
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 12 * dir }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25, ease: EASE }}
              >
                {step === 0 && (
                  <StepConnect connectorsState={connectorsState} />
                )}
                {step === 1 && (
                  <StepAgents toggles={agentToggles} onToggle={toggleAgent} />
                )}
                {step === 2 && (
                  <StepMandate
                    mandate={mandate}
                    onChange={setMandate}
                    forceShowErrors={forceShowErrors}
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {!completed && (
          <div
            className={cn(
              "border-border mt-8 flex items-center border-t pt-4",
              step === 0 ? "justify-end" : "justify-between",
            )}
          >
            {step > 0 && (
              <Button variant="ghost" onClick={handleBack}>
                {t("back")}
              </Button>
            )}
            <Button onClick={handleContinue}>
              {step === STEP_COUNT - 1 ? t("finish") : t("continue")}
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
