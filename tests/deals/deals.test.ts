import { describe, expect, it } from "vitest";
import { ZodError } from "zod";
import {
  DEALS,
  LEADERS,
  STAGES,
  dealById,
  dealsByOrigin,
  dealsByStage,
  parseDeals,
} from "@/lib/deals";

describe("lib/deals loader", () => {
  it("validates data/deals.json at module load (4 deals, known ids)", () => {
    expect(DEALS).toHaveLength(4);
    expect(DEALS.map((d) => d.id)).toEqual([
      "darb",
      "jahez",
      "thara-pay",
      "aqar",
    ]);
  });

  it("rejects malformed deal payloads", () => {
    expect(() =>
      parseDeals([{ id: "bad", name: { en: "Bad" }, stage: "nope" }]),
    ).toThrow(ZodError);
  });

  it("resolves deals by id", () => {
    expect(dealById("jahez")?.origin).toBe("market-screen");
    expect(dealById("jahez")?.logo).toBe("/logos/jahez.svg");
    expect(dealById("missing")).toBeUndefined();
  });

  it("filters by stage in board order", () => {
    expect(STAGES).toEqual(["screening", "analysis", "ic-review", "declined"]);
    expect(dealsByStage("screening").map((d) => d.id)).toEqual(["darb"]);
    expect(dealsByStage("declined").map((d) => d.id)).toEqual(["aqar"]);
  });

  it("filters by origin (the board's private/public pills)", () => {
    expect(dealsByOrigin(DEALS, "all")).toHaveLength(4);
    expect(dealsByOrigin(DEALS, "market-screen").map((d) => d.id)).toEqual([
      "jahez",
    ]);
    expect(dealsByOrigin(DEALS, "inbound").map((d) => d.id)).toEqual([
      "darb",
      "thara-pay",
      "aqar",
    ]);
  });

  it("darb carries the 6-row scorecard with the concentration flag", () => {
    const rows = dealById("darb")?.screening?.rows ?? [];
    expect(rows).toHaveLength(6);
    expect(rows.filter((r) => r.verdict === "warn")).toHaveLength(1);
    expect(rows.every((r) => r.cite.docId === "lunar-ic-charter")).toBe(true);
  });
});

describe("lib/deals leadership pack", () => {
  it("validates the 16 authored bios across both groups", () => {
    expect(LEADERS).toHaveLength(16);
    expect(LEADERS.filter((l) => l.group === "board")).toHaveLength(7);
    expect(LEADERS.filter((l) => l.group === "executive")).toHaveLength(9);
  });

  it("every bio carries an annual-report source and a valid pack page", () => {
    for (const leader of LEADERS) {
      expect(leader.source).toMatch(/FY 2024 Annual Report, p\.\d+/);
      expect(leader.packPage).toBeGreaterThanOrEqual(2);
      expect(leader.packPage).toBeLessThanOrEqual(10);
    }
  });
});
