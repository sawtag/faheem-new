import { FileText, ShieldCheck } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { GlyphBackdrop } from "@/components/ui/glyph-backdrop";
import { AGENTS, getAgent } from "@/lib/ai/agents";
import type { AgentInfo } from "@/lib/types";
import {
  AgentCardFooter,
  FullWidthAgentCard,
  OrchestratorBanner,
  SpecialistAgentCard,
  type AgentCardData,
} from "./agent-card";
import { GateMarker, StageHeader } from "./stage-parts";

/**
 * The on-product version of pitch-deck slide 9 (design-briefs §3.2) — stage-
 * grouped agent cards, orchestrator banner, human-gate markers. Static
 * registry import, server-rendered; only the toggle/dim interaction is
 * client-side (agent-card.tsx).
 */
export default async function AgentsPage() {
  const t = await getTranslations("agents");
  const tRoot = await getTranslations();
  const mentionHint = t("mentionHint");

  function cardData(agent: AgentInfo): AgentCardData {
    return {
      id: agent.id,
      icon: agent.icon,
      nameEn: agent.name.en,
      nameAr: agent.name.ar,
      methods: tRoot(agent.methodsKey),
      chip: agent.id,
      mentionHint,
    };
  }

  const screening = cardData(getAgent("screening"));
  const ic = cardData(getAgent("ic"));
  const specialists = AGENTS.filter(
    (a) => a.stage === 2 && a.id !== "orchestrator",
  ).map(cardData);

  return (
    <main className="mx-auto max-w-[1040px] px-8 pt-10 pb-16">
      <header className="relative isolate -mx-8 -mt-10 mb-8 px-8 pt-10 pb-6">
        <GlyphBackdrop variant="panel" />
        <h1 className="text-h1 text-navy relative z-10 font-extrabold">
          {t("title")}
        </h1>
        <p className="text-text-secondary relative z-10 mt-2 text-[0.9375rem]">
          {t("subtitle")}
        </p>
      </header>

      <section>
        <StageHeader n={1} name={t("stage1")} />
        <FullWidthAgentCard
          data={screening}
          footer={
            <AgentCardFooter
              icon={
                <FileText className="size-3.5 shrink-0" aria-hidden="true" />
              }
            >
              {t("citesCharter")}
            </AgentCardFooter>
          }
        />
      </section>

      <GateMarker label={t("gate1")} />

      <section>
        <StageHeader n={2} name={t("stage2")} caption={t("stage2Caption")} />
        <OrchestratorBanner
          name={t("orchestrator")}
          desc={t("orchestratorDesc")}
          alwaysOn={t("alwaysOn")}
        />
        <div className="mt-4 grid grid-cols-3 gap-4">
          {specialists.map((agent) => (
            <SpecialistAgentCard
              key={agent.id}
              data={agent}
              danger={agent.id === "compliance"}
              factCheckerLabel={t("factChecker")}
            />
          ))}
        </div>
      </section>

      <GateMarker label={t("gate2")} />

      <section>
        <StageHeader n={3} name={t("stage3")} />
        <FullWidthAgentCard
          data={ic}
          footer={
            <AgentCardFooter
              icon={
                <ShieldCheck className="size-3.5 shrink-0" aria-hidden="true" />
              }
            >
              {t("advisoryOnly")}
            </AgentCardFooter>
          }
        />
      </section>

      <GateMarker label={t("gate3")} />
    </main>
  );
}
