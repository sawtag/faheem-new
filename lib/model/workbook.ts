/**
 * lib/model/workbook, the client-safe sheet-layout description for the in-app
 * workbook viewer (components/generate/workbook-panel).
 *
 * The generated Excel deliverable (lib/generate/xlsx.ts) is server-only
 * (ExcelJS, node:fs), so the browser must NOT parse the binary file to show it.
 * Instead this module mirrors that builder's tab/row structure as a tiny
 * declarative layout that references ModelKeys into the SAME provenance node
 * graph the workbook is built from (buildModel().nodes). The panel resolves
 * each referenced key at render time: value + label + formula + source all come
 * from the node graph, so the on-screen workbook can never drift from the .xlsx
 * it sits beside.
 *
 * Client-safety rule (types.ts): NO node:fs / ExcelJS / server imports. Every
 * cell is a ModelKey string, so the layout is a static structure, unit-tested
 * to reference only real nodes (tests/model/workbook.test.ts).
 */
import { YEARS } from "@/lib/model/compute";
import type { ModelKey } from "@/lib/model/types";

const F0 = 3; // first forecast index (FY26E), mirrors compute.ts/provenance.ts

export type CellAlign = "start" | "center" | "end";

/** One cell of a workbook grid. Column widths are driven by `span` (colSpan). */
export type WorkbookCell =
  /** empty spacer (pads a short row to the sheet's column count) */
  | { type: "blank"; span?: number }
  /** full-width section band; `span` matches the sheet's column count */
  | { type: "section"; labelKey: string; span: number }
  /** inline-start row label: an explicit i18n key OR derived from `nodeKey` */
  | {
      type: "rowLabel";
      labelKey?: string;
      nodeKey?: ModelKey;
      strong?: boolean;
    }
  /** column header: literal text, an i18n key, or a node whose value is shown */
  | { type: "colHead"; text?: string; labelKey?: string; nodeKey?: ModelKey }
  /** selectable value cell, resolved from the node graph */
  | {
      type: "value";
      nodeKey: ModelKey;
      strong?: boolean;
      span?: number;
      align?: CellAlign;
    };

export interface WorkbookSheet {
  /** i18n key under generate.workbook.tabs.* */
  key: string;
  /** grid column count (section bands span this; every row sums to it) */
  cols: number;
  rows: WorkbookCell[][];
}

// ─────────────────────────────── cell builders ──────────────────────────────
const sec = (labelKey: string, span: number): WorkbookCell[] => [
  { type: "section", labelKey, span },
];
const rl = (labelKey: string, strong = false): WorkbookCell => ({
  type: "rowLabel",
  labelKey,
  strong,
});
const rlNode = (nodeKey: ModelKey, strong = false): WorkbookCell => ({
  type: "rowLabel",
  nodeKey,
  strong,
});
const v = (
  nodeKey: ModelKey,
  opts: { strong?: boolean; span?: number; align?: CellAlign } = {},
): WorkbookCell => ({ type: "value", nodeKey, ...opts });
const head = (o: {
  text?: string;
  labelKey?: string;
  nodeKey?: ModelKey;
}): WorkbookCell => ({ type: "colHead", ...o });
const blank = (span = 1): WorkbookCell => ({ type: "blank", span });

/** A bridge line: label + a single value stretched right across the sheet. */
const bridge = (
  label: WorkbookCell,
  nodeKey: ModelKey,
  cols: number,
  strong = false,
): WorkbookCell[] => [
  label,
  v(nodeKey, { span: cols - 1, align: "end", strong }),
];

const SCEN = ["bear", "base", "bull"] as const;

/** Builds the full workbook layout. Static (no numbers baked in): every value
 * cell is a ModelKey resolved against buildModel().nodes at render time. */
export function buildWorkbook(): WorkbookSheet[] {
  // ── Assumptions: WACC build, capital structure, terminal ──
  const assumptions: WorkbookSheet = {
    key: "assumptions",
    cols: 2,
    rows: [
      sec("generate.workbook.sections.waccBuild", 2),
      [rlNode("rf"), v("rf")],
      [rlNode("erp"), v("erp")],
      [rl("generate.workbook.rows.betaPeer1"), v("mkt.betaDash")],
      [rl("generate.workbook.rows.betaPeer2"), v("mkt.betaDher")],
      [rlNode("beta"), v("beta")],
      [rlNode("ke"), v("ke")],
      [rlNode("kdPre"), v("kdPre")],
      [rlNode("kdAfter"), v("kdAfter")],
      sec("generate.workbook.sections.capitalStructure", 2),
      [rlNode("price"), v("price")],
      [rlNode("shares"), v("shares")],
      [rlNode("cash"), v("cash")],
      [rlNode("debt"), v("debt")],
      [rlNode("lease"), v("lease")],
      [rlNode("netCash"), v("netCash")],
      [rlNode("E"), v("E")],
      [rlNode("V"), v("V")],
      [rlNode("we"), v("we")],
      [rlNode("wd"), v("wd")],
      [rlNode("wacc", true), v("wacc", { strong: true })],
      sec("generate.workbook.sections.terminal", 2),
      [rl("model.nodes.series.terminalGrowth"), v("assumptions.g")],
      [rl("generate.workbook.rows.holdPeriod"), v("assumptions.holdYears")],
    ],
  };

  // ── DCF: explicit-period FCFF grid + the value-per-share bridge ──
  const forecastYears = YEARS.slice(F0); // FY26E..FY30E
  const yearHead: WorkbookCell[] = [
    blank(),
    ...forecastYears.map((y) => head({ text: y })),
  ];
  const seriesRow = (
    labelKey: string,
    metric: string,
    strong = false,
  ): WorkbookCell[] => [
    rl(labelKey, strong),
    ...[0, 1, 2, 3, 4].map((i) => v(`base.${metric}.${i}`, { strong })),
  ];
  const dcf: WorkbookSheet = {
    key: "dcf",
    cols: 6,
    rows: [
      sec("generate.workbook.sections.dcfForecast", 6),
      yearHead,
      seriesRow("model.nodes.series.fcff", "fcff", true),
      seriesRow("model.nodes.series.pvf", "pvf"),
      seriesRow("model.nodes.series.pvFcff", "pvFcff", true),
      sec("generate.workbook.sections.dcfBridge", 6),
      bridge(rl("model.nodes.series.sumPv"), "base.sumPv", 6),
      bridge(rl("model.nodes.series.terminalValue"), "base.tv", 6),
      bridge(rl("model.nodes.series.pvTerminalValue"), "base.pvTv", 6),
      bridge(
        rl("model.nodes.series.enterpriseValue", true),
        "base.ev",
        6,
        true,
      ),
      bridge(rlNode("netCash"), "netCash", 6),
      bridge(
        rl("model.nodes.series.equityValue", true),
        "base.equity",
        6,
        true,
      ),
      bridge(rlNode("shares"), "shares", 6),
      bridge(rl("model.nodes.series.perShare", true), "base.perShare", 6, true),
      bridge(rlNode("price"), "price", 6),
      bridge(rl("model.nodes.series.upside", true), "base.upside", 6, true),
    ],
  };

  // ── Scenarios & Risk: bear / base / bull side by side ──
  const scenHead: WorkbookCell[] = [
    blank(),
    ...SCEN.map((s) => head({ labelKey: `model.nodes.scenarios.${s}` })),
  ];
  const scenRow = (
    labelKey: string,
    metric: string,
    strong = false,
  ): WorkbookCell[] => [
    rl(labelKey, strong),
    ...SCEN.map((s) => v(`${s}.${metric}`, { strong })),
  ];
  const scenarios: WorkbookSheet = {
    key: "scenarios",
    cols: 4,
    rows: [
      sec("generate.workbook.sections.scenarioTable", 4),
      scenHead,
      [
        rl("generate.workbook.rows.probability"),
        ...SCEN.map((s) =>
          v(`assumptions.prob${s[0]!.toUpperCase()}${s.slice(1)}`),
        ),
      ],
      scenRow("model.nodes.series.terminalGrowth", "g"),
      scenRow("model.nodes.series.perShare", "perShare", true),
      scenRow("model.nodes.series.irr", "irr"),
      scenRow("model.nodes.series.upside", "upside"),
      sec("generate.workbook.sections.scenarioSummary", 4),
      bridge(rlNode("weightedPerShare", true), "weightedPerShare", 4, true),
      bridge(rlNode("weightedReturn", true), "weightedReturn", 4, true),
    ],
  };

  // ── Sensitivity: value/share across WACC (cols) x terminal growth (rows) ──
  const sensHead: WorkbookCell[] = [
    head({ labelKey: "generate.workbook.rows.gWacc" }),
    ...[0, 1, 2, 3, 4].map((c) => head({ nodeKey: `waccAxis.${c}` })),
  ];
  const sensGrid: WorkbookCell[][] = [0, 1, 2, 3, 4].map((r) => [
    head({ nodeKey: `gAxis.${r}` }),
    ...[0, 1, 2, 3, 4].map((c) => v(`grid1.${r}.${c}`)),
  ]);
  const sensitivity: WorkbookSheet = {
    key: "sensitivity",
    cols: 6,
    rows: [
      sec("generate.workbook.sections.sensitivityGrid", 6),
      sensHead,
      ...sensGrid,
    ],
  };

  // ── Comps: implied value per share by multiple, across the peer set ──
  const COMPS = ["talabat", "doordash", "dhero"] as const;
  const compsHead: WorkbookCell[] = [
    blank(),
    ...COMPS.map((c) => head({ labelKey: `model.nodes.comp.${c}` })),
  ];
  const comps: WorkbookSheet = {
    key: "comps",
    cols: 4,
    rows: [
      sec("generate.workbook.sections.compsTable", 4),
      compsHead,
      [
        rl("model.nodes.compMetric.evRev"),
        ...COMPS.map((c) => v(`comps.evRev.${c}`)),
      ],
      [
        rl("model.nodes.compMetric.evEbitda"),
        ...COMPS.map((c) => v(`comps.evEbitda.${c}`)),
      ],
      [
        rl("model.nodes.compMetric.pe"),
        v("comps.pe.talabat"),
        v("comps.pe.doordash"),
        blank(),
      ],
      sec("generate.workbook.sections.compsRange", 4),
      bridge(rl("generate.workbook.rows.compsMin"), "comps.field.min", 4),
      bridge(
        rl("generate.workbook.rows.compsMedian", true),
        "comps.field.median",
        4,
        true,
      ),
      bridge(rl("generate.workbook.rows.compsMax"), "comps.field.max", 4),
    ],
  };

  return [assumptions, dcf, scenarios, sensitivity, comps];
}
