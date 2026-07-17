"use client";

import * as React from "react";
import {
  CONNECTORS,
  PROVISIONED_IDS,
  type Connector,
  type ConnectorGroup,
  type ConnectorSourceType,
} from "@/lib/connectors";
import type { Localized } from "@/lib/types";

/**
 * Fresh-onboarding overrides: every connector starts "available" except the
 * ones provisioned with the Faheem workspace, which start "connected". Pure
 * so it is unit-testable without mounting the hook.
 */
export function freshOverrides(): Record<string, "connected" | "available"> {
  const provisioned = new Set<string>(PROVISIONED_IDS);
  return Object.fromEntries(
    CONNECTORS.map((c) => [
      c.id,
      provisioned.has(c.id) ? "connected" : "available",
    ]),
  );
}

/**
 * Display metadata for user-created connectors, keyed by the add-source
 * modal's type. Descriptions are data-shaped Localized pairs, the same
 * pattern as the static catalog in lib/connectors.ts. A custom feed is
 * market data, so it lands in the external group; everything else is a
 * firm-internal system.
 */
const CUSTOM_META: Record<
  ConnectorSourceType,
  { description: Localized; group: ConnectorGroup }
> = {
  mcp: {
    description: { en: "Custom MCP connector", ar: "موصل MCP مخصص" },
    group: "internal",
  },
  api: {
    description: { en: "Custom data API", ar: "واجهة بيانات مخصصة" },
    group: "internal",
  },
  files: {
    description: {
      en: "Documents & folders indexed for search",
      ar: "مستندات ومجلدات مفهرسة للبحث",
    },
    group: "internal",
  },
  app: {
    description: { en: "Connected workplace app", ar: "تطبيق عمل مرتبط" },
    group: "internal",
  },
  feed: {
    description: {
      en: "Custom news & data feed",
      ar: "تغذية أخبار وبيانات مخصصة",
    },
    group: "external",
  },
};

/**
 * Cosmetic connector state shared by the Connections page and the onboarding
 * Connect step (AGENTS.md rule 10, connectors are fake, no persistence
 * beyond component state). Handles the fake-OAuth "connect", the symmetric
 * "disconnect" (Connections page row menu), and custom connectors added
 * through the add-source modal (typed: MCP, API, Files, App, Feed). Pass
 * `{ fresh: true }` for the onboarding flow, whose Connect step starts from
 * a clean slate rather than the Connections page's real-world defaults.
 */
export function useConnectorsState({
  fresh = false,
}: {
  fresh?: boolean;
} = {}) {
  const [overrides, setOverrides] = React.useState<
    Record<string, "connected" | "available">
  >(() => (fresh ? freshOverrides() : {}));
  const [custom, setCustom] = React.useState<Connector[]>([]);
  const [justConnectedId, setJustConnectedId] = React.useState<string | null>(
    null,
  );

  const connectors = React.useMemo<Connector[]>(() => {
    const base = CONNECTORS.map((c) =>
      overrides[c.id] ? { ...c, status: overrides[c.id]! } : c,
    );
    return [...base, ...custom];
  }, [overrides, custom]);

  const flash = React.useCallback((id: string) => {
    setJustConnectedId(id);
    // mint wash fades over --duration-slow (400ms); clear a beat after.
    setTimeout(() => {
      setJustConnectedId((current) => (current === id ? null : current));
    }, 500);
  }, []);

  const connect = React.useCallback(
    (id: string) => {
      setOverrides((o) => ({ ...o, [id]: "connected" }));
      flash(id);
    },
    [flash],
  );

  const disconnect = React.useCallback((id: string) => {
    setOverrides((o) => ({ ...o, [id]: "available" }));
  }, []);

  const addCustom = React.useCallback(
    (name: string, sourceType: ConnectorSourceType = "mcp") => {
      const id = `custom-${Date.now()}`;
      const localized = { en: name, ar: name };
      const entry: Connector = {
        id,
        name: localized,
        description: CUSTOM_META[sourceType].description,
        tooltip: localized,
        group: CUSTOM_META[sourceType].group,
        status: "connected",
        sourceType,
        tile: { kind: "monogram", initial: name.trim().charAt(0) || "?" },
      };
      setCustom((prev) => [...prev, entry]);
      flash(id);
      return id;
    },
    [flash],
  );

  return { connectors, connect, disconnect, addCustom, justConnectedId };
}
