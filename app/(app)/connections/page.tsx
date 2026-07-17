"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { Plus, Search } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ConnectorRow } from "@/components/connections/connector-row";
import { AddSourceModal } from "@/components/connections/add-source-modal";
import { OAuthModal } from "@/components/connections/oauth-modal";
import { reveal } from "@/components/connections/reveal";
import { useConnectorsState } from "@/components/connections/use-connector-state";
import type { Connector, ConnectorGroup } from "@/lib/connectors";
import type { Lang } from "@/lib/types";

// Sections render in this order: the firm's own systems first, market data
// next, sell-side research last (mirrors the composer picker's group concept).
const GROUP_ORDER: ConnectorGroup[] = ["internal", "external", "research"];

/** Small uppercase divider inside a section (Activated / Available to connect). */
function SubsectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-text-secondary text-[0.75rem] font-bold tracking-[0.06em] uppercase">
      {children}
    </h3>
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

  const q = query.trim().toLowerCase();
  const matches = (c: Connector) =>
    q.length === 0 ||
    c.name[locale].toLowerCase().includes(q) ||
    c.description[locale].toLowerCase().includes(q);

  const sections = GROUP_ORDER.map((group) => {
    const inGroup = connectors.filter((c) => c.group === group);
    const activated = inGroup.filter(
      (c) => c.status === "connected" && matches(c),
    );
    const available = inGroup.filter(
      (c) => c.status === "available" && matches(c),
    );
    return { group, activated, available };
  });

  const noMatches =
    q.length > 0 &&
    sections.every((s) => s.activated.length + s.available.length === 0);

  function handleConnect(id: string) {
    const target = connectors.find((c) => c.id === id) ?? null;
    setOauthTarget(target);
  }

  /** One Activated/Available list: a labeled card of rows, staggered on reveal. */
  function subsection(label: string, items: Connector[]) {
    if (items.length === 0) return null;
    return (
      <div className="flex flex-col gap-3">
        <SubsectionLabel>{label}</SubsectionLabel>
        <Card padding="none" className="divide-border divide-y overflow-hidden">
          {items.map((c, i) => (
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
    );
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
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/onboarding">{t("runSetup")}</Link>
          </Button>
          <Button
            size="sm"
            startIcon={<Plus className="size-4" />}
            onClick={() => setMcpOpen(true)}
          >
            {t("addMcp")}
          </Button>
        </div>
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
        <div className="mt-10 flex flex-col gap-12">
          {sections.map(({ group, activated, available }) => {
            const count = activated.length + available.length;
            if (count === 0) return null;
            return (
              <section key={group} className="flex flex-col gap-5">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-navy text-[1.0625rem] font-bold">
                      {t(`sections.${group}.title`)}
                    </h2>
                    <Badge variant="neutral" size="sm" className="financial">
                      {count}
                    </Badge>
                  </div>
                  <p className="text-text-secondary mt-1 text-[0.8125rem]">
                    {t(`sections.${group}.caption`)}
                  </p>
                </div>
                {subsection(t("activated"), activated)}
                {subsection(t("availableToConnect"), available)}
              </section>
            );
          })}
        </div>
      )}

      <AddSourceModal
        open={mcpOpen}
        onOpenChange={setMcpOpen}
        onAdd={addCustom}
      />
      <OAuthModal
        connector={oauthTarget}
        open={oauthTarget !== null}
        onOpenChange={(open) => {
          if (!open) setOauthTarget(null);
        }}
        onConnected={connect}
        onCustom={() => setMcpOpen(true)}
      />
    </motion.div>
  );
}
