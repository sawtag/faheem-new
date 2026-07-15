"use client";

import * as React from "react";
import { motion } from "motion/react";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { ConnectorWizardCard } from "@/components/connections/connector-wizard-card";
import { McpModal } from "@/components/connections/mcp-modal";
import { OAuthModal } from "@/components/connections/oauth-modal";
import { reveal } from "@/components/connections/reveal";
import type { Connector } from "@/lib/connectors";
import type { useConnectorsState } from "@/components/connections/use-connector-state";

/** Onboarding Step 1, the Connections catalog in wizard dress (design-briefs §2.4). */
export function StepConnect({
  connectorsState,
}: {
  connectorsState: ReturnType<typeof useConnectorsState>;
}) {
  const t = useTranslations("connections");
  const { connectors, connect, addCustom, justConnectedId } = connectorsState;
  const [mcpOpen, setMcpOpen] = React.useState(false);
  const [oauthTarget, setOauthTarget] = React.useState<Connector | null>(null);

  return (
    <div className="grid grid-cols-2 gap-4">
      {connectors.map((c, i) => (
        <motion.div key={c.id} {...reveal(i)}>
          <ConnectorWizardCard
            connector={c}
            justConnected={justConnectedId === c.id}
            onConnect={() => setOauthTarget(c)}
          />
        </motion.div>
      ))}

      <motion.button
        {...reveal(connectors.length)}
        type="button"
        onClick={() => setMcpOpen(true)}
        className="rounded-card border-navy-300 hover:border-accent hover:text-accent text-navy flex flex-col items-center justify-center gap-2 border-[1.5px] border-dashed p-4 transition-colors duration-[var(--duration-fast)] ease-[var(--ease)]"
      >
        <Plus className="size-5" aria-hidden="true" />
        <span className="text-sm font-semibold">{t("addMcp")}</span>
      </motion.button>

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
