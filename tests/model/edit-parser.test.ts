import { describe, expect, it } from "vitest";
import { BASE_ASSUMPTIONS } from "@/lib/model/compute";
import {
  PROB_KEYS,
  normalizeDigits,
  parseEdit,
  rebalanceProbabilities,
  validateEdit,
  whitelistKeys,
} from "@/lib/model/edit-parser";
import type { Assumptions } from "@/lib/model/types";

/**
 * WS-C acceptance, the scripted edit parser. Everything here runs pure and
 * OFFLINE: no SDK, no network, no fs. The whitelist is asserted against
 * BASE_ASSUMPTIONS (its single source of truth) so the two can never drift.
 */

// ─────────────────────────── whitelist + bounds ───────────────────────────

describe("whitelist", () => {
  it("covers exactly the BASE_ASSUMPTIONS shape, every scalar key + every array index", () => {
    const expected: string[] = [];
    for (const [key, value] of Object.entries(BASE_ASSUMPTIONS)) {
      if (Array.isArray(value)) {
        value.forEach((_, i) => expected.push(`${key}.${i}`));
      } else {
        expected.push(key);
      }
    }
    expect(new Set(whitelistKeys())).toEqual(new Set(expected));
  });

  it("accepts every legal assumption key at its current base value", () => {
    for (const key of whitelistKeys()) {
      const dot = key.indexOf(".");
      const base =
        dot === -1
          ? (BASE_ASSUMPTIONS as unknown as Record<string, number>)[key]
          : (BASE_ASSUMPTIONS as unknown as Record<string, number[]>)[
              key.slice(0, dot)
            ]![Number(key.slice(dot + 1))]!;
      const v = validateEdit(key, base as number);
      expect(v, key).not.toBeNull();
      expect(v!.value).toBe(base);
    }
  });

  it("rejects sourced actuals, unknown keys, and out-of-bounds indices", () => {
    for (const bad of [
      "price",
      "fy25.gmv",
      "fy25.net_revenue",
      "shares",
      "wacc",
      "orders.2",
      "netRev.4",
      "ordersGrowth.5", // index out of forecast window
      "ordersGrowth.-1",
      "ordersGrowth.1.5",
      "riskWeights.6",
      "", // empty
      "assumptions.g", // node-key prefix is NOT an assumption key
    ]) {
      expect(validateEdit(bad, 0.1), bad).toBeNull();
    }
  });

  it("rejects non-finite values", () => {
    expect(validateEdit("g", NaN)).toBeNull();
    expect(validateEdit("g", Infinity)).toBeNull();
  });

  it("clamps to documented sane bounds (g < 8%, probabilities 0..1, holdYears 1..10)", () => {
    expect(validateEdit("g", 0.5)!.value).toBe(0.08);
    expect(validateEdit("g", -0.1)!.value).toBe(0);
    expect(validateEdit("probBull", 1.4)!.value).toBe(1);
    expect(validateEdit("probBull", -0.2)!.value).toBe(0);
    expect(validateEdit("holdYears", 50)!.value).toBe(10);
    expect(validateEdit("holdYears", 0)!.value).toBe(1);
    expect(validateEdit("ordersGrowth.0", 9)!.value).toBe(1.5);
  });
});

// ─────────────────────────── scripted set (EN + AR) ───────────────────────────

interface Case {
  name: string;
  instruction: string;
  key: string;
  value: number;
}

const EN_CASES: Case[] = [
  // per-year drivers by year mention
  {
    name: "FY26 order growth",
    instruction: "raise FY26 order growth to 20%",
    key: "ordersGrowth.0",
    value: 0.2,
  },
  {
    name: "FY28 order growth",
    instruction: "set order growth for FY28 to 10%",
    key: "ordersGrowth.2",
    value: 0.1,
  },
  {
    name: "first-year phrasing",
    instruction: "set order growth for the first year to 22%",
    key: "ordersGrowth.0",
    value: 0.22,
  },
  {
    name: "final-year phrasing",
    instruction: "take order growth in the final year to 5%",
    key: "ordersGrowth.4",
    value: 0.05,
  },
  {
    name: "AOV growth FY27",
    instruction: "set FY27 AOV growth to 5%",
    key: "aovGrowth.1",
    value: 0.05,
  },
  {
    name: "net revenue rate FY29",
    instruction: "set the FY29 net revenue rate to 30%",
    key: "netRevRate.3",
    value: 0.3,
  },
  {
    name: "monetization phrasing",
    instruction: "what if 2026 monetization is 32%?",
    key: "netRevRate.0",
    value: 0.32,
  },
  {
    name: "EBITDA margin FY30",
    instruction: "set EBITDA margin for FY30 to 12.5%",
    key: "ebitdaMargin.4",
    value: 0.125,
  },
  // scalars
  {
    name: "terminal growth what-if",
    instruction: "what if terminal growth is 3.5%?",
    key: "g",
    value: 0.035,
  },
  {
    name: "bull terminal growth",
    instruction: "set the bull case terminal growth to 4%",
    key: "gBull",
    value: 0.04,
  },
  {
    name: "bear terminal growth",
    instruction: "lower terminal growth for the bear case to 2%",
    key: "gBear",
    value: 0.02,
  },
  {
    name: "hold years",
    instruction: "use a 5 year hold period",
    key: "holdYears",
    value: 5,
  },
  {
    name: "spread in bps",
    instruction: "widen the cost of debt spread to 250 bps",
    key: "spread",
    value: 0.025,
  },
  { name: "zakat", instruction: "set zakat to 2%", key: "zakat", value: 0.02 },
  {
    name: "D&A rate",
    instruction: "set D&A to 4% of net revenue",
    key: "dnaRate",
    value: 0.04,
  },
  {
    name: "capex rate",
    instruction: "raise capex to 3%",
    key: "capexRate",
    value: 0.03,
  },
  {
    name: "NWC rate",
    instruction: "set the working capital drag to 2.5%",
    key: "nwcRate",
    value: 0.025,
  },
  // scenario probabilities
  {
    name: "bull probability",
    instruction: "set the bull probability to 40%",
    key: "probBull",
    value: 0.4,
  },
  {
    name: "bear weight",
    instruction: "set the bear case weight to 30%",
    key: "probBear",
    value: 0.3,
  },
];

const AR_CASES: Case[] = [
  {
    name: "AR: FY26 order growth (Arabic-Indic digits)",
    instruction: "ارفع نمو الطلبات لعام ٢٠٢٦ إلى ٢٠٪",
    key: "ordersGrowth.0",
    value: 0.2,
  },
  {
    name: "AR: FY26 order growth (Western digits)",
    instruction: "ارفع نمو الطلبات لعام 2026 إلى 20٪",
    key: "ordersGrowth.0",
    value: 0.2,
  },
  {
    name: "AR: terminal growth what-if",
    instruction: "ماذا لو كان النمو النهائي 3.5٪؟",
    key: "g",
    value: 0.035,
  },
  {
    name: "AR: terminal growth Arabic decimal",
    instruction: "اجعل النمو النهائي بنسبة ٣٫٥٪",
    key: "g",
    value: 0.035,
  },
  {
    name: "AR: EBITDA margin FY30",
    instruction: "اجعل هامش الإيبيتدا لعام 2030 عند 12.5٪",
    key: "ebitdaMargin.4",
    value: 0.125,
  },
  {
    name: "AR: zakat",
    instruction: "اجعل معدل الزكاة 2٪",
    key: "zakat",
    value: 0.02,
  },
  {
    name: "AR: hold period",
    instruction: "اجعل فترة الاحتفاظ 5 سنوات",
    key: "holdYears",
    value: 5,
  },
  {
    name: "AR: bull probability",
    instruction: "اجعل احتمال الحالة المتفائلة 40٪",
    key: "probBull",
    value: 0.4,
  },
];

describe("scripted set, EN", () => {
  it.each(EN_CASES)("$name", ({ instruction, key, value }) => {
    const r = parseEdit(instruction, "en", BASE_ASSUMPTIONS);
    expect(r.kind).toBe("edit");
    if (r.kind !== "edit") return;
    expect(r.assumptionKey).toBe(key);
    expect(r.value).toBeCloseTo(value, 10);
  });
});

describe("scripted set, AR", () => {
  it.each(AR_CASES)("$name", ({ instruction, key, value }) => {
    const r = parseEdit(instruction, "ar", BASE_ASSUMPTIONS);
    expect(r.kind).toBe("edit");
    if (r.kind !== "edit") return;
    expect(r.assumptionKey).toBe(key);
    expect(r.value).toBeCloseTo(value, 10);
  });
});

// ─────────────────────────── value normalization ───────────────────────────

describe("value normalization", () => {
  it("normalizes Arabic-Indic digits and the Arabic decimal separator", () => {
    expect(normalizeDigits("٢٠٢٦")).toBe("2026");
    expect(normalizeDigits("٣٫٥")).toBe("3.5");
    expect(normalizeDigits("abc ١٢٪")).toBe("abc 12٪");
  });

  it('"to 20%" and bare "to 20" both land on 0.20 for a rate field', () => {
    for (const s of [
      "raise FY26 order growth to 20%",
      "raise FY26 order growth to 20",
    ]) {
      const r = parseEdit(s, "en", BASE_ASSUMPTIONS);
      expect(r.kind).toBe("edit");
      if (r.kind === "edit") expect(r.value).toBeCloseTo(0.2, 10);
    }
  });

  it("accepts a raw decimal (already native)", () => {
    const r = parseEdit("set terminal growth to 0.035", "en", BASE_ASSUMPTIONS);
    expect(r.kind).toBe("edit");
    if (r.kind === "edit") expect(r.value).toBeCloseTo(0.035, 10);
  });

  it('"pp" relative edit: "increase FY26 order growth by 2pp" adds to the current value', () => {
    const r = parseEdit(
      "increase FY26 order growth by 2pp",
      "en",
      BASE_ASSUMPTIONS,
    );
    expect(r.kind).toBe("edit");
    if (r.kind === "edit") {
      expect(r.assumptionKey).toBe("ordersGrowth.0");
      expect(r.value).toBeCloseTo(0.18 + 0.02, 10);
    }
  });

  it("relative decrease subtracts", () => {
    const r = parseEdit(
      "reduce FY26 order growth by 3pp",
      "en",
      BASE_ASSUMPTIONS,
    );
    expect(r.kind).toBe("edit");
    if (r.kind === "edit") expect(r.value).toBeCloseTo(0.15, 10);
  });

  it("basis points convert to decimals", () => {
    const r = parseEdit("set the spread to 300 bps", "en", BASE_ASSUMPTIONS);
    expect(r.kind).toBe("edit");
    if (r.kind === "edit") expect(r.value).toBeCloseTo(0.03, 10);
  });
});

// ─────────────────────────── source-locked ───────────────────────────

describe("source-locked detection", () => {
  const LOCKED: [string, string][] = [
    ["change FY25 revenue to 2 billion", "revenue"],
    ["set FY24 GMV to SAR 10bn", "gmv"],
    ["make FY25 EBITDA 300m", "ebitda"],
    ["change the share price to 40", "price"],
    ["set FY25 net income to 100m", "netIncome"],
    ["set FY23 AOV to 70", "aov"],
    ["change FY25 orders to 120m", "orders"],
    ["غيّر إيرادات 2025 إلى 2 مليار ريال", "revenue"],
    ["عدّل سعر السهم إلى 40 ريالاً", "price"],
  ];

  it.each(LOCKED)("%s → source-locked (%s)", (instruction, target) => {
    const r = parseEdit(instruction, "en", BASE_ASSUMPTIONS);
    expect(r.kind).toBe("source-locked");
    if (r.kind === "source-locked") expect(r.target).toBe(target);
  });

  it("a per-year DRIVER pinned to an actual year (FY25) is source-locked, not silently FY26", () => {
    const r = parseEdit("set FY25 order growth to 25%", "en", BASE_ASSUMPTIONS);
    expect(r.kind).toBe("source-locked");
  });

  it("assumption phrasings beat the lock patterns (order GROWTH is editable)", () => {
    const r = parseEdit(
      "raise FY26 order growth to 20%",
      "en",
      BASE_ASSUMPTIONS,
    );
    expect(r.kind).toBe("edit");
  });
});

// ─────────────────────────── probability rebalance ───────────────────────────

describe("scenario-probability rebalance", () => {
  it("editing one probability proportionally rebalances the other two to Σ=1", () => {
    const r = parseEdit(
      "set the bull probability to 40%",
      "en",
      BASE_ASSUMPTIONS,
    );
    expect(r.kind).toBe("edit");
    if (r.kind !== "edit") return;
    expect(r.assumptionKey).toBe("probBull");
    expect(r.value).toBeCloseTo(0.4, 10);
    expect(r.also).toBeDefined();
    const byKey = Object.fromEntries(
      r.also!.map((p) => [p.assumptionKey, p.value]),
    );
    // base:bear were 0.5:0.25 → keep the 2:1 ratio over the remaining 0.6
    expect(byKey.probBase).toBeCloseTo(0.4, 10);
    expect(byKey.probBear).toBeCloseTo(0.2, 10);
    const sum = r.value + r.also!.reduce((s, p) => s + p.value, 0);
    expect(sum).toBeCloseTo(1, 12);
  });

  it("splits evenly when the other two sum to zero", () => {
    const a: Assumptions = {
      ...BASE_ASSUMPTIONS,
      probBase: 0,
      probBear: 0,
      probBull: 1,
    };
    const pairs = rebalanceProbabilities(a, "probBull", 0.6);
    expect(pairs.map((p) => p.value)).toEqual([0.2, 0.2]);
  });

  it("non-probability edits carry no rebalance", () => {
    const r = parseEdit(
      "raise FY26 order growth to 20%",
      "en",
      BASE_ASSUMPTIONS,
    );
    if (r.kind === "edit") expect(r.also).toBeUndefined();
  });

  it("PROB_KEYS matches the Assumptions shape", () => {
    for (const k of PROB_KEYS) {
      expect(typeof BASE_ASSUMPTIONS[k]).toBe("number");
    }
  });
});

// ─────────────────────────── garbage in ───────────────────────────

describe("unparsed", () => {
  it.each([
    "hello there",
    "delete the model",
    "what's the weather in Riyadh?",
    "increase everything",
    "set the vibe to excellent",
    "terminal growth", // metric but no number
    "؟؟؟",
    "",
  ])("%j → unparsed", (instruction) => {
    expect(parseEdit(instruction, "en", BASE_ASSUMPTIONS).kind).toBe(
      "unparsed",
    );
  });
});
