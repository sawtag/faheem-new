/**
 * lib/model, the pure valuation model, shared by the Excel builder and the
 * Live Model UI. CONTRACT FILE (fable-authored): the shapes here are the
 * inter-workstream API. Implementations live in compute.ts / provenance.ts /
 * formulas.ts.
 *
 * Client-safety rule: nothing under lib/model/ may import node:fs, ExcelJS, or
 * any server-only module, the Live Model recomputes in the browser. Sourced
 * actuals load via a static import of data/model-inputs.json.
 *
 * Two-tier provenance (AGENTS.md rule 5, extended): every number the model
 * exposes is a ValueNode whose provenance terminates at a sourced actual
 * (PDF page) or a labeled assumption. Sourced actuals are immutable; only
 * Assumptions fields are editable.
 */

// ─────────────────────────────── provenance ───────────────────────────────

/** Where a number comes from. The recursion through `computed.inputs` must be
 * acyclic and terminate at `sourced` or `assumption` (enforced by tests). */
export type Provenance =
  | {
      kind: "sourced";
      /** corpus doc id (data/corpus/manifest.json) */ docId: string;
      page: number;
      /** optional exact passage for the PdfPanel highlighter */ quote?: string;
    }
  | {
      kind: "assumption";
      /** key into Assumptions (e.g. "g", "ordersGrowth.0") */ assumptionKey: string;
      /** key into the rationale registry (why the analyst chose it) */ rationaleKey: string;
    }
  | {
      kind: "computed";
      /** id into the FormulaDef registry (formulas.ts) */ formulaId: string;
      /** ModelKeys of the direct inputs, in display order */ inputs: ModelKey[];
    };

/**
 * Every number the model exposes. `value` follows the model-inputs.json
 * convention: percent quantities carry unit "%" and a percent-number value
 * (13.31 = 13.31%); everything else is in its natural unit ("SAR",
 * "SAR m", "x", "m", "years").
 */
export interface ValueNode {
  value: number;
  unit: string;
  provenance: Provenance;
  /** i18n label key (messages: model.nodes.<key>) for UI surfaces */ labelKey: string;
}

/** Dotted node address, e.g. "wacc", "base.perShare", "fy25.gmv",
 * "assumptions.g", "netRev.4", "shariah.debtRatio". */
export type ModelKey = string;

// ─────────────────────────────── assumptions ───────────────────────────────

/**
 * The editable inputs, every field here is an analyst judgment with a
 * rationale; nothing here is a sourced actual. Per-year arrays cover the five
 * forecast years FY26E..FY30E (index 0..4). Rates are decimals (0.03 = 3%).
 */
export interface Assumptions {
  /** cost-of-debt spread over rf */ spread: number;
  /** Saudi zakat rate (NOPAT tax + debt shield) */ zakat: number;
  /** terminal growth, base */ g: number;
  gBull: number;
  gBear: number;
  /** IRR hold period, years */ holdYears: number;
  /** D&A as % of net revenue */ dnaRate: number;
  /** capex as % of net revenue */ capexRate: number;
  /** ΔNWC as % of the change in net revenue */ nwcRate: number;
  ordersGrowth: number[];
  aovGrowth: number[];
  /** net revenue / GMV per forecast year */ netRevRate: number[];
  /** EBITDA margin on net revenue per forecast year */ ebitdaMargin: number[];
  bullRevDelta: number[];
  bullMarginDelta: number;
  bearRevDelta: number[];
  bearMarginDelta: number;
  probBull: number;
  probBase: number;
  probBear: number;
  /** terminal EBITDA margin for sensitivity grid 2 */ ebitdaMarginTerminal: number;
  /** quantified risk-register weights (P×I per row) feeding the risk composite */ riskWeights: number[];
}

// ─────────────────────────────── outputs ───────────────────────────────

export interface ScenarioResult {
  revGrowth: number[]; // FY26..FY30
  netRev: number[];
  ebitdaMargin: number[];
  ebitda: number[];
  dna: number[];
  ebit: number[];
  nopat: number[];
  capex: number[];
  dnwc: number[];
  fcff: number[];
  pvf: number[];
  pvFcff: number[];
  sumPv: number;
  g: number;
  tv: number;
  pvTv: number;
  ev: number;
  equity: number;
  perShare: number;
  upside: number;
  irr: number;
}

export interface ModelResult {
  // WACC build
  rf: number;
  erp: number;
  beta: number;
  ke: number;
  kdPre: number;
  kdAfter: number;
  E: number;
  D: number;
  V: number;
  we: number;
  wd: number;
  wacc: number;
  price: number;
  shares: number;
  cash: number;
  debt: number;
  lease: number;
  netCash: number;
  // revenue drivers 0..7 (FY23A..FY30E)
  orders: number[];
  aov: number[];
  gmv: number[];
  netRev: number[];
  takeRate: number[];
  commission: number[];
  // statement 0..7 (forecast populated 3..7; actuals where sourced)
  ebitda: number[];
  dna: number[];
  ebit: number[];
  nopat: number[];
  capex: number[];
  dnwc: number[];
  fcff: number[];
  // dcf
  base: ScenarioResult;
  bull: ScenarioResult;
  bear: ScenarioResult;
  weightedPerShare: number;
  weightedReturn: number;
  // sensitivity
  waccAxis: number[];
  gAxis: number[];
  grid1: number[][];
  takeAxis: number[];
  gmvGrowthAxis: number[];
  grid2: number[][];
  // comps
  comps: {
    dcfPerShare: number;
    evRev: { talabat: number; doordash: number; dhero: number };
    evEbitda: { talabat: number; doordash: number; dhero: number };
    pe: { talabat: number; doordash: number };
    field: { min: number; median: number; max: number };
  };
  // shariah
  shariah: {
    debtRatio: number;
    cashRatio: number;
    leaseInclRatio: number;
    debtPass: boolean;
    cashPass: boolean;
    pass: boolean;
  };
  // risk + IC
  riskScore: number;
  ic: {
    irr: number;
    hurdle: number;
    expectedReturn: number;
    riskScore: number;
  };
}

/**
 * What buildModel returns. `result` is the full numeric result, the exact
 * shape the xlsx/docx/pptx builders already consume (byte-identical at base
 * assumptions, snapshot-gated). `nodes` is the provenance-annotated view the
 * Live Model + Methodology panel read: every user-facing number in `result`
 * appears as a node whose provenance terminates at a source or an assumption.
 */
export interface ModelOutputs {
  result: ModelResult;
  nodes: Record<ModelKey, ValueNode>;
}

// ─────────────────────────────── formulas ───────────────────────────────

/** Formula content registry entry, id → rendered formula + explainer.
 * `katex` is the display formula (must match what compute.ts actually does,
 * gate G5); `explainerKey` is a next-intl key (messages: model.formulas.<id>)
 * for the plain-language explainer, EN + AR. `external` is an optional
 * "learn more" URL, never load-bearing (offline-safe). */
export interface FormulaDef {
  id: string;
  katex: string;
  explainerKey: string;
  external?: string;
}
