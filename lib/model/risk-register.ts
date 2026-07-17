/**
 * lib/model/risk-register, the quantified risk register (client-safe).
 *
 * The six probability × impact rows whose products ARE
 * `BASE_ASSUMPTIONS.riskWeights` ([16, 12, 9, 9, 4, 12]) and which mirror
 * xlsx.ts's `buildScenarios()` risk() rows (Scenarios & Risk tab), so the
 * workbook, memo, deck AND the in-app risk-breakdown popover all show the
 * identical register. Lives under `lib/model/**` (client-safe by contract, no
 * `node:fs` / ExcelJS / server-only imports) so both the pure valuation engine
 * and client components can read it; `lib/generate/shared.ts` re-exports it for
 * the Office builders. English `name`/`mitigation`/`cite` are the artifact
 * strings; the UI popover localizes each row by its stable `id`
 * (`messages` → `deals.riskBreakdown.rows.<id>`).
 */

/** The Jahez DCF is the only model with a scored register today; the popover
 * asks this rather than sprinkling a company-id literal through JSX. */
export const RISK_REGISTER_COMPANY_ID = "jahez";

/** True when `companyId` has a scored quantified register (computed variant). */
export function hasRiskRegister(companyId: string): boolean {
  return companyId === RISK_REGISTER_COMPANY_ID;
}

export interface RiskRegisterItem {
  /** stable slug, the localized-name key in `deals.riskBreakdown.rows.<id>` */
  id: string;
  name: string;
  probability: number; // 1-5
  impact: number; // 1-5
  mitigation: string;
  cite: string;
}

export const riskRegister: RiskRegisterItem[] = [
  {
    id: "priceWar",
    name: "Price-war margin compression (Keeta/Meituan-funded discounting)",
    probability: 4,
    impact: 4,
    mitigation:
      "Shift to cost discipline & logistics mix; monitor take-rate and contribution margin per order",
    cite: "industry-news-pack p.2, p.4",
  },
  {
    id: "newEntrants",
    name: "Well-capitalised new entrants (Rabbit, Ninja unicorn, Dingdong)",
    probability: 4,
    impact: 3,
    mitigation: "Scale & fulfilment-density moat; Snoonu regional expansion",
    cite: "industry-news-pack p.2",
  },
  {
    id: "earningsVolatility",
    name: "Earnings volatility / one-offs (SAR 55m Q4-25; Q1-26 net loss)",
    probability: 3,
    impact: 3,
    mitigation:
      "One-offs largely non-recurring; H2-2026 profitability guidance",
    cite: "industry-news-pack p.4; fy25-earnings-call p.6",
  },
  {
    id: "snoonuIntegration",
    name: "Snoonu integration / near-term margin dilution",
    probability: 3,
    impact: 3,
    mitigation:
      "Snoonu FY25 adj. EBITDA +53.7m (profitable), accretive at scale",
    cite: "fy25-er p.6",
  },
  {
    id: "valuationData",
    name: "Valuation-data ambiguity (203m vs 217m shares; 92.8x trailing P/E)",
    probability: 2,
    impact: 2,
    mitigation:
      "Reconcile Tadawul share register; use normalised/forward multiples",
    cite: "market-data-comps p.2",
  },
  {
    id: "waccSensitivity",
    name: "WACC / terminal-value sensitivity (value ∝ WACC−g spread)",
    probability: 3,
    impact: 4,
    mitigation:
      "Sensitivity grid; conservative g=3.0%; bottom-up beta as next step",
    cite: "Sensitivity tab; Assumptions",
  },
];
