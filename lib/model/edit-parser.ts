/**
 * lib/model/edit-parser, the scripted-first, offline-deterministic parser that
 * turns a plain-language model-edit instruction into `{assumptionKey, value}`.
 *
 * WS-C (live-model-provenance plan §3). Pure + client-safe (no node:fs, no SDK,
 * no network) so it is unit-testable in isolation and can also run in the
 * browser. The `/api/model-edit` route wraps this with the (live-only) Claude
 * fallback + audit; this module owns the whitelist, bounds, value normalization
 * and the EN+AR pattern matcher for the demo edit set.
 *
 * The whitelist is the SINGLE SOURCE OF TRUTH for what may be edited: scalar
 * assumption keys + per-year array keys (index bounds derived from
 * BASE_ASSUMPTIONS' array lengths). Anything else, a sourced actual, a typo, a
 * hallucinated key from the live fallback, is rejected before it can reach the
 * recompute. Sourced actuals (FY23–25 revenue/GMV/EBITDA, the share price) are
 * detected and returned as a graceful "source-locked" outcome; they never map
 * to a writable key.
 */
import { BASE_ASSUMPTIONS } from "@/lib/model/compute";
import type { Assumptions } from "@/lib/model/types";
import type { Lang } from "@/lib/types";

export interface EditPair {
  assumptionKey: string;
  value: number;
}

export type EditParse =
  | {
      kind: "edit";
      assumptionKey: string;
      value: number;
      /** companion edits, scenario-probability rebalance so Σprob stays 1 */
      also?: EditPair[];
    }
  | { kind: "source-locked"; target: string }
  | { kind: "unparsed" };

// ─────────────────────────── whitelist + bounds ───────────────────────────
// Bounds are in Assumptions-NATIVE units (decimals for rates, integer years,
// raw score for riskWeights). Every editable field must appear here; the shape
// (which fields are scalar vs array, and each array's length) is asserted
// against BASE_ASSUMPTIONS by the unit tests, so the two can never drift.

type FieldKind = "rate" | "years" | "score";
interface FieldSpec {
  kind: FieldKind;
  /** inclusive clamp bounds (native units) */ min: number;
  max: number;
}

/** documented sane bounds, see README/plan §3 WS-C. */
const SCALAR_SPECS: Record<string, FieldSpec> = {
  spread: { kind: "rate", min: 0, max: 0.1 }, // cost-of-debt spread 0–10pp
  zakat: { kind: "rate", min: 0, max: 0.3 }, // tax/zakat rate 0–30%
  g: { kind: "rate", min: 0, max: 0.08 }, // terminal growth < 8% (must stay < WACC)
  gBull: { kind: "rate", min: 0, max: 0.08 },
  gBear: { kind: "rate", min: 0, max: 0.08 },
  holdYears: { kind: "years", min: 1, max: 10 },
  dnaRate: { kind: "rate", min: 0, max: 0.2 },
  capexRate: { kind: "rate", min: 0, max: 0.2 },
  nwcRate: { kind: "rate", min: 0, max: 0.2 },
  bullMarginDelta: { kind: "rate", min: -0.1, max: 0.1 },
  bearMarginDelta: { kind: "rate", min: -0.1, max: 0.1 },
  probBull: { kind: "rate", min: 0, max: 1 }, // probabilities 0..1
  probBase: { kind: "rate", min: 0, max: 1 },
  probBear: { kind: "rate", min: 0, max: 1 },
  ebitdaMarginTerminal: { kind: "rate", min: 0, max: 0.5 },
};

const ARRAY_SPECS: Record<string, FieldSpec> = {
  ordersGrowth: { kind: "rate", min: -0.5, max: 1.5 },
  aovGrowth: { kind: "rate", min: -0.5, max: 1 },
  netRevRate: { kind: "rate", min: 0, max: 1 }, // net revenue / GMV ratio
  ebitdaMargin: { kind: "rate", min: -0.3, max: 0.6 },
  bullRevDelta: { kind: "rate", min: -0.2, max: 0.2 },
  bearRevDelta: { kind: "rate", min: -0.2, max: 0.2 },
  riskWeights: { kind: "score", min: 0, max: 25 }, // P×I, each 1–5
};

/** array index bounds, derived from BASE_ASSUMPTIONS (the single source of truth). */
const ARRAY_LEN: Record<string, number> = Object.fromEntries(
  Object.entries(BASE_ASSUMPTIONS)
    .filter(([, v]) => Array.isArray(v))
    .map(([k, v]) => [k, (v as number[]).length]),
);

function clamp(x: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, x));
}

/** The spec for an assumption FIELD name (scalar or array base), or null. */
export function fieldSpec(field: string): FieldSpec | null {
  return SCALAR_SPECS[field] ?? ARRAY_SPECS[field] ?? null;
}

/**
 * The hard whitelist gate. Accepts a dotted assumptionKey + a value already in
 * NATIVE units; returns the clamped value if the key is legal (scalar key, or
 * array key with an in-bounds index) and the value is finite, else null. Used
 * by both the scripted path and to re-validate the live fallback's output.
 */
export function validateEdit(
  assumptionKey: string,
  nativeValue: number,
): { assumptionKey: string; value: number } | null {
  if (typeof assumptionKey !== "string" || !Number.isFinite(nativeValue)) {
    return null;
  }
  const dot = assumptionKey.indexOf(".");
  if (dot === -1) {
    const spec = SCALAR_SPECS[assumptionKey];
    if (!spec) return null;
    return { assumptionKey, value: clamp(nativeValue, spec.min, spec.max) };
  }
  const field = assumptionKey.slice(0, dot);
  const spec = ARRAY_SPECS[field];
  const len = ARRAY_LEN[field];
  if (!spec || len === undefined) return null;
  const idx = Number(assumptionKey.slice(dot + 1));
  if (!Number.isInteger(idx) || idx < 0 || idx >= len) return null;
  return { assumptionKey, value: clamp(nativeValue, spec.min, spec.max) };
}

/** Every legal assumptionKey, scalar keys + expanded array indices. */
export function whitelistKeys(): string[] {
  const keys = Object.keys(SCALAR_SPECS);
  for (const [field, len] of Object.entries(ARRAY_LEN)) {
    if (!ARRAY_SPECS[field]) continue;
    for (let i = 0; i < len; i++) keys.push(`${field}.${i}`);
  }
  return keys;
}

// ─────────────────────────── value normalization ───────────────────────────

const AR_DIGITS: Record<string, string> = {
  "٠": "0",
  "١": "1",
  "٢": "2",
  "٣": "3",
  "٤": "4",
  "٥": "5",
  "٦": "6",
  "٧": "7",
  "٨": "8",
  "٩": "9",
  "٫": ".", // Arabic decimal separator
};

/** Arabic-Indic digits/decimal → Western, so the numeric matchers are locale-free. */
export function normalizeDigits(s: string): string {
  return s.replace(/[٠-٩٫]/g, (c) => AR_DIGITS[c] ?? c);
}

interface RawNum {
  value: number;
  hasPercent: boolean; // %, ٪, "percent", "pp"
  hasBps: boolean; // basis points
}

/** Pull the target number (prefers the token after a connective like "to"/"إلى"). */
function extractNumber(raw: string): RawNum | null {
  const t = normalizeDigits(raw).toLowerCase();
  const re =
    /(-?\d+(?:\.\d+)?)\s*(%|٪|percent|pp|bps|bn|billion|m|million|k)?/g;
  const matches = [...t.matchAll(re)].filter((m) => m[1] !== undefined);
  if (matches.length === 0) return null;

  let chosen = matches[matches.length - 1]!;
  const connective = /(?:\bto\b|=|→|إلى|الى|بنسبة|عند|تصبح|ليصبح|لتصبح)/;
  const cIdx = t.search(connective);
  if (cIdx >= 0) {
    const after = matches.find((m) => (m.index ?? 0) >= cIdx);
    if (after) chosen = after;
  }

  const value = Number(chosen[1]);
  if (!Number.isFinite(value)) return null;
  const unit = chosen[2] ?? "";
  return {
    value,
    hasPercent: /^(%|٪|percent|pp)$/.test(unit),
    hasBps: unit === "bps",
  };
}

/** RawNum → native units for the target field's kind. */
function toNative(spec: FieldSpec, n: RawNum): number {
  if (spec.kind === "years") return Math.round(n.value);
  if (spec.kind === "score") return n.value;
  // rate: express as a decimal
  if (n.hasBps) return n.value / 10000; // 200 bps → 0.02
  if (n.hasPercent) return n.value / 100; // 20% / 20pp → 0.20
  if (Math.abs(n.value) < 1) return n.value; // already a decimal (0.035)
  return n.value / 100; // bare "20" on a rate field → 20% → 0.20
}

// ─────────────────────────── metric + year matchers ───────────────────────────

interface MetricRule {
  field: string;
  array: boolean;
  re: RegExp;
}

// Order matters: more specific patterns first (terminal-margin before margin,
// bull/bear-terminal before plain terminal growth, etc.).
const METRICS: MetricRule[] = [
  // per-year drivers
  {
    field: "ordersGrowth",
    array: true,
    re: /order(?:s)?\s*growth|growth\s+in\s+orders|نمو\s*(?:ال)?طلبات/,
  },
  {
    field: "aovGrowth",
    array: true,
    re: /aov\s*growth|average\s+order\s+value\s+growth|basket\s*growth|نمو\s*متوسط\s*(?:قيمة\s*)?الطلب/,
  },
  {
    field: "netRevRate",
    array: true,
    re: /net[-\s]*rev(?:enue)?\s*(?:rate|monet\w*)|monetization|monetisation|نسبة\s*صافي\s*الإيراد|نسبة\s*التسييل|التسييل/,
  },
  {
    field: "ebitdaMarginTerminal",
    array: false,
    re: /terminal\s*ebitda\s*margin|هامش\s*(?:الإيبيتدا|ايبيتدا|إيبيتدا)\s*النهائي/,
  },
  {
    field: "ebitdaMargin",
    array: true,
    re: /ebitda\s*margin|هامش\s*(?:الأرباح\s*التشغيلية|الإيبيتدا|ايبيتدا|إيبيتدا)/,
  },
  // scalar drivers
  {
    field: "gBull",
    array: false,
    re: /bull\s*(?:case\s*)?terminal\s*growth|terminal\s*growth\s*(?:for\s*(?:the\s*)?)?bull|النمو\s*النهائي\s*(?:المتفائل|الصاعد)/,
  },
  {
    field: "gBear",
    array: false,
    re: /bear\s*(?:case\s*)?terminal\s*growth|terminal\s*growth\s*(?:for\s*(?:the\s*)?)?bear|النمو\s*النهائي\s*(?:المتشائم|الهابط)/,
  },
  {
    field: "g",
    array: false,
    re: /terminal\s*growth|long[-\s]*run\s*growth|gordon\s*growth|النمو\s*النهائي|النمو\s*طويل\s*الأجل/,
  },
  {
    field: "holdYears",
    array: false,
    re: /hold(?:ing)?\s*(?:period|years|horizon)|فترة\s*(?:ال)?احتفاظ|مدة\s*الاحتفاظ/,
  },
  {
    field: "spread",
    array: false,
    re: /(?:cost\s*of\s*debt|credit|debt)\s*spread|\bspread\b|هامش\s*(?:تكلفة\s*)?الدين|فرق\s*العائد/,
  },
  {
    field: "zakat",
    array: false,
    re: /zakat|الزكاة|معدل\s*الزكاة|نسبة\s*الزكاة/,
  },
  {
    field: "dnaRate",
    array: false,
    re: /d\s*&\s*a|d&a|depreciation|amorti[sz]ation|الإهلاك|الاستهلاك/,
  },
  {
    field: "capexRate",
    array: false,
    re: /capex|capital\s*expenditure|النفقات\s*الرأسمالية|المصروفات\s*الرأسمالية/,
  },
  {
    field: "nwcRate",
    array: false,
    re: /working\s*capital|\bnwc\b|رأس\s*المال\s*العامل/,
  },
  {
    field: "probBull",
    array: false,
    re: /bull\s*(?:case\s*)?(?:probability|weight|likelihood)|(?:probability|weight)\s*(?:of\s*(?:the\s*)?)?bull|احتمال\s*(?:الحالة\s*)?المتفائل(?:ة)?|وزن\s*(?:الحالة\s*)?المتفائل/,
  },
  {
    field: "probBear",
    array: false,
    re: /bear\s*(?:case\s*)?(?:probability|weight|likelihood)|(?:probability|weight)\s*(?:of\s*(?:the\s*)?)?bear|احتمال\s*(?:الحالة\s*)?المتشائم(?:ة)?|وزن\s*(?:الحالة\s*)?المتشائم/,
  },
  {
    field: "probBase",
    array: false,
    re: /base\s*(?:case\s*)?(?:probability|weight|likelihood)|(?:probability|weight)\s*(?:of\s*(?:the\s*)?)?base|احتمال\s*(?:الحالة\s*)?الأساسي(?:ة)?|وزن\s*(?:الحالة\s*)?الأساسي/,
  },
  {
    field: "bullMarginDelta",
    array: false,
    re: /bull\s*margin\s*(?:delta|shift|uplift)|تعديل\s*هامش\s*المتفائل/,
  },
  {
    field: "bearMarginDelta",
    array: false,
    re: /bear\s*margin\s*(?:delta|shift|haircut)|تعديل\s*هامش\s*المتشائم/,
  },
];

const FORECAST_YEARS: [RegExp, number][] = [
  [
    /\bfy\s*'?26\b|\bfy\s*'?2026\b|\b2026\b|first\s*(?:forecast\s*)?year|year\s*(?:one|1)\b|السنة\s*الأولى|العام\s*الأول/,
    0,
  ],
  [
    /\bfy\s*'?27\b|\bfy\s*'?2027\b|\b2027\b|second\s*year|year\s*(?:two|2)\b|السنة\s*الثانية/,
    1,
  ],
  [
    /\bfy\s*'?28\b|\bfy\s*'?2028\b|\b2028\b|third\s*year|year\s*(?:three|3)\b|السنة\s*الثالثة/,
    2,
  ],
  [
    /\bfy\s*'?29\b|\bfy\s*'?2029\b|\b2029\b|fourth\s*year|year\s*(?:four|4)\b|السنة\s*الرابعة/,
    3,
  ],
  [
    /\bfy\s*'?30\b|\bfy\s*'?2030\b|\b2030\b|fifth\s*year|final\s*(?:forecast\s*)?year|last\s*year|السنة\s*الخامسة|السنة\s*الأخيرة/,
    4,
  ],
];

function forecastYearIndex(t: string): number | null {
  for (const [re, idx] of FORECAST_YEARS) if (re.test(t)) return idx;
  return null;
}

function mentionsActualYear(t: string): boolean {
  return /\bfy\s*'?2[345]\b|\bfy\s*'?202[345]\b|\b202[345]\b/.test(t);
}

// ─────────────────────────── source-locked detection ───────────────────────────
// Sourced actuals (immutable): the share price and the reported revenue / GMV /
// EBITDA / net-income / AOV / order figures. Only reached AFTER metric matching,
// so an assumption phrasing ("order growth", "EBITDA margin") wins first.

const LOCK_PATTERNS: { re: RegExp; target: string }[] = [
  {
    re: /share\s*price|stock\s*price|current\s*price|market\s*price|سعر\s*السهم|السعر\s*السوقي/,
    target: "price",
  },
  {
    re: /\bgmv\b|gross\s*merchandise|إجمالي\s*قيمة\s*(?:البضائع|المبيعات)|القيمة\s*الإجمالية/,
    target: "gmv",
  },
  {
    re: /net\s*income|صافي\s*(?:الدخل|الربح)/,
    target: "netIncome",
  },
  {
    re: /\brevenue\b|revenues|صافي\s*الإيراد|إيراد/,
    target: "revenue",
  },
  {
    re: /\bebitda\b|الأرباح\s*قبل\s*الفوائد|ايبيتدا|إيبيتدا/,
    target: "ebitda",
  },
  {
    re: /\baov\b|average\s*order\s*value|متوسط\s*قيمة\s*الطلب/,
    target: "aov",
  },
  {
    re: /\borders?\b|عدد\s*الطلبات|الطلبات/,
    target: "orders",
  },
];

function sourceLock(t: string): string | null {
  for (const { re, target } of LOCK_PATTERNS) if (re.test(t)) return target;
  return null;
}

// ─────────────────────────── the parser ───────────────────────────

/**
 * Scripted, offline-deterministic parse. `assumptions` (optional) is only used
 * for relative edits ("increase … by 2pp"); absolute edits ("… to 20%") do not
 * need it. `lang` is accepted for symmetry with the route (the matchers handle
 * EN + AR regardless).
 */
export function parseEdit(
  instruction: string,
  _lang: Lang,
  assumptions?: Assumptions,
): EditParse {
  const raw = instruction ?? "";
  const t = normalizeDigits(raw).toLowerCase();

  const metric = METRICS.find((m) => m.re.test(t));
  if (metric) {
    const spec = metric.array
      ? ARRAY_SPECS[metric.field]
      : SCALAR_SPECS[metric.field];
    if (!spec) return { kind: "unparsed" };
    const num = extractNumber(raw);
    if (!num) return { kind: "unparsed" };

    let idx: number | null = null;
    if (metric.array) {
      idx = forecastYearIndex(t);
      if (idx === null) {
        // A per-year driver pinned to an ACTUAL year (FY23–25) is out of the
        // editable forecast window, treat as source-locked, not a silent FY26.
        if (mentionsActualYear(t))
          return { kind: "source-locked", target: metric.field };
        idx = 0; // no year given → first forecast year (FY26E)
      }
    }
    const key = metric.array ? `${metric.field}.${idx}` : metric.field;

    // relative edit ("increase … by 2pp") when a delta connective is present
    let native = toNative(spec, num);
    if (
      /\bby\b|بمقدار|بمعدل/.test(t) &&
      !/\bto\b|=|إلى|الى|تصبح|ليصبح|لتصبح/.test(t)
    ) {
      const cur = currentValue(assumptions, metric.field, idx);
      if (cur !== undefined) {
        const sign =
          /decrease|reduce|lower|cut|drop|trim|خفض|اخفض|قلل|انقص/.test(t)
            ? -1
            : 1;
        native = cur + sign * Math.abs(native);
      }
    }

    const validated = validateEdit(key, native);
    if (!validated) return { kind: "unparsed" };
    return {
      kind: "edit",
      assumptionKey: validated.assumptionKey,
      value: validated.value,
      ...rebalanceIfProb(
        validated.assumptionKey,
        validated.value,
        assumptions ?? BASE_ASSUMPTIONS,
      ),
    };
  }

  const locked = sourceLock(t);
  if (locked) return { kind: "source-locked", target: locked };

  return { kind: "unparsed" };
}

// ─────────────────────── scenario-probability rebalance ───────────────────────

export const PROB_KEYS = ["probBull", "probBase", "probBear"] as const;

/**
 * Editing one scenario probability proportionally rebalances the other two so
 * Σprob stays EXACTLY 1, non-normalized weights would make the weighted
 * per-share / IRR mathematically wrong. If the other two currently sum to 0
 * the remainder is split evenly.
 */
export function rebalanceProbabilities(
  a: Assumptions,
  assumptionKey: string,
  value: number,
): EditPair[] {
  const others = PROB_KEYS.filter((k) => k !== assumptionKey);
  const rest = Math.max(0, 1 - value);
  const sumOthers = others.reduce((s, k) => s + a[k], 0);
  return others.map((k) => ({
    assumptionKey: k,
    value: sumOthers > 0 ? (a[k] * rest) / sumOthers : rest / others.length,
  }));
}

function rebalanceIfProb(
  assumptionKey: string,
  value: number,
  a: Assumptions,
): { also?: EditPair[] } {
  if (!(PROB_KEYS as readonly string[]).includes(assumptionKey)) return {};
  return { also: rebalanceProbabilities(a, assumptionKey, value) };
}

function currentValue(
  a: Assumptions | undefined,
  field: string,
  idx: number | null,
): number | undefined {
  if (!a) return undefined;
  const v = (a as unknown as Record<string, unknown>)[field];
  if (Array.isArray(v))
    return idx === null ? undefined : (v[idx] as number | undefined);
  return typeof v === "number" ? v : undefined;
}

/** Compact human display of a native value for audit detail / summaries. */
export function displayNative(field: string, value: number): string {
  const spec = fieldSpec(field);
  if (!spec) return String(value);
  if (spec.kind === "rate") return `${(value * 100).toFixed(1)}%`;
  if (spec.kind === "years") return `${value} yrs`;
  return String(value);
}

/** The base field name of a dotted key ("ordersGrowth.0" → "ordersGrowth"). */
export function baseField(assumptionKey: string): string {
  const dot = assumptionKey.indexOf(".");
  return dot === -1 ? assumptionKey : assumptionKey.slice(0, dot);
}
