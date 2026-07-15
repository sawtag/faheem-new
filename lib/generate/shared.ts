/**
 * Shared generation helpers, Lunar-branded Office artifacts (xlsx / docx / pptx).
 *
 * AGENTS.md rule 4 carve-out: Office file formats have no CSS variables, so the
 * Lunar brand palette lives in ONE place, the `lunarBrand` constant below.
 * Nowhere else in the repo may an Office hex be written.
 *
 * These helpers are the shared floor for the whole `lib/generate/**` family:
 *   - `lunarBrand`         the palette + fonts (charcoal + gold, "old-money PE")
 *   - `loadModelInputs()`  zod-validated ModelInput map keyed by `<period>.<metric>`
 *   - `sourceLabel()`      "Source: <doc title EN>, p.<n>"  (the cell-comment line)
 *   - `faheemDeepLink()`   "faheem://doc/<id>/<page>"       (clickable deep-link)
 *   - `sourceComment()`    the full sourced-cell note (label + deep-link)
 *   - number-format constants shared by every generated workbook
 */
import fs from "node:fs";
import path from "node:path";
import {
  CorpusDocSchema,
  ModelInputSchema,
  type CorpusDoc,
  type ModelInput,
} from "@/lib/types";

// ─────────────────────────── Lunar brand palette ───────────────────────────
// Charcoal (#2A2620 family) + gold (#B08D2A family). Six-digit hex only; the
// `argb()` helper prefixes the 'FF' alpha channel exceljs/office formats expect.
// This is THE single home for Lunar Office hexes (AGENTS.md rule 4).
export const lunarBrand = {
  // charcoal family, header bands, titles, ink
  charcoal: "2A2620",
  charcoalDeep: "1C1914",
  charcoalMid: "514B40",
  ink: "2A2620",
  inkMuted: "6B6455",
  // gold family, rules, accents, assumption highlight
  gold: "B08D2A",
  goldLight: "C9A94E",
  goldPale: "EFE6CE", // assumption-cell tint (analyst judgment)
  // warm neutrals, paper, sourced-cell tint, borders, cream text on charcoal
  cream: "F5F1E6", // text/rule on the charcoal band
  paper: "FBF9F4", // warm section-band background
  sourcedTint: "F3F0E9", // sourced-cell tint (subtle warm grey)
  band: "EDE8DC", // sub-header band
  border: "D8D2C4",
  borderStrong: "B7AF9C",
  white: "FFFFFF",
  // muted status colours (old-money register, no neon)
  positive: "3E6B49",
  negative: "9B3A2E",
  warn: "9A7B25",
  // typography, serif display for the "old-money PE" headings, safe sans for data
  serif: "Georgia",
  sans: "Arial",
} as const;

/** exceljs / OOXML want an 8-digit ARGB; brand hexes are stored 6-digit. */
export const argb = (hex: string): string => `FF${hex}`;

// ───────────────────────────── number formats ──────────────────────────────
// Consistent across every generated workbook. SAR millions to one decimal,
// rates to one decimal percent, multiples with an "x" suffix, share prices to
// two decimals. Negatives render in parentheses (banker convention).
export const FMT = {
  sarM: "#,##0.0;(#,##0.0)",
  sarM0: "#,##0;(#,##0)",
  rate: "0.0%;(0.0%)",
  rate2: "0.00%;(0.00%)",
  mult: '0.00"x"',
  price: "#,##0.00",
  beta: "0.00",
  count1: "#,##0.0",
  score: "0.0",
  int: "#,##0",
} as const;

// ───────────────────────────── data loaders ────────────────────────────────
const repoRoot = process.cwd();

let modelInputsCache: Map<string, ModelInput> | null = null;
let manifestCache: Map<string, CorpusDoc> | null = null;

/** zod-validated ModelInput map, keyed by `<period>.<metric>` (e.g. "fy25.gmv"). */
export function loadModelInputs(): Map<string, ModelInput> {
  if (!modelInputsCache) {
    const raw = JSON.parse(
      fs.readFileSync(path.join(repoRoot, "data/model-inputs.json"), "utf-8"),
    );
    const arr = ModelInputSchema.array().parse(raw);
    modelInputsCache = new Map(arr.map((i) => [i.key, i]));
  }
  return modelInputsCache;
}

function manifest(): Map<string, CorpusDoc> {
  if (!manifestCache) {
    const raw = JSON.parse(
      fs.readFileSync(
        path.join(repoRoot, "data/corpus/manifest.json"),
        "utf-8",
      ),
    );
    manifestCache = new Map(
      CorpusDocSchema.array()
        .parse(raw)
        .map((d) => [d.id, d]),
    );
  }
  return manifestCache;
}

/** English title for a corpus doc id, for source labels/comments. */
export function docTitleEn(docId: string): string {
  return manifest().get(docId)?.title.en ?? docId;
}

// ───────────────────────── source labelling helpers ────────────────────────
/** A `{ sourceDoc, page }`-shaped record, a real ModelInput or a market datum. */
export interface Sourced {
  sourceDoc: string;
  page: number;
}

/** "Source: <doc title EN>, p.<n>", the load-bearing sourced-cell comment line. */
export function sourceLabel(input: Sourced): string {
  return `Source: ${docTitleEn(input.sourceDoc)}, p.${input.page}`;
}

/** "faheem://doc/<id>/<page>", deep-links into Faheem's in-app PDF viewer. */
export function faheemDeepLink(docId: string, page: number): string {
  return `faheem://doc/${docId}/${page}`;
}

/** Full sourced-cell note: the source line plus a clickable Faheem deep-link. */
export function sourceComment(input: Sourced): string {
  return `${sourceLabel(input)}\nOpen in Faheem, ${faheemDeepLink(
    input.sourceDoc,
    input.page,
  )}`;
}

/** Assumption-cell note: analyst judgment, no clean source, with the rationale. */
export function assumptionComment(rationale: string): string {
  return `Assumption, analyst judgment: ${rationale}`;
}

// ═══════════════════ narrative prose, data loading & resolution ═══════════
// docx.ts (IC memo) and pptx.ts (board deck) write analyst-voice prose from
// `data/narratives.json` with `{placeholder}` tokens, either a raw
// ModelInput key ("fy25.gmv") or a computed model figure ("calc.wacc"), so
// no quantitative claim in prose can ever drift from the sourced data /
// computeModel() output (AGENTS.md rule 5). `buildNarrativeFacts()` resolves
// every placeholder ONCE per build into a flat string map; `resolveNarrative()`
// substitutes and throws on any unresolved token, the build fails loudly
// rather than shipping an unresolved brace.

/** Loose shape of `data/narratives.json`, prose blocks, EN only, template strings. */
export interface NarrativesDoc {
  memo: Record<string, unknown>;
  deck: Record<string, unknown>;
}

let narrativesCache: NarrativesDoc | null = null;

/** Raw `data/narratives.json`, cached. Placeholders are resolved separately via `resolveNarrative()`. */
export function loadNarratives(): NarrativesDoc {
  if (!narrativesCache) {
    narrativesCache = JSON.parse(
      fs.readFileSync(path.join(repoRoot, "data/narratives.json"), "utf-8"),
    ) as NarrativesDoc;
  }
  return narrativesCache;
}

const pct = (x: number): string => `${(x * 100).toFixed(1)}%`;
const pct2 = (x: number): string => `${(x * 100).toFixed(2)}%`;
const sar = (x: number): string => `SAR ${x.toFixed(2)}`;
const sarM = (x: number): string =>
  x < 0
    ? `SAR (${Math.abs(x).toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}m)`
    : `SAR ${x.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}m`;

/** Unit-aware plain-text formatting for a sourced ModelInput (mirrors the workbook's FMT conventions). */
export function formatModelInputValue(input: ModelInput): string {
  const v = input.value;
  switch (input.unit) {
    case "SAR m":
      return sarM(v);
    case "%":
      return v < 0 ? `(${Math.abs(v).toFixed(1)}%)` : `${v.toFixed(1)}%`;
    case "SAR":
      return sar(v);
    case "m":
      return `${v.toFixed(1)}m`;
    case "m shares":
      return `${v.toFixed(1)}m shares`;
    default:
      return String(v);
  }
}

/** A flat `{placeholder}` -> formatted-string map for `resolveNarrative()`. */
export type NarrativeFacts = Record<string, string>;

/**
 * Every raw model-input key (e.g. "fy25.gmv") plus a curated set of computed
 * "calc.*" figures pulled straight off `computeModel()`'s `ModelResult`, the
 * only two sources of truth deliverables are allowed to cite (AGENTS.md rule 5).
 * `model` is typed structurally (not imported from xlsx.ts) to avoid a
 * cross-module type dependency; xlsx.ts's `ModelResult` satisfies it.
 */
export function buildNarrativeFacts(model: NarrativeModel): NarrativeFacts {
  const facts: NarrativeFacts = {};
  for (const [key, input] of loadModelInputs()) {
    facts[key] = formatModelInputValue(input);
  }

  const inputs = loadModelInputs();
  const marginFy24 = inputs.get("fy24.adj_ebitda_margin")!.value;
  const marginFy25 = inputs.get("fy25.adj_ebitda_margin")!.value;

  const rating: "BUY" | "HOLD" | "REDUCE" =
    model.weightedReturn >= 0.15
      ? "BUY"
      : model.base.upside >= 0
        ? "HOLD"
        : "REDUCE";

  Object.assign(facts, {
    "calc.rating": rating,
    "calc.targetPrice": sar(model.base.perShare),
    "calc.currentPrice": sar(model.price),
    "calc.upside": `${model.base.upside >= 0 ? "+" : ""}${pct(model.base.upside)}`,
    "calc.upsideBull": `${model.bull.upside >= 0 ? "+" : ""}${pct(model.bull.upside)}`,
    "calc.upsideBear": `${model.bear.upside >= 0 ? "+" : ""}${pct(model.bear.upside)}`,
    "calc.perShareBull": sar(model.bull.perShare),
    "calc.perShareBear": sar(model.bear.perShare),
    "calc.wacc": pct(model.wacc),
    "calc.costOfEquity": pct(model.ke),
    "calc.riskFreeRate": pct(model.rf),
    "calc.equityRiskPremium": pct(model.erp),
    "calc.beta": `${model.beta.toFixed(2)}x`,
    "calc.terminalGrowth": pct(model.base.g),
    "calc.terminalGrowthBull": pct(model.bull.g),
    "calc.terminalGrowthBear": pct(model.bear.g),
    "calc.irrBase": pct(model.base.irr),
    "calc.irrBull": pct(model.bull.irr),
    "calc.irrBear": pct(model.bear.irr),
    "calc.weightedReturn": pct(model.weightedReturn),
    "calc.weightedPerShare": sar(model.weightedPerShare),
    "calc.hurdle": `${model.ic.hurdle.toFixed(1)}%`,
    "calc.riskScore": model.riskScore.toFixed(1),
    "calc.shariahStatus": model.shariah.pass ? "PASS" : "REVIEW",
    "calc.debtRatio": pct2(model.shariah.debtRatio),
    "calc.cashRatio": pct2(model.shariah.cashRatio),
    "calc.leaseInclRatio": pct2(model.shariah.leaseInclRatio),
    "calc.netCash": sarM(model.netCash),
    "calc.sharesOutstanding": `${model.shares.toFixed(1)}m shares`,
    "calc.compsMin": sar(model.comps.field.min),
    "calc.compsMedian": sar(model.comps.field.median),
    "calc.compsMax": sar(model.comps.field.max),
    "calc.gmvGrowthFy25": pct(model.gmv[2]! / model.gmv[1]! - 1),
    "calc.ordersGrowthFy25": pct(model.orders[2]! / model.orders[1]! - 1),
    "calc.netRevGrowthFy25": pct(model.netRev[2]! / model.netRev[1]! - 1),
    "calc.netIncomeDeclineFy25Magnitude": `${Math.abs(inputs.get("fy25.net_income_yoy")!.value).toFixed(1)}%`,
    "calc.q1LossMagnitude": sarM(Math.abs(inputs.get("q1_26.net_loss")!.value)),
    "calc.ebitdaMarginContractionBps": `${Math.round((marginFy24 - marginFy25) * 100)}`,
  });

  return facts;
}

/** Structural subset of `xlsx.ts`'s `ModelResult` that narrative-fact building needs. */
export interface NarrativeModel {
  rf: number;
  erp: number;
  beta: number;
  ke: number;
  wacc: number;
  price: number;
  shares: number;
  netCash: number;
  gmv: number[];
  orders: number[];
  netRev: number[];
  base: { perShare: number; upside: number; irr: number; g: number };
  bull: { perShare: number; upside: number; irr: number; g: number };
  bear: { perShare: number; upside: number; irr: number; g: number };
  weightedPerShare: number;
  weightedReturn: number;
  comps: { field: { min: number; median: number; max: number } };
  shariah: {
    debtRatio: number;
    cashRatio: number;
    leaseInclRatio: number;
    pass: boolean;
  };
  riskScore: number;
  ic: { hurdle: number };
}

/** Looks up one fact, throwing (not returning `undefined`) if the key is missing. */
export function fact(facts: NarrativeFacts, key: string): string {
  const value = facts[key];
  if (value === undefined) {
    throw new Error(`Unresolved narrative placeholder: {${key}}`);
  }
  return value;
}

/** Substitutes every `{key}` in `template` from `facts`; throws on an unresolved key. */
export function resolveNarrative(
  template: string,
  facts: NarrativeFacts,
): string {
  return template.replace(/\{([a-zA-Z0-9_.]+)\}/g, (_match, key: string) => {
    const value = facts[key];
    if (value === undefined) {
      throw new Error(`Unresolved narrative placeholder: {${key}}`);
    }
    return value;
  });
}

/**
 * Deep-resolves every string leaf of an arbitrarily-nested `narratives.json`
 * value (object / array / string) in one call, so docx.ts/pptx.ts can resolve
 * a whole memo section or slide block without touching each field by hand.
 */
export function resolveNarrativeTree<T>(value: T, facts: NarrativeFacts): T {
  if (typeof value === "string") {
    return resolveNarrative(value, facts) as unknown as T;
  }
  if (Array.isArray(value)) {
    return value.map((v) => resolveNarrativeTree(v, facts)) as unknown as T;
  }
  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = resolveNarrativeTree(v, facts);
    }
    return out as T;
  }
  return value;
}

// ═══════════════════════════ quantified risk register ══════════════════════
// MUST mirror xlsx.ts's buildScenarios() risk() rows (Scenarios & Risk tab) so
// the workbook, memo and deck all show the identical six-item register.
export interface RiskRegisterItem {
  name: string;
  probability: number; // 1-5
  impact: number; // 1-5
  mitigation: string;
  cite: string;
}

export const riskRegister: RiskRegisterItem[] = [
  {
    name: "Price-war margin compression (Keeta/Meituan-funded discounting)",
    probability: 4,
    impact: 4,
    mitigation:
      "Shift to cost discipline & logistics mix; monitor take-rate and contribution margin per order",
    cite: "industry-news-pack p.2, p.4",
  },
  {
    name: "Well-capitalised new entrants (Rabbit, Ninja unicorn, Dingdong)",
    probability: 4,
    impact: 3,
    mitigation: "Scale & fulfilment-density moat; Snoonu regional expansion",
    cite: "industry-news-pack p.2",
  },
  {
    name: "Earnings volatility / one-offs (SAR 55m Q4-25; Q1-26 net loss)",
    probability: 3,
    impact: 3,
    mitigation:
      "One-offs largely non-recurring; H2-2026 profitability guidance",
    cite: "industry-news-pack p.4; fy25-earnings-call p.6",
  },
  {
    name: "Snoonu integration / near-term margin dilution",
    probability: 3,
    impact: 3,
    mitigation:
      "Snoonu FY25 adj. EBITDA +53.7m (profitable), accretive at scale",
    cite: "fy25-er p.6",
  },
  {
    name: "Valuation-data ambiguity (203m vs 217m shares; 92.8x trailing P/E)",
    probability: 2,
    impact: 2,
    mitigation:
      "Reconcile Tadawul share register; use normalised/forward multiples",
    cite: "market-data-comps p.2",
  },
  {
    name: "WACC / terminal-value sensitivity (value ∝ WACC−g spread)",
    probability: 3,
    impact: 4,
    mitigation:
      "Sensitivity grid; conservative g=3.0%; bottom-up beta as next step",
    cite: "Sensitivity tab; Assumptions",
  },
];
