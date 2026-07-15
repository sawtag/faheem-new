import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { CONNECTORS } from "@/lib/connectors";

describe("CONNECTORS", () => {
  // 15 from the design brief + "Social & Alt-Data" (WS-D roadmap connector) +
  // the 11 internal workplace integrations backing the composer's Internal
  // Sources picker group (lib/sources.ts) — connected so the picker's
  // "Manage connectors" link lands on a coherent Connections page.
  it("has the 27-connector catalog (16 base + 11 workplace integrations)", () => {
    expect(CONNECTORS).toHaveLength(27);
  });

  it("has unique ids", () => {
    const ids = CONNECTORS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has 18 connected and 9 available, connected-first", () => {
    const statuses = CONNECTORS.map((c) => c.status);
    expect(statuses.filter((s) => s === "connected")).toHaveLength(18);
    expect(statuses.filter((s) => s === "available")).toHaveLength(9);
    // Connected entries all precede Available entries (wizard grid order).
    const firstAvailable = statuses.indexOf("available");
    expect(statuses.slice(firstAvailable).every((s) => s === "available")).toBe(
      true,
    );
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
