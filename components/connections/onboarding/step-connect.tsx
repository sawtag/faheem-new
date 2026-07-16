"use client";

import * as React from "react";
import { animate, motion, useReducedMotion } from "motion/react";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ConnectorWizardCard } from "@/components/connections/connector-wizard-card";
import { McpModal } from "@/components/connections/mcp-modal";
import { OAuthModal } from "@/components/connections/oauth-modal";
import { reveal } from "@/components/connections/reveal";
import {
  PROVISIONED_IDS,
  type Connector,
  type ConnectorGroup,
} from "@/lib/connectors";
import type { useConnectorsState } from "@/components/connections/use-connector-state";

const EASE = [0.4, 0, 0.2, 1] as const; // mirrors --ease
const PROVISIONED = new Set<string>(PROVISIONED_IDS);
// Sections render in this order, external market data first, the firm's own
// internal systems last (design-briefs §2.4 onboarding Connect step).
const GROUP_ORDER: ConnectorGroup[] = ["external", "research", "internal"];
// One card per ~60ms so the "Connect recommended" cascade reads as a sweep.
const CASCADE_STEP_MS = 60;

/** Onboarding Step 1: the fresh-workspace Connect step, grouped into external /
 *  research / internal sections with a live counter and a "connect recommended"
 *  cascade (the star of the day-one takeover, design-briefs §2.4). */
export function StepConnect({
  connectorsState,
}: {
  connectorsState: ReturnType<typeof useConnectorsState>;
}) {
  const t = useTranslations("connections");
  const tOnb = useTranslations("onboarding");
  const reduce = useReducedMotion();
  const { connectors, connect, addCustom, justConnectedId } = connectorsState;
  const [mcpOpen, setMcpOpen] = React.useState(false);
  const [oauthTarget, setOauthTarget] = React.useState<Connector | null>(null);
  const [cascading, setCascading] = React.useState(false);
  const timersRef = React.useRef<number[]>([]);

  React.useEffect(
    () => () => timersRef.current.forEach((id) => window.clearTimeout(id)),
    [],
  );

  const total = connectors.length;
  const connectedCount = connectors.filter(
    (c) => c.status === "connected",
  ).length;
  const allConnected = connectedCount === total;

  // Counter that climbs from its CURRENT value to the new count (not from 0),
  // so it reads as a smooth tally as the cascade connects each system. Kept as
  // a plain number so it can render inside the ICU counter string (this
  // next-intl build does not accept React nodes as placeholder values).
  const [animatedCount, setAnimatedCount] = React.useState(connectedCount);
  const displayRef = React.useRef(connectedCount);
  React.useEffect(() => {
    if (reduce) return;
    const controls = animate(displayRef.current, connectedCount, {
      duration: 0.4,
      ease: EASE,
      onUpdate: (v) => {
        displayRef.current = v;
        setAnimatedCount(Math.round(v));
      },
    });
    return () => controls.stop();
  }, [connectedCount, reduce]);
  const displayCount = reduce ? connectedCount : animatedCount;

  function connectRecommended() {
    const remaining = connectors
      .filter((c) => c.status === "available")
      .map((c) => c.id);
    if (remaining.length === 0) return;
    if (reduce) {
      remaining.forEach((id) => connect(id));
      return;
    }
    setCascading(true);
    remaining.forEach((id, i) => {
      const timer = window.setTimeout(() => {
        connect(id);
        if (i === remaining.length - 1) setCascading(false);
      }, i * CASCADE_STEP_MS);
      timersRef.current.push(timer);
    });
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-navy financial text-[0.9375rem] font-semibold">
          {tOnb("connectedCount", { connected: displayCount, total })}
        </p>
        {!allConnected && (
          <Button
            variant="outline"
            size="sm"
            onClick={connectRecommended}
            disabled={cascading}
          >
            {tOnb("connectRecommended")}
          </Button>
        )}
      </div>

      {GROUP_ORDER.map((group) => {
        const items = connectors.filter((c) => c.group === group);
        if (items.length === 0) return null;
        const groupConnected = items.filter(
          (c) => c.status === "connected",
        ).length;
        const isInternal = group === "internal";

        return (
          <section key={group} className="flex flex-col gap-3">
            <div className="flex items-baseline gap-2.5">
              <h3 className="text-navy text-[0.9375rem] font-bold">
                {tOnb(`groups.${group}`)}
              </h3>
              <span className="bg-navy-50 text-navy-700 rounded-pill financial px-2 py-0.5 text-xs font-bold">
                {groupConnected}/{items.length}
              </span>
            </div>
            <p className="text-text-secondary -mt-1 text-[0.8125rem]">
              {tOnb(`groups.${group}Caption`)}
            </p>
            <div className="grid grid-cols-2 gap-4">
              {items.map((c, i) => (
                <motion.div key={c.id} {...reveal(i)}>
                  <ConnectorWizardCard
                    connector={c}
                    justConnected={justConnectedId === c.id}
                    onConnect={() => setOauthTarget(c)}
                    provisioned={PROVISIONED.has(c.id)}
                  />
                </motion.div>
              ))}

              {isInternal && (
                <motion.button
                  {...reveal(items.length)}
                  type="button"
                  onClick={() => setMcpOpen(true)}
                  className="rounded-card border-navy-300 hover:border-accent hover:text-accent text-navy flex flex-col items-center justify-center gap-2 border-[1.5px] border-dashed p-4 transition-colors duration-[var(--duration-fast)] ease-[var(--ease)]"
                >
                  <Plus className="size-5" aria-hidden="true" />
                  <span className="text-sm font-semibold">{t("addMcp")}</span>
                </motion.button>
              )}
            </div>
          </section>
        );
      })}

      <McpModal open={mcpOpen} onOpenChange={setMcpOpen} onAdd={addCustom} />
      <OAuthModal
        connector={oauthTarget}
        open={oauthTarget !== null}
        onOpenChange={(open) => {
          if (!open) setOauthTarget(null);
        }}
        onConnected={connect}
      />
    </div>
  );
}
