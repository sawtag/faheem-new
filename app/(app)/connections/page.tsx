"use client";

import * as React from "react";
import { motion } from "motion/react";
import { Plus, Search } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ConnectorRow } from "@/components/connections/connector-row";
import { McpModal } from "@/components/connections/mcp-modal";
import { OAuthModal } from "@/components/connections/oauth-modal";
import { reveal } from "@/components/connections/reveal";
import { useConnectorsState } from "@/components/connections/use-connector-state";
import type { Connector } from "@/lib/connectors";
import type { Lang } from "@/lib/types";

function SectionLabel({
  children,
  count,
}: {
  children: React.ReactNode;
  count: number;
}) {
  return (
    <div className="flex items-center gap-2">
      <h2 className="text-text-secondary text-[0.8125rem] font-bold tracking-[0.04em] uppercase">
        {children}
      </h2>
      <Badge variant="neutral" size="sm" className="financial">
        {count}
      </Badge>
    </div>
  );
}

export default function ConnectionsPage() {
  const t = useTranslations("connections");
  const locale = useLocale() as Lang;
  const [query, setQuery] = React.useState("");
  const [mcpOpen, setMcpOpen] = React.useState(false);
  const [oauthTarget, setOauthTarget] = React.useState<Connector | null>(null);

  const { connectors, connect, disconnect, addCustom, justConnectedId } =
    useConnectorsState();

  const connectedAll = connectors.filter((c) => c.status === "connected");
  const availableAll = connectors.filter((c) => c.status === "available");

  const q = query.trim().toLowerCase();
  const matches = (c: Connector) =>
    q.length === 0 ||
    c.name[locale].toLowerCase().includes(q) ||
    c.description[locale].toLowerCase().includes(q);
  const connected = connectedAll.filter(matches);
  const available = availableAll.filter(matches);
  const noMatches =
    q.length > 0 && connected.length === 0 && available.length === 0;

  function handleConnect(id: string) {
    const target = connectors.find((c) => c.id === id) ?? null;
    setOauthTarget(target);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="mx-auto max-w-[960px] px-8 pt-10 pb-16"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-h1 text-navy font-extrabold">{t("title")}</h1>
          <p className="text-text-secondary mt-2 text-[0.9375rem]">
            {t("subtitle")}
          </p>
        </div>
        <Button
          size="sm"
          startIcon={<Plus className="size-4" />}
          onClick={() => setMcpOpen(true)}
          className="shrink-0"
        >
          {t("addMcp")}
        </Button>
      </div>

      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t("searchPlaceholder")}
        startIcon={<Search className="size-4" />}
        className="mt-6 max-w-[360px]"
        aria-label={t("searchPlaceholder")}
      />

      {noMatches ? (
        <div className="mt-12 flex flex-col items-center gap-3 text-center">
          <p className="text-navy text-[0.9375rem] font-semibold">
            {t("searchEmpty.title", { q: query.trim() })}
          </p>
          <p className="text-text-secondary text-[0.8125rem]">
            {t("searchEmpty.caption")}
          </p>
          <Button
            variant="outline"
            size="sm"
            startIcon={<Plus className="size-4" />}
            onClick={() => setMcpOpen(true)}
          >
            {t("addMcp")}
          </Button>
        </div>
      ) : (
        <>
          {connected.length > 0 && (
            <div className="mt-8 flex flex-col gap-3">
              <SectionLabel count={connectedAll.length}>
                {t("connected")}
              </SectionLabel>
              <Card
                padding="none"
                className="divide-border divide-y overflow-hidden"
              >
                {connected.map((c, i) => (
                  <motion.div key={c.id} {...reveal(i)}>
                    <ConnectorRow
                      connector={c}
                      justConnected={justConnectedId === c.id}
                      onConnect={() => handleConnect(c.id)}
                      onDisconnect={() => disconnect(c.id)}
                    />
                  </motion.div>
                ))}
              </Card>
            </div>
          )}

          {available.length > 0 && (
            <div className="mt-12 flex flex-col gap-3">
              <SectionLabel count={availableAll.length}>
                {t("available")}
              </SectionLabel>
              <Card
                padding="none"
                className="divide-border divide-y overflow-hidden"
              >
                {available.map((c, i) => (
                  <motion.div key={c.id} {...reveal(i)}>
                    <ConnectorRow
                      connector={c}
                      justConnected={justConnectedId === c.id}
                      onConnect={() => handleConnect(c.id)}
                      onDisconnect={() => disconnect(c.id)}
                    />
                  </motion.div>
                ))}
              </Card>
            </div>
          )}
        </>
      )}

      <McpModal open={mcpOpen} onOpenChange={setMcpOpen} onAdd={addCustom} />
      <OAuthModal
        connector={oauthTarget}
        open={oauthTarget !== null}
        onOpenChange={(open) => {
          if (!open) setOauthTarget(null);
        }}
        onConnected={connect}
      />
    </motion.div>
  );
}
