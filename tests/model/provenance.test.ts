/**
 * "No orphan numbers" — invariants over the base-case provenance node graph:
 *  (a) computed inputs resolve to existing nodes, (b) acyclic, (c) every path
 *  terminates at sourced | assumption, (d) formulaIds exist in FORMULAS,
 *  (e) assumptionKeys resolve into Assumptions, (f) sourced docIds exist in
 *  data/corpus/manifest.json — plus spot checks on key nodes.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { BASE_ASSUMPTIONS, RATIONALE, buildModel } from "@/lib/model/compute";
import { FORMULAS } from "@/lib/model/formulas";
import { provenanceViolations } from "@/lib/model/provenance";

const { nodes } = buildModel(BASE_ASSUMPTIONS);

const manifestDocIds = new Set<string>(
  (
    JSON.parse(
      readFileSync(
        path.join(process.cwd(), "data/corpus/manifest.json"),
        "utf-8",
      ),
    ) as { id: string }[]
  ).map((d) => d.id),
);

describe("provenance node graph invariants", () => {
  it("holds all invariants (a)–(f) + real RATIONALE keys", () => {
    const violations = provenanceViolations(
      nodes,
      FORMULAS,
      BASE_ASSUMPTIONS,
      manifestDocIds,
      new Set(Object.keys(RATIONALE)),
    );
    expect(violations).toEqual([]);
  });

  it("has a substantial node count", () => {
    expect(Object.keys(nodes).length).toBeGreaterThan(150);
  });
});

describe("spot checks", () => {
  it("wacc is computed via formula 'wacc' from we/ke/wd/kdAfter", () => {
    const wacc = nodes["wacc"]!;
    expect(wacc.provenance.kind).toBe("computed");
    if (wacc.provenance.kind !== "computed") return;
    expect(wacc.provenance.formulaId).toBe("wacc");
    expect(wacc.provenance.inputs).toEqual(
      expect.arrayContaining(["we", "ke", "wd", "kdAfter"]),
    );
    // percent-number convention: 13.31, not 0.1331
    expect(wacc.value).toBeCloseTo(13.30552835392577, 10);
    expect(wacc.unit).toBe("%");
  });

  it("rf is sourced to market-data-comps p.2", () => {
    const rf = nodes["rf"]!;
    expect(rf.provenance).toEqual({
      kind: "sourced",
      docId: "market-data-comps",
      page: 2,
    });
    expect(rf.value).toBe(4.6);
  });

  it("assumptions.g is an assumption with rationaleKey 'g'", () => {
    const g = nodes["assumptions.g"]!;
    expect(g.provenance).toEqual({
      kind: "assumption",
      assumptionKey: "g",
      rationaleKey: "g",
    });
    expect(g.value).toBe(3);
  });

  it("base.perShare is computed from equity and shares, in SAR", () => {
    const ps = nodes["base.perShare"]!;
    expect(ps.unit).toBe("SAR");
    expect(ps.value).toBeCloseTo(14.3638147029964, 10);
    expect(ps.provenance).toEqual({
      kind: "computed",
      formulaId: "per-share",
      inputs: ["base.equity", "shares"],
    });
  });

  it("shares are sourced to the Q1-26 financial statements", () => {
    const shares = nodes["shares"]!;
    expect(shares.provenance).toEqual({
      kind: "sourced",
      docId: "q1-26-fs",
      page: 24,
    });
  });

  it("ic.hurdle is sourced to the Lunar IC Charter", () => {
    const h = nodes["ic.hurdle"]!;
    expect(h.value).toBe(15);
    expect(h.provenance).toEqual({
      kind: "sourced",
      docId: "lunar-ic-charter",
      page: 3,
    });
  });

  it("skips structurally-empty statement slots but keeps real ones", () => {
    for (const dead of [
      "dna.0",
      "ebit.0",
      "nopat.0",
      "capex.0",
      "dnwc.0",
      "fcff.0",
    ]) {
      expect(nodes[dead]).toBeUndefined();
    }
    for (const alive of [
      "orders.0",
      "orders.7",
      "ebitda.0",
      "fcff.7",
      "gmv.3",
    ]) {
      expect(nodes[alive]).toBeDefined();
    }
  });

  it("skips booleans (shariah.pass has no node)", () => {
    expect(nodes["shariah.pass"]).toBeUndefined();
    expect(nodes["shariah.debtPass"]).toBeUndefined();
  });
});
