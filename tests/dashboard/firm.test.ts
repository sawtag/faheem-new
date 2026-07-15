import { describe, expect, it } from "vitest";
import {
  FIRM,
  icQueue,
  pipelineSummary,
  sectorCapUtilisation,
  sectorCapWarn,
  sectorHeadroomPp,
} from "@/lib/firm";
import { DEALS } from "@/lib/deals";
import manifest from "@/data/corpus/manifest.json";
import type { CorpusDoc, Deal } from "@/lib/types";

const DOCS = new Map((manifest as CorpusDoc[]).map((d) => [d.id, d]));

/** Every sourced figure in firm.json, pairs the value with its citation. */
const SOURCED = [
  FIRM.aumSarBn,
  FIRM.hurdlePct,
  FIRM.singleNameCapPct,
  FIRM.sectorCapPct,
  FIRM.sectorExposurePct,
  ...FIRM.macro,
];

describe("firm.json sources (AGENTS.md rule 5)", () => {
  it("every value cites a doc present in the corpus manifest", () => {
    for (const s of SOURCED) {
      expect(DOCS.has(s.sourceDoc), `unknown doc ${s.sourceDoc}`).toBe(true);
    }
  });

  it("every cited page exists in its doc", () => {
    for (const s of SOURCED) {
      const doc = DOCS.get(s.sourceDoc)!;
      expect(s.page, `${s.sourceDoc} p.${s.page}`).toBeLessThanOrEqual(
        doc.pages,
      );
    }
  });

  it("carries the verified governance figures", () => {
    expect(FIRM.aumSarBn.value).toBe(2.0);
    expect(FIRM.aumSarBn.sourceDoc).toBe("lunar-ic-charter");
    expect(FIRM.hurdlePct.value).toBe(15);
    expect(FIRM.singleNameCapPct.value).toBe(10);
    expect(FIRM.sectorCapPct.value).toBe(10);
    expect(FIRM.sectorExposurePct.value).toBe(8.5);
    expect(FIRM.sectorExposurePct.sourceDoc).toBe("lunar-portfolio");
  });

  it("carries the three verified GASTAT/SAMA macro lines", () => {
    const byKey = new Map(FIRM.macro.map((m) => [m.key, m]));
    expect(byKey.get("realGdp")?.value).toBe(4.5);
    expect(byKey.get("cpi")?.value).toBe(2.0);
    expect(byKey.get("repoRate")?.value).toBe(4.25);
    for (const m of FIRM.macro) expect(m.sourceDoc).toBe("gastat-macro-pack");
  });
});

describe("mandate-headroom derivations", () => {
  it("computes cap utilisation as exposure / cap (0.85)", () => {
    expect(sectorCapUtilisation()).toBeCloseTo(0.85, 5);
  });

  it("computes remaining headroom in percentage points (1.5)", () => {
    expect(sectorHeadroomPp()).toBeCloseTo(1.5, 5);
  });

  it("flags the warn tint at ≥85% of the cap", () => {
    expect(sectorCapWarn()).toBe(true);
    expect(
      sectorCapWarn({
        ...FIRM,
        sectorExposurePct: { ...FIRM.sectorExposurePct, value: 5 },
      }),
    ).toBe(false);
  });
});

describe("pipeline + IC-queue derivations", () => {
  it("counts the live (non-declined) pipeline with a per-stage breakdown", () => {
    const summary = pipelineSummary(DEALS);
    expect(summary.activeCount).toBe(3); // darb, jahez, thara-pay (aqar declined)
    const byStage = Object.fromEntries(
      summary.byStage.map((s) => [s.stage, s.count]),
    );
    expect(byStage).toEqual({ screening: 1, analysis: 1, "ic-review": 1 });
  });

  it("excludes declined deals from the active count", () => {
    const declinedOnly: Deal[] = DEALS.filter((d) => d.stage === "declined");
    expect(pipelineSummary(declinedOnly).activeCount).toBe(0);
  });

  it("surfaces the next IC-review deal (Thara Pay)", () => {
    const queue = icQueue(DEALS);
    expect(queue.count).toBe(1);
    expect(queue.next?.id).toBe("thara-pay");
  });
});
