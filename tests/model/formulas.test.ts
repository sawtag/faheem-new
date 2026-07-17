/** Registry integrity for the FormulaDef registry (lib/model/formulas). */
import { describe, expect, it } from "vitest";
import { BASE_ASSUMPTIONS, buildModel } from "@/lib/model/compute";
import { FORMULAS } from "@/lib/model/formulas";

describe("FORMULAS registry", () => {
  it("ids are unique and equal to their record key", () => {
    const ids = Object.values(FORMULAS).map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const [key, def] of Object.entries(FORMULAS)) {
      expect(def.id).toBe(key);
    }
  });

  it("katex strings are non-empty", () => {
    for (const def of Object.values(FORMULAS)) {
      expect(def.katex.trim().length, def.id).toBeGreaterThan(0);
    }
  });

  it("explainerKey follows the model.formulas.<id> contract", () => {
    for (const def of Object.values(FORMULAS)) {
      expect(def.explainerKey).toBe(`model.formulas.${def.id}`);
    }
  });

  it("names the beta comp-set peers by ticker, matching the xlsx and the UI", () => {
    const formula = FORMULAS["beta-comp-set"]!.katex;
    expect(formula).toContain(String.raw`\text{DASH}`);
    expect(formula).toContain(String.raw`\text{DHER}`);
  });

  it("every formulaId referenced in the base node graph exists", () => {
    const { nodes } = buildModel(BASE_ASSUMPTIONS);
    const referenced = new Set<string>();
    for (const node of Object.values(nodes)) {
      if (node.provenance.kind === "computed") {
        referenced.add(node.provenance.formulaId);
      }
    }
    expect(referenced.size).toBeGreaterThan(0);
    for (const id of referenced) {
      expect(
        FORMULAS[id],
        `formulaId "${id}" missing from FORMULAS`,
      ).toBeDefined();
    }
  });
});
