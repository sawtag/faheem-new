/**
 * The workbook side panel's sheet-layout mapping (lib/model/workbook).
 *
 * Core invariant: every cell the panel renders references a REAL node in the
 * provenance graph the .xlsx is built from, so the on-screen workbook cannot
 * drift from the downloadable file. Plus structural checks (sheet set, column
 * integrity) and spot-checks that the load-bearing figures are laid out.
 */
import { describe, expect, it } from "vitest";
import { BASE_ASSUMPTIONS, buildModel } from "@/lib/model/compute";
import {
  buildWorkbook,
  type WorkbookCell,
  type WorkbookSheet,
} from "@/lib/model/workbook";

const { nodes } = buildModel(BASE_ASSUMPTIONS);
const sheets = buildWorkbook();

/** every value/colHead-with-node key referenced anywhere in the layout */
function referencedNodeKeys(all: WorkbookSheet[]): string[] {
  const keys: string[] = [];
  for (const sheet of all) {
    for (const row of sheet.rows) {
      for (const cell of row) {
        if (cell.type === "value") keys.push(cell.nodeKey);
        if (cell.type === "colHead" && cell.nodeKey) keys.push(cell.nodeKey);
        if (cell.type === "rowLabel" && cell.nodeKey) keys.push(cell.nodeKey);
      }
    }
  }
  return keys;
}

/** width a cell occupies (span defaults to 1) */
function cellSpan(cell: WorkbookCell): number {
  if (cell.type === "section") return cell.span;
  if (cell.type === "value" || cell.type === "blank") return cell.span ?? 1;
  return 1;
}

describe("buildWorkbook layout", () => {
  it("exposes the five model sheets in order", () => {
    expect(sheets.map((s) => s.key)).toEqual([
      "assumptions",
      "dcf",
      "scenarios",
      "sensitivity",
      "comps",
    ]);
  });

  it("references only real nodes in the provenance graph (no drift from the .xlsx)", () => {
    const missing = referencedNodeKeys(sheets).filter((k) => !nodes[k]);
    expect(missing).toEqual([]);
  });

  it("references a non-trivial slice of the model", () => {
    const unique = new Set(referencedNodeKeys(sheets));
    expect(unique.size).toBeGreaterThan(50);
  });

  it("every row fills exactly its sheet's column count", () => {
    for (const sheet of sheets) {
      for (const row of sheet.rows) {
        const width = row.reduce((n, cell) => n + cellSpan(cell), 0);
        expect(width, `${sheet.key} row ${JSON.stringify(row)}`).toBe(
          sheet.cols,
        );
      }
    }
  });

  it("lays out the DCF value-per-share and its full equity bridge", () => {
    const keys = referencedNodeKeys([sheets[1]!]);
    for (const k of [
      "base.fcff.0",
      "base.pvFcff.4",
      "base.ev",
      "base.equity",
      "base.perShare",
      "base.upside",
    ]) {
      expect(keys).toContain(k);
    }
  });

  it("lays out all three scenarios side by side", () => {
    const keys = referencedNodeKeys([sheets[2]!]);
    for (const scen of ["bear", "base", "bull"]) {
      expect(keys).toContain(`${scen}.perShare`);
      expect(keys).toContain(`${scen}.irr`);
    }
  });

  it("lays out the full 5x5 sensitivity grid with both axes", () => {
    const keys = referencedNodeKeys([sheets[3]!]);
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) expect(keys).toContain(`grid1.${r}.${c}`);
    }
    expect(keys).toContain("waccAxis.0");
    expect(keys).toContain("gAxis.4");
  });

  it("lays out the comps grid and its implied range", () => {
    const keys = referencedNodeKeys([sheets[4]!]);
    expect(keys).toContain("comps.evRev.talabat");
    expect(keys).toContain("comps.evEbitda.dhero");
    expect(keys).toContain("comps.field.median");
  });

  it("value cells carry a resolvable provenance (sourced, assumption, or computed)", () => {
    for (const key of new Set(referencedNodeKeys(sheets))) {
      expect(["sourced", "assumption", "computed"]).toContain(
        nodes[key]!.provenance.kind,
      );
    }
  });
});
