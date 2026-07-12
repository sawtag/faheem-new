/**
 * Shared generation helpers — Lunar-branded Office artifacts (xlsx / docx / pptx).
 *
 * AGENTS.md rule 4 carve-out: Office file formats have no CSS variables, so the
 * Lunar brand palette lives in ONE place — the `lunarBrand` constant below.
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
  // charcoal family — header bands, titles, ink
  charcoal: "2A2620",
  charcoalDeep: "1C1914",
  charcoalMid: "514B40",
  ink: "2A2620",
  inkMuted: "6B6455",
  // gold family — rules, accents, assumption highlight
  gold: "B08D2A",
  goldLight: "C9A94E",
  goldPale: "EFE6CE", // assumption-cell tint (analyst judgment)
  // warm neutrals — paper, sourced-cell tint, borders, cream text on charcoal
  cream: "F5F1E6", // text/rule on the charcoal band
  paper: "FBF9F4", // warm section-band background
  sourcedTint: "F3F0E9", // sourced-cell tint (subtle warm grey)
  band: "EDE8DC", // sub-header band
  border: "D8D2C4",
  borderStrong: "B7AF9C",
  white: "FFFFFF",
  // muted status colours (old-money register — no neon)
  positive: "3E6B49",
  negative: "9B3A2E",
  warn: "9A7B25",
  // typography — serif display for the "old-money PE" headings, safe sans for data
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
/** A `{ sourceDoc, page }`-shaped record — a real ModelInput or a market datum. */
export interface Sourced {
  sourceDoc: string;
  page: number;
}

/** "Source: <doc title EN>, p.<n>" — the load-bearing sourced-cell comment line. */
export function sourceLabel(input: Sourced): string {
  return `Source: ${docTitleEn(input.sourceDoc)}, p.${input.page}`;
}

/** "faheem://doc/<id>/<page>" — deep-links into Faheem's in-app PDF viewer. */
export function faheemDeepLink(docId: string, page: number): string {
  return `faheem://doc/${docId}/${page}`;
}

/** Full sourced-cell note: the source line plus a clickable Faheem deep-link. */
export function sourceComment(input: Sourced): string {
  return `${sourceLabel(input)}\nOpen in Faheem — ${faheemDeepLink(
    input.sourceDoc,
    input.page,
  )}`;
}

/** Assumption-cell note: analyst judgment, no clean source, with the rationale. */
export function assumptionComment(rationale: string): string {
  return `Assumption — analyst judgment: ${rationale}`;
}
