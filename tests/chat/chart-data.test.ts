import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildJahezAnalytics,
  classifyTable,
  niceMax,
  parseMarkdownTable,
  parseNumericCell,
} from "@/lib/chart-data";
import modelInputs from "@/data/model-inputs.json";
import type { ModelInput } from "@/lib/types";

// ─── acceptance corpus: every markdown table in data/demo-cache ────────────────

const CACHE_DIR = path.join(process.cwd(), "data/demo-cache");

function deltaText(file: string): string {
  const entry = JSON.parse(
    fs.readFileSync(path.join(CACHE_DIR, file), "utf-8"),
  );
  return (entry.events as { type: string; text?: string }[])
    .filter((e) => e.type === "delta")
    .map((e) => e.text ?? "")
    .join("");
}

function extractTables(text: string): string[][] {
  const lines = text.split("\n");
  const tables: string[][] = [];
  let i = 0;
  while (i < lines.length) {
    if (/^\s*\|.*\|\s*$/.test(lines[i]!)) {
      const block: string[] = [];
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i]!)) {
        block.push(lines[i]!);
        i += 1;
      }
      if (block.length >= 2) tables.push(block);
    } else i += 1;
  }
  return tables;
}

const CORPUS_TABLES = fs
  .readdirSync(CACHE_DIR)
  .filter((f) => f.endsWith(".json"))
  .flatMap((f) =>
    extractTables(deltaText(f)).map((block) => ({ file: f, block })),
  );

// ─── cell parsing ──────────────────────────────────────────────────────────

describe("parseNumericCell", () => {
  const cases: [string, number | null, string, boolean][] = [
    // raw, value, unit, negative
    ["SAR 193.0m", 193, "currency", false],
    ["SAR 250.0m", 250, "currency", false],
    ["SAR 73.0m", 73, "currency", false],
    ["SAR 188.0m", 188, "currency", false],
    ["**−22.8%**", -22.8, "percent", true],
    ["**−61.2%**", -61.2, "percent", true],
    ["−1.6pp", -1.6, "pp", true],
    ["−3.0pp", -3.0, "pp", true],
    ["22.8%", 22.8, "percent", false],
    ["8.3%", 8.3, "percent", false],
    ["18.5%[[2]]", 18.5, "percent", false],
    ["16.8%[[5]]", 16.8, "percent", false],
    ["5 / 10[[6]]", 5, "score", false],
    ["5.5 / 10[[7]]", 5.5, "score", false],
    ["(22.8%)", -22.8, "percent", true],
    ["SAR 7,245.2M", 7245.2, "currency", false],
    ["SAR 1.2bn", 1200, "currency", false],
    ["1,054", 1054, "number", false],
    ["n/a", null, "none", false],
    ["—", null, "none", false],
    ["", null, "none", false],
  ];
  it.each(cases)("%s → %s", (raw, value, unit, negative) => {
    const p = parseNumericCell(raw);
    expect(p.value).toBe(value);
    expect(p.unit).toBe(unit);
    expect(p.negative).toBe(negative);
  });

  it("flags parenthesised negatives", () => {
    expect(parseNumericCell("(5.0)").parenthesized).toBe(true);
    expect(parseNumericCell("(5.0)").value).toBe(-5);
  });
});

// ─── markdown table parsing ──────────────────────────────────────────────────

describe("parseMarkdownTable", () => {
  it("parses a header + divider + rows", () => {
    const t = parseMarkdownTable([
      "| Metric | FY2025 | FY2024 |",
      "|---|---|---|",
      "| Adj. EBITDA | SAR 193.0m | SAR 250.0m |",
    ]);
    expect(t).not.toBeNull();
    expect(t!.headers).toEqual(["Metric", "FY2025", "FY2024"]);
    expect(t!.rows).toHaveLength(1);
    expect(t!.malformed).toBe(false);
  });

  it("returns null without a divider row", () => {
    expect(parseMarkdownTable(["| a | b |", "| 1 | 2 |"])).toBeNull();
  });

  it("drops a trailing partial row (streaming) without marking malformed", () => {
    const t = parseMarkdownTable([
      "| a | b |",
      "|---|---|",
      "| 1 | 2 |",
      "| 3", // still arriving
    ]);
    expect(t!.malformed).toBe(false);
    expect(t!.rows).toHaveLength(1);
  });

  it("marks a genuinely ragged (non-trailing) row malformed", () => {
    const t = parseMarkdownTable([
      "| a | b | c |",
      "|---|---|---|",
      "| 1 | 2 |", // wrong count, not last
      "| 3 | 4 | 5 |",
    ]);
    expect(t!.malformed).toBe(true);
  });
});

// ─── the whole demo-cache corpus parses cleanly ──────────────────────────────

describe("demo-cache corpus tables", () => {
  it("finds the two recorded golden tables", () => {
    expect(CORPUS_TABLES.length).toBeGreaterThanOrEqual(2);
  });

  it.each(CORPUS_TABLES.map((t, i) => [i, t] as const))(
    "corpus table #%i parses + classifies as chartable",
    (_i, { block }) => {
      const parsed = parseMarkdownTable(block);
      expect(parsed).not.toBeNull();
      expect(parsed!.malformed).toBe(false);
      const spec = classifyTable(parsed!);
      expect(spec).not.toBeNull();
      expect(spec!.bars.length).toBeGreaterThanOrEqual(2);
    },
  );
});

// ─── classification: exact shape for the two goldens ─────────────────────────

const FY_TABLE = [
  "| Metric | FY2025 | FY2024 | Δ |",
  "|---|---|---|---|",
  "| Adj. EBITDA | SAR 193.0m | SAR 250.0m | **−22.8%** |",
  "| Net profit (shareholders) | SAR 73.0m | SAR 188.0m | **−61.2%** |",
  "| Gross margin | 22.8% | 24.4% | −1.6pp |",
  "| Adj. EBITDA margin | 8.3% | 11.3% | −3.0pp |",
];

const RANK_TABLE = [
  "| Metric | Thara Pay | Jahez |",
  "|---|---|---|",
  "| Implied IRR at entry | 18.5%[[2]] | 17.1%[[3]] |",
  "| Scenario-weighted return | 16.2%[[4]] | 16.8%[[5]] |",
  "| Risk score | 5 / 10[[6]] | 5.5 / 10[[7]] |",
];

describe("classifyTable", () => {
  it("FY table → grouped currency bars, delta column excluded, % rows omitted", () => {
    const spec = classifyTable(parseMarkdownTable(FY_TABLE)!)!;
    expect(spec.kind).toBe("grouped-bar");
    expect(spec.unit).toBe("currency");
    expect(spec.series).toEqual(["FY2025", "FY2024"]);
    expect(spec.categories).toEqual([
      "Adj. EBITDA",
      "Net profit (shareholders)",
    ]);
    expect(spec.omittedRows).toBe(2);
    const v = (cat: string, s: string) =>
      spec.bars.find((b) => b.category === cat && b.series === s)?.value;
    expect(v("Adj. EBITDA", "FY2025")).toBe(193);
    expect(v("Adj. EBITDA", "FY2024")).toBe(250);
    expect(v("Net profit (shareholders)", "FY2025")).toBe(73);
    expect(v("Net profit (shareholders)", "FY2024")).toBe(188);
    expect(spec.hurdle).toBeUndefined();
  });

  it("ranking table → grouped percent bars, score row omitted", () => {
    const spec = classifyTable(parseMarkdownTable(RANK_TABLE)!)!;
    expect(spec.kind).toBe("grouped-bar");
    expect(spec.unit).toBe("percent");
    expect(spec.series).toEqual(["Thara Pay", "Jahez"]);
    expect(spec.categories).toEqual([
      "Implied IRR at entry",
      "Scenario-weighted return",
    ]);
    expect(spec.omittedRows).toBe(1);
    expect(
      spec.bars.find(
        (b) =>
          b.category === "Implied IRR at entry" && b.series === "Thara Pay",
      )?.value,
    ).toBe(18.5);
  });

  it("adds a dashed hurdle line from a threshold row", () => {
    const spec = classifyTable(
      parseMarkdownTable([
        "| Deal | IRR |",
        "|---|---|",
        "| Thara Pay | 18.5% |",
        "| Jahez | 17.1% |",
        "| Hurdle rate | 15% |",
      ])!,
    )!;
    expect(spec.kind).toBe("bar");
    expect(spec.hurdle).toEqual({ value: 15, label: "Hurdle rate" });
    expect(spec.categories).toEqual(["Thara Pay", "Jahez"]);
  });

  it("returns null when there is no numeric column", () => {
    const spec = classifyTable(
      parseMarkdownTable([
        "| Term | Meaning |",
        "|---|---|",
        "| GMV | Gross merchandise value |",
        "| AOV | Average order value |",
      ])!,
    );
    expect(spec).toBeNull();
  });
});

// ─── axis helper ─────────────────────────────────────────────────────────────

describe("niceMax", () => {
  it.each([
    [7245.2, 7500],
    [250, 250],
    [24.4, 25],
    [18.5, 20],
    [0, 1],
  ])("niceMax(%s) = %s", (input, out) => {
    expect(niceMax(input)).toBe(out);
  });
});

// ─── jahez workspace analytics (straight from model-inputs.json) ─────────────

describe("buildJahezAnalytics", () => {
  const a = buildJahezAnalytics(modelInputs as ModelInput[]);

  it("panel ① GMV + Net revenue across FY2023–FY2025 (all sourced values)", () => {
    expect(a.growth.periods).toEqual(["FY2023", "FY2024", "FY2025"]);
    expect(a.growth.series[0]!.key).toBe("gmv");
    expect(a.growth.series[0]!.values).toEqual([5100, 6541.9, 7245.2]);
    expect(a.growth.series[1]!.key).toBe("netRevenue");
    expect(a.growth.series[1]!.values).toEqual([1784.8, 2218.7, 2323.6]);
    expect(a.growth.source).toMatchObject({
      docId: "fy25-er",
      page: 4,
      fallbackDocId: "fy24-ar",
    });
  });

  it("panel ② gross + Adj. EBITDA margin, FY2024→FY2025", () => {
    expect(a.margins.periods).toEqual(["FY2024", "FY2025"]);
    expect(a.margins.series[0]!.values).toEqual([24.4, 22.8]);
    expect(a.margins.series[1]!.values).toEqual([11.3, 8.3]);
    expect(a.margins.source).toMatchObject({ docId: "fy25-er", page: 4 });
  });
});
