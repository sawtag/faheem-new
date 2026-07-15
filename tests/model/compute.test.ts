/**
 * Gate G3: the extracted engine is byte-identical to the pre-refactor
 * computeModel() at base assumptions, deep-equal against the frozen fixture
 * (tests/fixtures/model-base-snapshot.json, generated BEFORE the refactor).
 * Plus determinism, a non-base sanity check, and the lib/model client-safety
 * rule (no node:fs / exceljs imports anywhere under lib/model/).
 */
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  BASE_ASSUMPTIONS,
  buildModel,
  computeModel,
} from "@/lib/model/compute";

const fixture = JSON.parse(
  readFileSync(
    path.join(process.cwd(), "tests/fixtures/model-base-snapshot.json"),
    "utf-8",
  ),
) as unknown;

describe("buildModel(BASE_ASSUMPTIONS)", () => {
  it("reproduces the frozen pre-refactor snapshot exactly (no tolerance)", () => {
    const { result } = buildModel(BASE_ASSUMPTIONS);
    expect(JSON.parse(JSON.stringify(result))).toEqual(fixture);
  });

  it("hits the headline figures exactly", () => {
    const { result } = buildModel(BASE_ASSUMPTIONS);
    expect(result.base.perShare).toBe(14.3638147029964);
    expect(result.base.irr).toBe(0.17065733106145453);
    expect(result.weightedReturn).toBe(0.16768822193164545);
    expect(result.shariah.pass).toBe(true);
  });

  it("is deterministic (two calls give equal results)", () => {
    const a = buildModel(BASE_ASSUMPTIONS);
    const b = buildModel(BASE_ASSUMPTIONS);
    expect(a.result).toEqual(b.result);
    expect(a.nodes).toEqual(b.nodes);
  });

  it("responds to assumptions: raising terminal growth raises base per-share", () => {
    const { result } = buildModel({ ...BASE_ASSUMPTIONS, g: 0.035 });
    expect(result.base.perShare).toBeGreaterThan(14.3638147029964);
  });

  it("computeModel() (Office-builder compat) returns the base-case result", () => {
    expect(JSON.parse(JSON.stringify(computeModel()))).toEqual(fixture);
  });
});

describe("lib/model client-safety", () => {
  it("no lib/model module imports node:fs or exceljs", () => {
    const dir = path.join(process.cwd(), "lib/model");
    const files = readdirSync(dir).filter((f) => f.endsWith(".ts"));
    expect(files.length).toBeGreaterThanOrEqual(4);
    for (const f of files) {
      const src = readFileSync(path.join(dir, f), "utf-8");
      expect(src, `${f} must stay client-safe`).not.toMatch(
        /from\s+["'](node:fs|fs|node:path|path|exceljs)["']/,
      );
      expect(src, `${f} must not require() server modules`).not.toMatch(
        /require\(["'](node:fs|fs|exceljs)["']\)/,
      );
    }
  });
});
