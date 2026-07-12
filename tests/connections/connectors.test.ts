import { describe, expect, it } from "vitest";
import { CONNECTORS } from "@/lib/connectors";

describe("CONNECTORS", () => {
  it("has the exact 15-connector catalog from the design brief", () => {
    expect(CONNECTORS).toHaveLength(15);
  });

  it("has unique ids", () => {
    const ids = CONNECTORS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has 6 connected and 9 available, in that order", () => {
    const statuses = CONNECTORS.map((c) => c.status);
    expect(statuses.filter((s) => s === "connected")).toHaveLength(6);
    expect(statuses.filter((s) => s === "available")).toHaveLength(9);
    // Connected entries all precede Available entries (wizard grid order).
    const firstAvailable = statuses.indexOf("available");
    expect(
      statuses.slice(0, firstAvailable).every((s) => s === "connected"),
    ).toBe(true);
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
