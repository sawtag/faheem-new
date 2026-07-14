/**
 * Acceptance tests for the Jahez valuation workbook.
 *
 * The workbook is written to a Buffer and read back with exceljs, so every
 * assertion runs against the real .xlsx bytes a judge would open. Key checks:
 *   - exact 9-tab set;
 *   - headline cells are FORMULAS (not literals) with the right cross-sheet refs;
 *   - ModelInput-fed cells carry the exact "Source: …, p.n" comment (≥10 tabs);
 *   - sensitivity corner recomputes to the DCF's own FCFF stream (TS-side math);
 *   - the base-case per-share value is finite, positive, in a sane band;
 *   - LibreOffice opens the file (soffice --convert-to pdf exits 0).
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import ExcelJS from "exceljs";
import { beforeAll, describe, expect, it } from "vitest";
import { buildJahezWorkbook } from "@/lib/generate/xlsx";
import { computeModel } from "@/lib/model/compute";
import type { ModelResult } from "@/lib/model/types";
import { loadModelInputs, sourceLabel } from "@/lib/generate/shared";

let wb: ExcelJS.Workbook;
let model: ModelResult;

beforeAll(async () => {
  const buf = await buildJahezWorkbook();
  wb = new ExcelJS.Workbook();
  // exceljs declares its own `Buffer extends ArrayBuffer`; cast to its exact param type
  await wb.xlsx.load(buf as unknown as Parameters<typeof wb.xlsx.load>[0]);
  model = computeModel();
});

const TABS = [
  "Cover",
  "Assumptions",
  "Revenue Drivers",
  "3-Statement",
  "DCF",
  "Sensitivity",
  "Comps",
  "Scenarios & Risk",
  "Shariah Screen",
];

/** exceljs formula cell → its formula string ("" if the cell is a literal). */
const formulaOf = (ws: ExcelJS.Worksheet, address: string): string => {
  const v = ws.getCell(address).value as { formula?: string } | null;
  return v && typeof v === "object" && "formula" in v ? (v.formula ?? "") : "";
};
const resultOf = (ws: ExcelJS.Worksheet, address: string): number => {
  const v = ws.getCell(address).value as { result?: number } | null;
  return v && typeof v === "object" && "result" in v
    ? Number(v.result)
    : Number(v);
};
const noteText = (ws: ExcelJS.Worksheet, address: string): string => {
  const n = ws.getCell(address).note as unknown;
  if (!n) return "";
  if (typeof n === "string") return n;
  const texts = (n as { texts?: { text: string }[] }).texts;
  return texts ? texts.map((t) => t.text).join("") : "";
};
/** Find the first cell in a sheet whose comment contains `needle`. */
const findNote = (ws: ExcelJS.Worksheet, needle: string): string | null => {
  let found: string | null = null;
  ws.eachRow((row) => {
    row.eachCell((cell) => {
      if (found) return;
      const n = noteText(ws, cell.address);
      if (n.includes(needle)) found = n;
    });
  });
  return found;
};
/** Find the address of a cell whose displayed label equals `text` in column c. */
const findLabelRow = (
  ws: ExcelJS.Worksheet,
  c: number,
  text: string,
): number | null => {
  let r: number | null = null;
  ws.eachRow((row, rowNumber) => {
    if (r) return;
    const v = row.getCell(c).value;
    if (typeof v === "string" && v.trim() === text.trim()) r = rowNumber;
  });
  return r;
};

describe("workbook structure", () => {
  it("has exactly the 9 spec'd tabs, Cover first", () => {
    expect(wb.worksheets.map((w) => w.name)).toEqual(TABS);
  });
});

describe("cross-sheet formulas (not literals)", () => {
  it("DCF enterprise value is Σ PV(FCFF) + PV(terminal value)", () => {
    const ws = wb.getWorksheet("DCF")!;
    // locate EV row by its label
    const evRow = findLabelRow(ws, 2, "Enterprise value (EV)");
    expect(evRow).not.toBeNull();
    const f = formulaOf(ws, `E${evRow}`);
    expect(f).toMatch(/E\d+\+E\d+/); // sum of two PV components
    // and the sum-of-PV cell itself is a SUM over the PV-of-FCFF row
    const sumRow = findLabelRow(
      ws,
      2,
      "Sum of PV of explicit FCFF (FY26E–FY30E)",
    );
    expect(formulaOf(ws, `E${sumRow}`)).toMatch(/^SUM\(/);
  });

  it("DCF value per share divides equity by shares, and references drive it", () => {
    const ws = wb.getWorksheet("DCF")!;
    const psRow = findLabelRow(ws, 2, "Value per share (SAR)");
    const f = formulaOf(ws, `E${psRow}`);
    expect(f).toMatch(/E\d+\/E\d+/);
    // PV factor row references Assumptions!WACC
    const pvfRow = findLabelRow(ws, 2, "  PV factor @ WACC");
    expect(formulaOf(ws, `F${pvfRow}`)).toContain("'Assumptions'!");
  });

  it("Cover headline cells are formulas referencing DCF, Scenarios and Shariah tabs", () => {
    const ws = wb.getWorksheet("Cover")!;
    const formulas: string[] = [];
    ws.eachRow((row) => {
      row.eachCell((cell) => {
        const f = formulaOf(ws, cell.address);
        if (f) formulas.push(f);
      });
    });
    // no headline number is a literal — each references a model tab
    expect(formulas.some((f) => f.includes("'DCF'!"))).toBe(true);
    expect(formulas.some((f) => f.includes("'Scenarios & Risk'!"))).toBe(true);
    expect(formulas.some((f) => f.includes("'Shariah Screen'!"))).toBe(true);
    // the recommendation is an IF() over the weighted return, not a hardcoded word
    expect(formulas.some((f) => /^IF\(.*'Scenarios & Risk'!/.test(f))).toBe(
      true,
    );
  });

  it("Assumptions WACC is We·Ke + Wd·Kd(after-tax), all formula-linked", () => {
    const ws = wb.getWorksheet("Assumptions")!;
    const waccRow = findLabelRow(ws, 2, "WACC");
    const f = formulaOf(ws, `C${waccRow}`);
    // We*Ke + Wd*KdAfter — four cell refs, one '+' and two '*'
    expect(f).toMatch(/C\d+\*C\d+\+C\d+\*C\d+/);
    const keRow = findLabelRow(ws, 2, "Cost of equity — CAPM (rf + β × ERP)");
    expect(formulaOf(ws, `C${keRow}`)).toMatch(/C\d+\+C\d+\*C\d+/);
  });

  it("Shariah screen ratios and flags are formulas", () => {
    const ws = wb.getWorksheet("Shariah Screen")!;
    const debtRow = findLabelRow(ws, 2, "Interest-bearing debt / market cap");
    expect(formulaOf(ws, `C${debtRow}`)).toContain("'Assumptions'!");
    expect(formulaOf(ws, `E${debtRow}`)).toMatch(/^IF\(/);
  });
});

describe("sourced cells carry exact source comments (≥10 across tabs)", () => {
  const m = loadModelInputs();
  const spotChecks: { key: string }[] = [
    { key: "fy25.gmv" },
    { key: "fy24.gmv" },
    { key: "fy23.orders" },
    { key: "fy25.net_revenue" },
    { key: "fy25.adj_ebitda" },
    { key: "fy25.dna" },
    { key: "q1_26.cash" },
    { key: "q1_26.islamic_facilities_loans" },
    { key: "q1_26.lease_liabilities" },
    { key: "fy25.segment_ksa_net_revenue" },
    { key: "fy25.take_rate" },
    { key: "fy25.commission_revenue" },
  ];

  it.each(spotChecks)(
    "$key has a cell commented with its exact source label",
    ({ key }) => {
      const input = m.get(key)!;
      const label = sourceLabel(input);
      // the source label appears somewhere in the workbook, on a real comment
      let hit = false;
      for (const ws of wb.worksheets) {
        if (findNote(ws, label)) {
          hit = true;
          break;
        }
      }
      expect(hit, `expected a comment containing "${label}"`).toBe(true);
    },
  );

  it("sourced comments include the faheem:// deep-link", () => {
    const ws = wb.getWorksheet("Assumptions")!;
    const note = findNote(
      ws,
      "Source: Market Data & Comparables Snapshot, p.2",
    );
    expect(note).toContain("faheem://doc/market-data-comps/2");
  });

  it("assumption cells are labelled analyst judgments", () => {
    const ws = wb.getWorksheet("Assumptions")!;
    const note = findNote(ws, "Assumption — analyst judgment:");
    expect(note).toBeTruthy();
  });
});

describe("sensitivity grid recomputes to the DCF's own FCFF stream", () => {
  it("grid-1 centre cell equals the DCF value per share", () => {
    const ws = wb.getWorksheet("Sensitivity")!;
    // centre cell: base WACC (col E), base g (middle g row). Recompute expected.
    const centre = model.grid1[2]![2]!;
    expect(centre).toBeCloseTo(model.base.perShare, 6);
    // and the workbook cached the same value on a formula cell
    let matched = false;
    ws.eachRow((row) => {
      row.eachCell((cell) => {
        const f = formulaOf(ws, cell.address);
        const res = resultOf(ws, cell.address);
        if (f.includes("'DCF'!") && Math.abs(res - centre) < 1e-6)
          matched = true;
      });
    });
    expect(matched).toBe(true);
  });

  it("corner (WACC+1%, g−0.5%) recomputes from base FCFF (independent TS math)", () => {
    // independent recomputation of the closed form the workbook cell encodes
    const f = model.base.fcff;
    const w = model.wacc + 0.01;
    const g = 0.03 - 0.005;
    let s = 0;
    for (let t = 0; t < 5; t++) s += f[t]! / Math.pow(1 + w, t + 1);
    s += (f[4]! * (1 + g)) / (w - g) / Math.pow(1 + w, 5);
    const expected = (s + model.netCash) / model.shares;
    // grid1[row=g−0.5% => index 0][col=WACC+1% => index 4]
    expect(model.grid1[0]![4]!).toBeCloseTo(expected, 6);

    // the workbook cell (a formula referencing DCF FCFF cells) caches this value
    const ws = wb.getWorksheet("Sensitivity")!;
    let matched = false;
    ws.eachRow((row) => {
      row.eachCell((cell) => {
        const fo = formulaOf(ws, cell.address);
        if (
          fo.includes("'DCF'!") &&
          Math.abs(resultOf(ws, cell.address) - expected) < 1e-6
        )
          matched = true;
      });
    });
    expect(matched).toBe(true);
  });
});

describe("base-case model sanity", () => {
  it("per-share value is finite, positive and within a sane band", () => {
    expect(Number.isFinite(model.base.perShare)).toBe(true);
    expect(model.base.perShare).toBeGreaterThan(5);
    expect(model.base.perShare).toBeLessThan(40);
  });
  it("WACC exceeds terminal growth (valid Gordon TV)", () => {
    expect(model.wacc).toBeGreaterThan(0.03 + 0.02);
  });
  it("scenario ordering holds: bear < base < bull", () => {
    expect(model.bear.perShare).toBeLessThan(model.base.perShare);
    expect(model.base.perShare).toBeLessThan(model.bull.perShare);
  });
  it("Shariah screens pass with the sourced balance sheet", () => {
    expect(model.shariah.pass).toBe(true);
    expect(model.shariah.debtRatio).toBeLessThan(0.33);
  });
  it("weighted expected return clears the 15% hurdle", () => {
    expect(model.weightedReturn).toBeGreaterThan(0.15);
  });
});

describe("comps never fabricate unsourced multiples", () => {
  it("EV/GMV column is 'n/a' everywhere (never a number)", () => {
    const ws = wb.getWorksheet("Comps")!;
    // column G (7) in the multiples table holds EV/GMV; all such cells are text 'n/a'
    let anyNumber = false;
    ws.eachRow((row) => {
      const cell = row.getCell(6); // EV/GMV column
      if (typeof cell.value === "number") anyNumber = true;
    });
    // some numeric cells exist in col 6 on other rows? EV/GMV header is col 6 only in multiples block.
    // Assert at least one explicit 'n/a' present and no fabricated EV/GMV multiple.
    const naSeen = findLabelRow(ws, 6, "n/a");
    expect(naSeen).not.toBeNull();
    expect(anyNumber).toBe(false);
  });
});

describe("LibreOffice can open the workbook", () => {
  it("soffice --convert-to pdf exits 0", async () => {
    const soffice = ["/usr/bin/soffice", "soffice", "libreoffice"].find(
      (p) => p === "soffice" || p === "libreoffice" || existsSync(p),
    );
    const dir = mkdtempSync(path.join(tmpdir(), "jahez-xlsx-"));
    const xlsx = path.join(dir, "model.xlsx");
    writeFileSync(xlsx, await buildJahezWorkbook());
    execFileSync(
      soffice ?? "soffice",
      ["--headless", "--convert-to", "pdf", "--outdir", dir, xlsx],
      {
        stdio: "ignore",
        timeout: 120000,
      },
    );
    expect(existsSync(path.join(dir, "model.pdf"))).toBe(true);
  }, 130000);
});
