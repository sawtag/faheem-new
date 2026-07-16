/**
 * Step 3 mandate & risk questionnaire state (design-briefs §2.4), defaults
 * prefilled to Lunar's real mandate values (15% IRR benchmark, 10% single-name
 * concentration cap, 3–5y holding, Compliance required) so the demo's closing
 * card ("this becomes your IC Charter") reflects the actual Lunar IC Charter.
 */
export const SECTOR_IDS = [
  "technology",
  "consumer",
  "healthcare",
  "financials",
  "realEstate",
  "industrials",
] as const;
export type SectorId = (typeof SECTOR_IDS)[number];

export type HoldingPeriod = "short" | "mid" | "long";
export type Liquidity = "quarterly" | "semiAnnual" | "annual";
export type Drawdown = 15 | 20 | 25;

export interface MandateState {
  irr: string;
  concentration: string;
  holding: HoldingPeriod;
  liquidity: Liquidity;
  compliance: boolean;
  sectors: Set<SectorId>;
  drawdown: Drawdown;
}

export const DEFAULT_MANDATE: MandateState = {
  irr: "15",
  concentration: "10",
  holding: "mid",
  liquidity: "semiAnnual",
  compliance: true,
  sectors: new Set<SectorId>(["technology", "consumer"]),
  drawdown: 20,
};

/** A mandate percentage field is valid when it parses to a finite, non-negative number. */
export function isValidPercent(value: string): boolean {
  const n = Number(value);
  return value.trim().length > 0 && Number.isFinite(n) && n >= 0;
}
