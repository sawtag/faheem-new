/**
 * Pure, React-free helpers for the inline data-viz layer (unit-tested against
 * every markdown table extracted from data/demo-cache in tests/chat/chart-data.test.ts):
 *
 *   parseNumericCell, "SAR 193.0m" → 193 · "−22.8%" → -22.8 · "(5.0)" → -5 · "5 / 10" → 5
 *   parseMarkdownTable, pipe block → { headers, rows, malformed } (streaming-safe)
 *   classifyTable, decides if a table is chartable and how (grouped/bar + hurdle line)
 *   buildJahezAnalytics, the Jahez workspace-overview panels, straight from model-inputs.json
 *
 * Every displayed figure keeps its source: this module only extracts and shapes
 * numbers that already exist in the recorded answers / model-inputs (AGENTS.md
 * rule 5, never invents a value).
 */
import type { ModelInput } from "@/lib/types";

// ─────────────────────────────── cell parsing ───────────────────────────────

/** Which axis a value belongs on, bars only ever share ONE family (honest axis). */
export type UnitFamily =
  "currency" | "percent" | "pp" | "score" | "number" | "none";

export interface NumericParse {
  /** normalized magnitude (currency scaled to millions, sign applied); null if no number */
  value: number | null;
  unit: UnitFamily;
  negative: boolean;
  /** the original cell was wrapped in parentheses, an accounting negative */
  parenthesized: boolean;
}

const EMPTY: NumericParse = {
  value: null,
  unit: "none",
  negative: false,
  parenthesized: false,
};

/** Strip markdown bold + `[[n]]` citation markers + nbsp, trim. Display-safe. */
export function cleanCellText(raw: string): string {
  return raw
    .replace(/\*\*/g, "")
    .replace(/\[\[\d+\]\]/g, "")
    .replace(/ /g, " ")
    .trim();
}

/**
 * Extract the numeric value + unit family from a single table cell. Tolerates
 * the full vocabulary the recorded answers use: currency prefixes ("SAR"),
 * scale suffixes (m/bn/k → normalized to millions), the U+2212 minus, bold
 * markers, trailing citation chips, parenthesised negatives, "pp" deltas, and
 * "5 / 10" scores (numerator taken).
 */
export function parseNumericCell(raw: string): NumericParse {
  let s = cleanCellText(raw).replace(/−/g, "-");
  if (!s) return EMPTY;

  let parenthesized = false;
  const paren = /^\((.*)\)$/.exec(s);
  if (paren) {
    parenthesized = true;
    s = paren[1]!.trim();
  }

  let unit: UnitFamily;
  if (/(?:^|\s|\d)(pp|bps)\b|percentage points?/i.test(s)) unit = "pp";
  else if (s.includes("%")) unit = "percent";
  else if (/\d\s*\/\s*\d/.test(s)) unit = "score";
  else if (/(sar|usd|eur|gbp|aed|\$|€|£)/i.test(s)) unit = "currency";
  else unit = "number";

  const m = /(-?)\s*(\d[\d,]*(?:\.\d+)?)/.exec(s);
  if (!m) {
    return {
      value: null,
      unit: unit === "number" ? "none" : unit,
      negative: parenthesized,
      parenthesized,
    };
  }

  const leadNegative = m[1] === "-" || /-/.test(s.slice(0, m.index));
  let value = parseFloat(m[2]!.replace(/,/g, ""));

  if (unit === "currency") {
    if (/\d\s*(?:bn|b)\b/i.test(s)) value *= 1000;
    else if (/\d\s*k\b/i.test(s)) value *= 0.001;
    // "m"/"mn"/none → millions base (×1)
  }

  const negative = leadNegative || parenthesized;
  if (negative) value = -Math.abs(value);
  return { value, unit, negative, parenthesized };
}

// ─────────────────────────────── table parsing ───────────────────────────────

export interface ParsedTable {
  headers: string[];
  /** each row is exactly `headers.length` cells (ragged rows drop the table) */
  rows: string[][];
  /** true when a non-trailing data row had the wrong cell count → render as prose */
  malformed: boolean;
}

function splitRow(line: string): string[] {
  let s = line.trim();
  if (s.startsWith("|")) s = s.slice(1);
  if (s.endsWith("|")) s = s.slice(0, -1);
  return s.split("|").map((c) => c.trim());
}

const DIVIDER_CELL = /^:?-{2,}:?$/;
function isDividerRow(cells: string[]): boolean {
  return (
    cells.length > 0 &&
    cells.every((c) => DIVIDER_CELL.test(c.replace(/\s/g, "")))
  );
}

/** Is this line the start of a GitHub-style table (a pipe row followed by a `---` divider)? */
export function isTableStart(line: string, next: string | undefined): boolean {
  return /\|/.test(line) && next !== undefined && isDividerRow(splitRow(next));
}

/**
 * Parse a contiguous block of pipe lines into a table. Returns null when it
 * isn't a real markdown table (no divider row / <2 columns). A trailing row
 * with too few cells is treated as still-streaming and dropped; any other
 * cell-count mismatch marks the table `malformed` so the caller falls back to
 * prose (never renders a broken grid).
 */
export function parseMarkdownTable(
  input: string | string[],
): ParsedTable | null {
  const lines = (Array.isArray(input) ? input : input.split("\n"))
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length < 2) return null;
  if (!lines.every((l) => l.includes("|"))) return null;

  const headers = splitRow(lines[0]!);
  const n = headers.length;
  if (n < 2) return null;
  if (!isDividerRow(splitRow(lines[1]!))) return null;

  const dataLines = lines.slice(2);
  const rows: string[][] = [];
  let malformed = false;
  dataLines.forEach((line, idx) => {
    const cells = splitRow(line);
    if (cells.length === n) rows.push(cells);
    else if (cells.length < n && idx === dataLines.length - 1) {
      // trailing partial row, still arriving during streaming, ignore
    } else malformed = true;
  });

  return { headers, rows, malformed };
}

// ─────────────────────────── column classification ───────────────────────────

const DELTA_HEADER_RE =
  /^\s*(δ|Δ|delta|change|chg\.?|yoy|y\/y|var\.?|variance|%\s*chg|growth)\s*$/i;

export function isDeltaHeader(header: string): boolean {
  return DELTA_HEADER_RE.test(cleanCellText(header));
}

function columnCells(table: ParsedTable, col: number): string[] {
  return table.rows.map((r) => r[col] ?? "");
}

/** A column whose data cells are ≥50% numeric, right-aligned in the rendered table. */
export function isNumericColumn(table: ParsedTable, col: number): boolean {
  const cells = columnCells(table, col);
  if (cells.length === 0) return false;
  const numeric = cells.filter(
    (c) => parseNumericCell(c).value !== null,
  ).length;
  return numeric / cells.length >= 0.5;
}

/** A "change" column (header says so, or its cells are mostly pp / signed), excluded from chart series. */
export function isDeltaColumn(table: ParsedTable, col: number): boolean {
  if (isDeltaHeader(table.headers[col] ?? "")) return true;
  const parsed = columnCells(table, col)
    .map((c) => ({ text: cleanCellText(c), p: parseNumericCell(c) }))
    .filter((x) => x.p.value !== null);
  if (parsed.length === 0) return false;
  const deltaish = parsed.filter(
    (x) => x.p.unit === "pp" || /^[−+-]/.test(x.text),
  ).length;
  return deltaish / parsed.length > 0.6;
}

// ─────────────────────────────── chart spec ───────────────────────────────

export interface ChartBar {
  category: string;
  series: string;
  value: number;
  /** original cell text, for the hover tooltip (keeps the exact "SAR 193.0m") */
  display: string;
  negative: boolean;
}

export interface ChartSpec {
  kind: "grouped-bar" | "bar";
  unit: UnitFamily;
  categories: string[];
  series: string[];
  bars: ChartBar[];
  hurdle?: { value: number; label: string };
  /** rows dropped because their unit didn't match the charted axis (→ caption) */
  omittedRows: number;
}

const CHARTABLE: ReadonlySet<UnitFamily> = new Set([
  "currency",
  "percent",
  "pp",
  "score",
  "number",
]);
const HURDLE_LABEL_RE = /hurdle|threshold|target|minimum|benchmark/i;

/** The single unit shared by every series cell of a row, or "mixed"/"none". */
function rowFamily(
  table: ParsedTable,
  rowIdx: number,
  seriesCols: number[],
): UnitFamily | "mixed" {
  const units = seriesCols
    .map((c) => parseNumericCell(table.rows[rowIdx]![c] ?? ""))
    .filter((p) => p.value !== null)
    .map((p) => p.unit);
  if (units.length === 0) return "none";
  const first = units[0]!;
  return units.every((u) => u === first) ? first : "mixed";
}

/**
 * Decide whether a table becomes a chart, and shape it.
 *
 *  - label column (col 0) + ≥2 numeric non-delta columns → grouped bar chart
 *  - label column + 1 numeric non-delta column           → bar chart
 *  - a "hurdle/threshold" row (single %) becomes a dashed reference line
 *
 * To keep the y-axis honest, only the rows whose series cells share ONE unit
 * family are charted (the dominant family wins ties by first appearance); the
 * rest are reported via `omittedRows` so the renderer can caption them. Returns
 * null when nothing sensible can be drawn (<2 bars, no numeric columns, …).
 */
export function classifyTable(table: ParsedTable): ChartSpec | null {
  if (table.malformed || table.rows.length < 2 || table.headers.length < 2) {
    return null;
  }

  const seriesCols: number[] = [];
  for (let c = 1; c < table.headers.length; c++) {
    if (isNumericColumn(table, c) && !isDeltaColumn(table, c))
      seriesCols.push(c);
  }
  if (seriesCols.length === 0) return null;

  // Pull out a hurdle/threshold row (a single percent reference line).
  let hurdle: ChartSpec["hurdle"];
  const dataRowIdx: number[] = [];
  table.rows.forEach((row, i) => {
    const label = cleanCellText(row[0] ?? "");
    const first = parseNumericCell(row[seriesCols[0]!] ?? "");
    if (
      !hurdle &&
      HURDLE_LABEL_RE.test(label) &&
      first.value !== null &&
      first.unit === "percent"
    ) {
      hurdle = { value: first.value, label };
      return;
    }
    dataRowIdx.push(i);
  });

  // Dominant unit family across the remaining rows (first-appearance tiebreak).
  const order: UnitFamily[] = [];
  const counts = new Map<UnitFamily, number>();
  for (const i of dataRowIdx) {
    const fam = rowFamily(table, i, seriesCols);
    if (fam === "mixed" || fam === "none" || !CHARTABLE.has(fam)) continue;
    if (!counts.has(fam)) order.push(fam);
    counts.set(fam, (counts.get(fam) ?? 0) + 1);
  }
  if (order.length === 0) return null;
  const dominant = order.reduce((best, fam) =>
    (counts.get(fam) ?? 0) > (counts.get(best) ?? 0) ? fam : best,
  );

  const chartRowIdx = dataRowIdx.filter(
    (i) => rowFamily(table, i, seriesCols) === dominant,
  );
  const omittedRows = dataRowIdx.length - chartRowIdx.length;
  if (chartRowIdx.length * seriesCols.length < 2) return null;

  const categories = chartRowIdx.map((i) =>
    cleanCellText(table.rows[i]![0] ?? ""),
  );
  const series = seriesCols.map((c) => cleanCellText(table.headers[c] ?? ""));
  const bars: ChartBar[] = [];
  chartRowIdx.forEach((i) => {
    const category = cleanCellText(table.rows[i]![0] ?? "");
    seriesCols.forEach((c, si) => {
      const cell = table.rows[i]![c] ?? "";
      const p = parseNumericCell(cell);
      if (p.value === null) return;
      bars.push({
        category,
        series: series[si]!,
        value: p.value,
        display: cleanCellText(cell),
        negative: p.negative,
      });
    });
  });

  return {
    kind: seriesCols.length >= 2 ? "grouped-bar" : "bar",
    unit: dominant,
    categories,
    series,
    bars,
    ...(hurdle ? { hurdle } : {}),
    omittedRows,
  };
}

// ─────────────────────────────── axis helpers ───────────────────────────────

const NICE_STEPS = [1, 1.5, 2, 2.5, 3, 4, 5, 7.5, 10];

/** Round a max up to a clean axis top (e.g. 7245 → 7500, 250 → 250). */
export function niceMax(max: number): number {
  if (!(max > 0)) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(max)));
  const n = max / pow;
  const step = NICE_STEPS.find((s) => n <= s + 1e-9) ?? 10;
  return step * pow;
}

/** `count`+1 evenly spaced tick values from 0..niceMax(max). */
export function axisTicks(max: number, count = 4): number[] {
  const top = niceMax(max);
  return Array.from({ length: count + 1 }, (_, i) => (top / count) * i);
}

// ───────────────────────── jahez workspace analytics ─────────────────────────

export interface AnalyticsSource {
  docId: string;
  page: number;
  /** secondary source for the FY2023 comparatives (a different filing) */
  fallbackDocId?: string;
}

export interface GroupedSeries {
  /** i18n key under deals.analytics.series.* */
  key: string;
  /** aligned to `periods`; null = value not disclosed for that period (omitted, never faked) */
  values: (number | null)[];
}

export interface GroupedBarData {
  periods: string[];
  series: GroupedSeries[];
  unit: UnitFamily;
  source: AnalyticsSource;
}

export interface LineSeries {
  key: string;
  values: number[];
}

export interface LineData {
  periods: string[];
  series: LineSeries[];
  unit: UnitFamily;
  source: AnalyticsSource;
}

export interface JahezAnalytics {
  growth: GroupedBarData;
  margins: LineData;
}

function inputMap(inputs: ModelInput[]): Map<string, ModelInput> {
  return new Map(inputs.map((i) => [i.key, i]));
}

/**
 * Build the two Jahez overview panels straight from model-inputs.json, every
 * value carries its source, nothing is derived or invented (rule 5).
 *
 * Panel ① (top-line growth): GMV + Net revenue across FY2023–FY2025. GMV and
 * Net revenue are the two size metrics that legibly share ONE linear axis;
 * net income (~SAR 73m vs GMV ~SAR 7,245m) cannot, its collapse is carried by
 * the net-income stat card's YoY delta above and by panel ②'s margin lines,
 * which keeps us to the two-series (navy + accent) design law.
 *
 * Panel ② (profitability): gross margin + Adj. EBITDA margin, FY2024→FY2025,
 * both are disclosed as a single group % in the release; a Q1-26 point is
 * intentionally NOT added (no disclosed group margin for the quarter).
 */
export function buildJahezAnalytics(inputs: ModelInput[]): JahezAnalytics {
  const by = inputMap(inputs);
  const val = (key: string): number | null => by.get(key)?.value ?? null;

  const growth: GroupedBarData = {
    periods: ["FY2023", "FY2024", "FY2025"],
    series: [
      {
        key: "gmv",
        values: [val("fy23.gmv"), val("fy24.gmv"), val("fy25.gmv")],
      },
      {
        key: "netRevenue",
        values: [
          val("fy23.net_revenue"),
          val("fy24.net_revenue"),
          val("fy25.net_revenue"),
        ],
      },
    ],
    unit: "currency",
    source: {
      docId: by.get("fy25.gmv")?.sourceDoc ?? "fy25-er",
      page: by.get("fy25.gmv")?.page ?? 4,
      fallbackDocId: by.get("fy23.gmv")?.sourceDoc ?? "fy24-ar",
    },
  };

  const margins: LineData = {
    periods: ["FY2024", "FY2025"],
    series: [
      {
        key: "grossMargin",
        values: [val("fy24.gross_margin") ?? 0, val("fy25.gross_margin") ?? 0],
      },
      {
        key: "adjEbitdaMargin",
        values: [
          val("fy24.adj_ebitda_margin") ?? 0,
          val("fy25.adj_ebitda_margin") ?? 0,
        ],
      },
    ],
    unit: "percent",
    source: {
      docId: by.get("fy25.adj_ebitda_margin")?.sourceDoc ?? "fy25-er",
      page: by.get("fy25.adj_ebitda_margin")?.page ?? 4,
    },
  };

  return { growth, margins };
}
