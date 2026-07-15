import { describe, expect, it } from "vitest";
import { CONNECTORS } from "@/lib/connectors";

describe("CONNECTORS", () => {
  // 15 from the design brief + "Social & Alt-Data" (WS-D roadmap connector) +
  // the 10 internal workplace integrations backing the composer's Internal
  // Sources picker group (lib/sources.ts) — added connected so the picker's
  // "Manage connectors" link lands on a coherent Connections page.
  it("has the 26-connector catalog (16 base + 10 internal workplace integrations)", () => {
    expect(CONNECTORS).toHaveLength(26);
  });

  it("has unique ids", () => {
    const ids = CONNECTORS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has 16 connected and 10 available, connected-first", () => {
    const statuses = CONNECTORS.map((c) => c.status);
    expect(statuses.filter((s) => s === "connected")).toHaveLength(16);
    expect(statuses.filter((s) => s === "available")).toHaveLength(10);
    // Connected entries all precede Available entries (wizard grid order).
    const firstAvailable = statuses.indexOf("available");
    expect(
      statuses.slice(0, firstAvailable).every((s) => s === "connected"),
    ).toBe(true);
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

  it("marketaux is BETA and SAHMK + Alinma are MVP (design-briefs §2.2)", () => {
    const byId = Object.fromEntries(CONNECTORS.map((c) => [c.id, c]));
    expect(byId["marketaux"]?.badge).toBe("beta");
    expect(byId["sahmk"]?.badge).toBe("mvp");
    expect(byId["alinma-open-banking"]?.badge).toBe("mvp");
  });

  it("monogram tiles carry an explicit initial (never derived from the localized name)", () => {
    for (const c of CONNECTORS) {
      if (c.tile.kind === "monogram") {
        expect(c.tile.initial.length).toBeGreaterThan(0);
      }
    }
  });
});
