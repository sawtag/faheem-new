"use client";

import * as React from "react";
import { useLocale } from "next-intl";
import { Network } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Toggle } from "@/components/ui/toggle";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { Lang } from "@/lib/types";
import { AGENT_ICONS } from "./agent-icons";

const DIM =
  "opacity-55 transition-opacity duration-[var(--duration-fast)] ease-[var(--ease)]";

/** In AR the AR name leads (bigger) and EN becomes the secondary line — same boxes, swapped content (design-briefs §3.7). */
function useLeadName(nameEn: string, nameAr: string) {
  const locale = useLocale() as Lang;
  return locale === "ar"
    ? { lead: nameAr, secondary: nameEn }
    : { lead: nameEn, secondary: nameAr };
}

function Chip({ id, hint }: { id: string; hint: string }) {
  return (
    <Tooltip content={hint}>
      <span className="bg-navy-50 text-navy-700 rounded-pill inline-flex px-2.5 py-1 font-mono text-[0.6875rem] font-semibold">
        <bdi dir="ltr">@{id}</bdi>
      </span>
    </Tooltip>
  );
}

export interface AgentCardData {
  id: string;
  icon: string;
  nameEn: string;
  nameAr: string;
  methods: string;
  chip: string;
  mentionHint: string;
}

/** Full-width card pattern shared by the Stage 1 (Screening) and Stage 3 (Faheem IC) cards. */
export function FullWidthAgentCard({
  data,
  footer,
}: {
  data: AgentCardData;
  footer: React.ReactNode;
}) {
  const [on, setOn] = React.useState(true);
  const { lead, secondary } = useLeadName(data.nameEn, data.nameAr);
  const Icon = AGENT_ICONS[data.icon];

  return (
    <Card hover data-testid={`agent-card-${data.id}`} data-dimmed={!on}>
      <div className="flex items-start justify-between gap-4">
        <div className={cn("flex flex-1 items-start gap-3", !on && DIM)}>
          <span
            className={cn(
              "bg-accent-50 text-accent-700 rounded-btn grid size-10 shrink-0 place-items-center",
              !on && "grayscale",
            )}
          >
            {Icon && <Icon className="size-5" aria-hidden="true" />}
          </span>
          <div className="flex flex-col gap-0.5">
            <span className="text-navy text-base font-bold">{lead}</span>
            <span className="text-text-secondary text-[0.8125rem] font-medium">
              {secondary}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Toggle
            checked={on}
            onCheckedChange={setOn}
            aria-label={data.nameEn}
          />
          <div className={cn(!on && DIM)}>
            <Chip id={data.chip} hint={data.mentionHint} />
          </div>
        </div>
      </div>
      <p
        className={cn(
          "text-text-secondary mt-3 text-[0.8125rem] font-medium",
          !on && DIM,
        )}
      >
        {data.methods}
      </p>
      <div className={cn("mt-3", !on && DIM)}>{footer}</div>
    </Card>
  );
}

/** 3-column grid card used for the 7 Stage 2 specialist teams. */
export function SpecialistAgentCard({
  data,
  danger,
  factCheckerLabel,
}: {
  data: AgentCardData;
  danger?: boolean;
  factCheckerLabel?: string;
}) {
  const [on, setOn] = React.useState(true);
  const { lead, secondary } = useLeadName(data.nameEn, data.nameAr);
  const Icon = AGENT_ICONS[data.icon];

  return (
    <Card
      hover
      data-testid={`agent-card-${data.id}`}
      data-dimmed={!on}
      className={cn(danger && "border-danger/40 border-[1.5px]")}
    >
      <div className="flex items-start justify-between">
        <span
          className={cn(
            "bg-accent-50 text-accent-700 rounded-btn grid size-9 shrink-0 place-items-center",
            !on && cn("grayscale", DIM),
          )}
        >
          {Icon && <Icon className="size-4.5" aria-hidden="true" />}
        </span>
        <Toggle checked={on} onCheckedChange={setOn} aria-label={data.nameEn} />
      </div>
      <div className={cn("mt-3 flex flex-col gap-3", !on && DIM)}>
        <div className="flex flex-col gap-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-navy text-[0.9375rem] font-bold">{lead}</span>
            {danger && factCheckerLabel && (
              <Badge variant="danger" size="sm" className="font-bold">
                {factCheckerLabel}
              </Badge>
            )}
          </div>
          <span className="text-text-secondary text-xs font-medium">
            {secondary}
          </span>
        </div>
        <p className="text-text-secondary line-clamp-3 text-[0.8125rem] font-medium">
          {data.methods}
        </p>
        <Chip id={data.chip} hint={data.mentionHint} />
      </div>
    </Card>
  );
}

/** Stage 2's fixture — no toggle, the orchestrator is not optional. */
export function OrchestratorBanner({
  name,
  desc,
  alwaysOn,
}: {
  name: string;
  desc: string;
  alwaysOn: string;
}) {
  return (
    <Card className="border-navy-900 bg-navy text-card">
      <div className="flex items-center gap-4">
        <span className="bg-card/10 rounded-btn grid size-10 shrink-0 place-items-center">
          <Network className="size-5" aria-hidden="true" />
        </span>
        <div className="flex flex-1 flex-col gap-0.5">
          <span className="text-base font-bold">{name}</span>
          <span className="text-card/70 text-[0.8125rem] font-medium">
            {desc}
          </span>
        </div>
        <Badge variant="mint" size="sm">
          {alwaysOn}
        </Badge>
      </div>
    </Card>
  );
}

/**
 * Footer caption shared by the Screening card ("Cites: …") and IC card
 * ("Advisory only …"). `icon` takes a pre-rendered element (not a component
 * reference) — this crosses the server/client boundary from page.tsx, and
 * only elements, not bare function/component values, are serializable there.
 */
export function AgentCardFooter({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <p className="text-navy-700 flex items-center gap-1.5 text-xs font-medium">
      {icon}
      {children}
    </p>
  );
}
