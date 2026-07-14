/**
 * lib/model/inputs — client-safe sourced data.
 *
 * Client-safety rule (see types.ts): NO node:fs / ExcelJS / server-only imports.
 * The sourced actuals load via a STATIC import of data/model-inputs.json
 * (bundled, browser-safe) — not the fs-based loader in lib/generate/shared.ts.
 *
 * Two sources of sourced numbers live here:
 *   - `getModelInputs()`  zod-validated ModelInput map keyed by `<period>.<metric>`.
 *   - `MKT`               the Market Data & Comparables Snapshot figures
 *                         (docId "market-data-comps") — each carries its page.
 */
import raw from "@/data/model-inputs.json";
import { ModelInputSchema, type ModelInput } from "@/lib/types";

let cache: Map<string, ModelInput> | null = null;

/** zod-validated ModelInput map, keyed by `<period>.<metric>` (e.g. "fy25.gmv"). */
export function getModelInputs(): Map<string, ModelInput> {
  if (!cache) {
    const arr = ModelInputSchema.array().parse(raw);
    cache = new Map(arr.map((i) => [i.key, i]));
  }
  return cache;
}

// ════════════════════════════ sourced market data ═══════════════════════════
// Real figures from the Market Data & Comparables Snapshot (market-data-comps).
// Sourced, not invented — each carries its page. Rates are stored as percent
// numbers (4.60 = 4.60%) to mirror model-inputs.json's `%` unit convention.

/** corpus doc id for the market-data snapshot — all MKT entries source here. */
export const MARKET_DATA_DOC = "market-data-comps";

export const MKT = {
  rf: mkt(4.6, "%", 2, "Saudi 'Sah' retail sukuk proxy, Jun 2026 issuance"),
  erp: mkt(5.01, "%", 2, "Damodaran KSA total equity risk premium"),
  betaDash: mkt(1.78, "x", 3, "DoorDash 5Y levered beta"),
  betaDher: mkt(1.86, "x", 3, "Delivery Hero 5Y levered beta"),
  price: mkt(12.79, "SAR", 2, "Jahez share price, 10 Jul 2026 close"),
  analystTarget: mkt(
    17.12,
    "SAR",
    2,
    "Analyst avg 12m price target (10 analysts)",
  ),
  // trading comps (EV/Revenue, EV/EBITDA, P/E) — p.4
  talabatEvRev: mkt(1.88, "x", 4, "Talabat EV/Revenue"),
  talabatEvEbitda: mkt(12.9, "x", 4, "Talabat EV/EBITDA"),
  talabatPe: mkt(16.7, "x", 4, "Talabat P/E (TTM)"),
  doordashEvRev: mkt(5.53, "x", 4, "DoorDash EV/Revenue"),
  doordashEvEbitda: mkt(60.25, "x", 4, "DoorDash EV/EBITDA"),
  doordashPe: mkt(91.43, "x", 4, "DoorDash P/E (TTM)"),
  dheroEvRev: mkt(0.97, "x", 4, "Delivery Hero EV/Revenue"),
  dheroEvEbitda: mkt(30.16, "x", 4, "Delivery Hero EV/EBITDA"),
} as const;

function mkt(
  value: number,
  unit: string,
  page: number,
  note: string,
): ModelInput {
  return { key: "", value, unit, sourceDoc: MARKET_DATA_DOC, page, note };
}
