"use client";

import * as React from "react";
import { motion } from "motion/react";
import {
  Calculator,
  FileSearch,
  Filter,
  GitCompare,
  PenLine,
  Scale,
  ShieldAlert,
  ShieldCheck,
  Telescope,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Toggle } from "@/components/ui/toggle";
import { reveal } from "@/components/connections/reveal";
import { cn } from "@/lib/utils";
import { AGENTS } from "@/lib/ai/agents";
import type { AgentId, AgentInfo, Lang } from "@/lib/types";

/** Resolves the fixed set of lucide icon names the agent registry emits (AGENTS.md icon policy). */
const AGENT_ICONS: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  filter: Filter,
  telescope: Telescope,
  "file-search": FileSearch,
  calculator: Calculator,
  "git-compare": GitCompare,
  "shield-alert": ShieldAlert,
  "pen-line": PenLine,
  "shield-check": ShieldCheck,
  scale: Scale,
};

const STAGE1 = AGENTS.filter((a) => a.stage === 1);
// orchestrator routes automatically — it gets a banner on the Agents page
// (T3.6), not a toggle card here (design-briefs §2.4: "9 cards total").
const STAGE2 = AGENTS.filter((a) => a.stage === 2 && a.id !== "orchestrator");
const STAGE3 = AGENTS.filter((a) => a.stage === 3);

function AgentCard({
  agent,
  enabled,
  onToggle,
  index,
}: {
  agent: AgentInfo;
  enabled: boolean;
  onToggle: () => void;
  index: number;
}) {
  const locale = useLocale() as Lang;
  const Icon = AGENT_ICONS[agent.icon];
  const secondaryName = locale === "ar" ? agent.name.en : agent.name.ar;

  return (
    <motion.div
      {...reveal(index)}
      className={cn(
        "rounded-card border-border flex flex-col gap-3 border p-4 transition-opacity duration-[var(--duration-fast)] ease-[var(--ease)]",
        !enabled && "opacity-55",
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className="bg-accent-50 text-accent-700 rounded-btn grid size-9 shrink-0 place-items-center"
          aria-hidden="true"
        >
          {Icon && <Icon className="size-4.5" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-navy truncate text-sm font-semibold">
            {agent.name[locale]}
          </p>
          <bdi className="text-text-secondary block truncate text-xs font-medium">
            {secondaryName}
          </bdi>
        </div>
        <Toggle
          checked={enabled}
          onCheckedChange={onToggle}
          aria-label={agent.name[locale]}
          className="shrink-0"
        />
      </div>
      <bdi className="bg-navy-50 text-navy-700 rounded-pill w-fit px-2 py-0.5 font-mono text-xs">
        @{agent.id}
      </bdi>
    </motion.div>
  );
}

function StageSection({
  label,
  agents,
  toggles,
  onToggle,
}: {
  label: string;
  agents: AgentInfo[];
  toggles: Partial<Record<AgentId, boolean>>;
  onToggle: (id: AgentId) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-text-secondary text-[0.8125rem] font-bold tracking-[0.04em] uppercase">
        {label}
      </h3>
      <div className="grid grid-cols-2 gap-4">
        {agents.map((agent, i) => (
          <AgentCard
            key={agent.id}
            agent={agent}
            enabled={toggles[agent.id] ?? true}
            onToggle={() => onToggle(agent.id)}
            index={i}
          />
        ))}
      </div>
    </div>
  );
}

export function StepAgents({
  toggles,
  onToggle,
}: {
  toggles: Partial<Record<AgentId, boolean>>;
  onToggle: (id: AgentId) => void;
}) {
  const t = useTranslations("onboarding");

  return (
    <div className="flex flex-col gap-8">
      <StageSection
        label={t("stage1")}
        agents={STAGE1}
        toggles={toggles}
        onToggle={onToggle}
      />
      <StageSection
        label={t("stage2")}
        agents={STAGE2}
        toggles={toggles}
        onToggle={onToggle}
      />
      <StageSection
        label={t("stage3")}
        agents={STAGE3}
        toggles={toggles}
        onToggle={onToggle}
      />
    </div>
  );
}
