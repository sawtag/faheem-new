/**
 * components/model/node-label, human labels for ModelKeys.
 *
 * `ValueNode.labelKey` is always the literal `model.nodes.<key>` (fixed by
 * lib/model/provenance.ts). Authoring one message per node would mean
 * hundreds of near-duplicate strings ("Net revenue, FY26E" ×8 years ×3
 * scenarios ×...), so this resolver takes a two-tier approach:
 *
 *  1. A curated set of ~45 EXACT keys (the WACC build, DCF chain, scenario
 *     scalars, Compliance ratios, comps range, IC summary, the nodes actually
 *     surfaced in the demo) get a hand-written `model.nodes.<key>` message,
 *     looked up directly via `t.has()`.
 *  2. Everything else (the FY23A–FY30E revenue-driver/statement series, the
 *     per-scenario per-year arrays, the assumption arrays, comps multiples,
 *     sensitivity axes/grids, the bulk of the 150+ node graph) is pattern-
 *     matched against the ModelKey shape and composed from a small library
 *     of reusable part-labels (`model.nodes.series.*`, `.scenarios.*`,
 *     `.comp.*`, `.compMetric.*`, `.axis.*`, `.grid.*`) plus
 *     `lib/model/compute.ts`'s YEARS constant, via `model.nodes.templates.*`
 *     interpolation templates. No indexed key ever needs its own message.
 *
 * A final `humanize()` fallback (split on '.', camelCase → spaced, title
 * case) guarantees no key is ever left unresolved or leaks a raw i18n key
 * into the UI, it's a defensive net for any node shape this file doesn't
 * yet know about, not the primary path.
 */
import type { useTranslations } from "next-intl";
import { YEARS } from "@/lib/model/compute";
import type { ModelKey } from "@/lib/model/types";

type T = ReturnType<typeof useTranslations>;

const F0 = 3; // first forecast index (FY26E), mirrors compute.ts/provenance.ts

/** metric name → `model.nodes.series.<key>` part-label, shared by the plain
 * 0..7 arrays, the per-scenario 0..4 arrays, and the assumption arrays. */
const SERIES: Record<string, string> = {
  orders: "orders",
  aov: "aov",
  gmv: "gmv",
  netRev: "netRev",
  takeRate: "takeRate",
  commission: "commission",
  ebitda: "ebitda",
  dna: "dna",
  ebit: "ebit",
  nopat: "nopat",
  capex: "capex",
  dnwc: "dnwc",
  fcff: "fcff",
  revGrowth: "revGrowth",
  ebitdaMargin: "ebitdaMargin",
  pvf: "pvf",
  pvFcff: "pvFcff",
  ordersGrowth: "ordersGrowth",
  aovGrowth: "aovGrowth",
  netRevRate: "netRevRate",
  bullRevDelta: "bullRevDelta",
  bearRevDelta: "bearRevDelta",
};

const SCENARIO_SCALARS: Record<string, string> = {
  sumPv: "sumPv",
  g: "terminalGrowth",
  tv: "terminalValue",
  pvTv: "pvTerminalValue",
  ev: "enterpriseValue",
  equity: "equityValue",
  perShare: "perShare",
  upside: "upside",
  irr: "irr",
};

const COMPS = new Set(["talabat", "doordash", "dhero"]);
const COMP_METRICS: Record<string, string> = {
  evRev: "evRev",
  evEbitda: "evEbitda",
  pe: "pe",
};
const AXES = new Set(["waccAxis", "gAxis", "takeAxis", "gmvGrowthAxis"]);
const GRIDS = new Set(["grid1", "grid2"]);

function matchGroups(
  pattern: RegExp,
  value: string,
  count: 2,
): [string, string] | null;
function matchGroups(
  pattern: RegExp,
  value: string,
  count: 3,
): [string, string, string] | null;
function matchGroups(
  pattern: RegExp,
  value: string,
  count: 2 | 3,
): [string, string] | [string, string, string] | null {
  const result = pattern.exec(value);
  const first = result?.[1];
  const second = result?.[2];
  if (first === undefined || second === undefined) return null;
  if (count === 2) return [first, second];
  const third = result?.[3];
  return third === undefined ? null : [first, second, third];
}

function yearAt(i: number): string {
  return YEARS[i] ?? `Y${i}`;
}

function humanize(key: ModelKey): string {
  return key
    .split(".")
    .map((part) =>
      /^\d+$/.test(part)
        ? `#${Number(part) + 1}`
        : part
            .replace(/([a-z\d])([A-Z])/g, "$1 $2")
            .replace(/^./, (c) => c.toUpperCase()),
    )
    .join(" · ");
}

export function getNodeLabel(key: ModelKey, t: T): string {
  const exact = `model.nodes.${key}`;
  if (t.has(exact)) return t(exact);

  // scenario-prefixed series: "base.netRev.2", "bull.pvFcff.4"
  const scenarioSeries = matchGroups(
    /^(base|bull|bear)\.([a-zA-Z]+)\.(\d)$/,
    key,
    3,
  );
  if (scenarioSeries) {
    const [scen, metric, idxStr] = scenarioSeries;
    const series = metric ? SERIES[metric] : undefined;
    if (series) {
      return t("model.nodes.templates.scenarioSeries", {
        scenario: t(`model.nodes.scenarios.${scen}`),
        series: t(`model.nodes.series.${series}`),
        year: yearAt(F0 + Number(idxStr)),
      });
    }
  }

  // scenario scalars: "base.perShare", "bull.tv"
  const scenarioScalar = matchGroups(/^(base|bull|bear)\.([a-zA-Z]+)$/, key, 2);
  if (scenarioScalar) {
    const [scen, metric] = scenarioScalar;
    const label = metric ? SCENARIO_SCALARS[metric] : undefined;
    if (label) {
      return t("model.nodes.templates.scenarioScalar", {
        scenario: t(`model.nodes.scenarios.${scen}`),
        series: t(`model.nodes.series.${label}`),
      });
    }
  }

  // assumption arrays: "assumptions.ordersGrowth.0", "assumptions.riskWeights.3"
  const assumptionArray = matchGroups(
    /^assumptions\.([a-zA-Z]+)\.(\d)$/,
    key,
    2,
  );
  if (assumptionArray) {
    const [name, idxStr] = assumptionArray;
    const idx = Number(idxStr);
    if (name === "riskWeights") {
      return t("model.nodes.templates.riskWeight", { n: idx + 1 });
    }
    const series = name ? SERIES[name] : undefined;
    if (series) {
      return t("model.nodes.templates.series", {
        series: t(`model.nodes.series.${series}`),
        year: yearAt(F0 + idx),
      });
    }
  }

  // plain 0..7 series: "orders.5", "ebitda.2"
  const plainSeries = matchGroups(/^([a-zA-Z]+)\.(\d)$/, key, 2);
  if (plainSeries) {
    const [metric, idxStr] = plainSeries;
    const series = metric ? SERIES[metric] : undefined;
    if (series) {
      return t("model.nodes.templates.series", {
        series: t(`model.nodes.series.${series}`),
        year: yearAt(Number(idxStr)),
      });
    }
  }

  // comps / market multiples: "comps.evRev.<peer>", "mkt.pe.<peer>"
  const compMultiple = matchGroups(
    /^(comps|mkt)\.([a-zA-Z]+)\.([a-z]+)$/,
    key,
    3,
  );
  if (compMultiple) {
    const [ns, metric, comp] = compMultiple;
    if (comp && COMPS.has(comp) && metric && COMP_METRICS[metric]) {
      const template =
        ns === "comps"
          ? "model.nodes.templates.compsImplied"
          : "model.nodes.templates.compsMultiple";
      return t(template, {
        comp: t(`model.nodes.comp.${comp}`),
        metric: t(`model.nodes.compMetric.${COMP_METRICS[metric]}`),
      });
    }
  }

  // sensitivity axis points: "waccAxis.2"
  const axisPoint = matchGroups(
    /^(waccAxis|gAxis|takeAxis|gmvGrowthAxis)\.(\d)$/,
    key,
    2,
  );
  if (axisPoint) {
    const [axis, idxStr] = axisPoint;
    if (axis && AXES.has(axis)) {
      return t("model.nodes.templates.axis", {
        axis: t(`model.nodes.axis.${axis}`),
        n: Number(idxStr) + 1,
      });
    }
  }

  // sensitivity grid cells: "grid1.2.3"
  const gridCell = matchGroups(/^(grid1|grid2)\.(\d)\.(\d)$/, key, 3);
  if (gridCell) {
    const [grid, rowStr, colStr] = gridCell;
    if (grid && GRIDS.has(grid)) {
      return t("model.nodes.templates.gridCell", {
        grid: t(`model.nodes.grid.${grid}`),
        row: Number(rowStr) + 1,
        col: Number(colStr) + 1,
      });
    }
  }

  return humanize(key);
}
