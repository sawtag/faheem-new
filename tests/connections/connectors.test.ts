import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { CONNECTORS, PROVISIONED_IDS } from "@/lib/connectors";

const EM = "—";

describe("CONNECTORS", () => {
  // 15 from the design brief + "Social & Alt-Data" (WS-D roadmap connector) +
  // the 11 internal workplace integrations backing the composer's Internal
  // Sources picker group (lib/sources.ts) + the 12 broker research connectors
  // mirroring the verified broker roster in lib/sources.ts (Saudi houses
  // first, then GCC/regional), connected/available so the picker's "Manage
  // connectors" link lands on a coherent Connections page.
  it("has the 39-connector catalog (27 base + 12 research)", () => {
    expect(CONNECTORS).toHaveLength(39);
  });

  it("has unique ids", () => {
    const ids = CONNECTORS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has 18 connected and 21 available", () => {
    const statuses = CONNECTORS.map((c) => c.status);
    expect(statuses.filter((s) => s === "connected")).toHaveLength(18);
    expect(statuses.filter((s) => s === "available")).toHaveLength(21);
  });

  it("has a research group with the 12 broker connectors, Saudi-first, GCC/regional last", () => {
    const researchIds = CONNECTORS.filter((c) => c.group === "research").map(
      (c) => c.id,
    );
    expect(researchIds).toEqual([
      "snb-capital",
      "alrajhi-capital",
      "jadwa",
      "riyad-capital",
      "alinma-capital",
      "aljazira-capital",
      "gib-capital",
      "efg-hermes",
      "arqaam-capital",
      "sico",
      "kamco-invest",
      "markaz",
    ]);
  });

  it("gives every research connector the ingestion framing, never API/feed", () => {
    for (const c of CONNECTORS.filter((c) => c.group === "research")) {
      expect(c.status, c.id).toBe("available");
      for (const s of [
        c.description.en,
        c.description.ar,
        c.tooltip.en,
        c.tooltip.ar,
      ]) {
        expect(s, `${c.id}: ${s}`).not.toMatch(/\bAPI\b/i);
        expect(s.toLowerCase(), `${c.id}: ${s}`).not.toContain("feed");
      }
    }
  });

  it("PROVISIONED_IDS all exist in CONNECTORS", () => {
    const ids = new Set(CONNECTORS.map((c) => c.id));
    for (const id of PROVISIONED_IDS) {
      expect(ids.has(id), id).toBe(true);
    }
  });

  it("has no U+2014 em-dash in any connector string", () => {
    for (const c of CONNECTORS) {
      for (const s of [
        c.name.en,
        c.name.ar,
        c.description.en,
        c.description.ar,
        c.tooltip.en,
        c.tooltip.ar,
      ]) {
        expect(s.includes(EM), `${c.id}: ${s}`).toBe(false);
      }
    }
  });

  // Standing user rule: within the external group's flat render (the onboarding
  // Connect step groups by `group`, not status), Saudi/GCC connectors precede
  // international ones. marketaux (international, connected) therefore sorts
  // after the Saudi/local external connectors despite its connected status.
  it("orders the external group Saudi/GCC first, internationals last", () => {
    const externalIds = CONNECTORS.filter((c) => c.group === "external").map(
      (c) => c.id,
    );
    expect(externalIds).toEqual([
      "saudi-exchange",
      "argaam",
      "sahmk",
      "gastat",
      "od-data-gov-sa",
      "rega",
      "alinma-open-banking",
      "marketaux",
      "bloomberg",
      "pitchbook",
      "capital-iq",
      "social-alt-data",
    ]);
  });

  // Standing user rule: Saudi/local connectors sort above international ones
  // within each status section.
  it("leads each status section with the Saudi/local connectors", () => {
    const ids = CONNECTORS.map((c) => c.id);
    expect(ids.slice(0, 7)).toEqual([
      "saudi-exchange",
      "argaam",
      "sahmk",
      "gastat",
      "lunar-data-room",
      "templates",
      "shared-folder",
    ]);
    const firstAvailable = CONNECTORS.findIndex(
      (c) => c.status === "available",
    );
    expect(ids.slice(firstAvailable, firstAvailable + 3)).toEqual([
      "od-data-gov-sa",
      "rega",
      "alinma-open-banking",
    ]);
  });

  it("SAHMK is connected (the composer picker treats it as live)", () => {
    const sahmk = CONNECTORS.find((c) => c.id === "sahmk");
    expect(sahmk?.status).toBe("connected");
    expect(sahmk?.badge).toBeUndefined();
  });

  it("Social & Alt-Data is a roadmap (MVP-badged, available) connector, never auto-connected", () => {
    const byId = Object.fromEntries(CONNECTORS.map((c) => [c.id, c]));
    expect(byId["social-alt-data"]?.status).toBe("available");
    expect(byId["social-alt-data"]?.badge).toBe("mvp");
  });

  it("every connector has non-empty en/ar name, description and tooltip", () => {
    for (const c of CONNECTORS) {
      expect(c.name.en.length).toBeGreaterThan(0);
      expect(c.name.ar.length).toBeGreaterThan(0);
      expect(c.description.en.length).toBeGreaterThan(0);
      expect(c.description.ar.length).toBeGreaterThan(0);
      expect(c.tooltip.en.length).toBeGreaterThan(0);
      expect(c.tooltip.ar.length).toBeGreaterThan(0);
    }
  });

  it("marketaux is BETA and Alinma is MVP (design-briefs §2.2)", () => {
    const byId = Object.fromEntries(CONNECTORS.map((c) => [c.id, c]));
    expect(byId["marketaux"]?.badge).toBe("beta");
    expect(byId["alinma-open-banking"]?.badge).toBe("mvp");
  });

  it("monogram tiles carry an explicit initial (never derived from the localized name)", () => {
    for (const c of CONNECTORS) {
      if (c.tile.kind === "monogram") {
        expect(c.tile.initial.length).toBeGreaterThan(0);
      }
    }
  });

  it("points every image tile at an existing vendored file", () => {
    for (const c of CONNECTORS) {
      if (c.tile.kind !== "image") continue;
      expect(c.tile.src, c.id).toMatch(/^\/logos\/connectors\//);
      expect(
        existsSync(path.join(process.cwd(), "public", c.tile.src)),
        `${c.id}: ${c.tile.src} missing from public/`,
      ).toBe(true);
    }
  });
});
