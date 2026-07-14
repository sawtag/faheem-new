/**
 * lib/model/formulas — the FormulaDef registry.
 *
 * Every `formulaId` the provenance node graph references resolves here. The
 * KaTeX strings are the display formulas and MUST match what compute.ts
 * actually does (gate G5 — finance judges read them). `explainerKey` is the
 * next-intl key for the bilingual plain-language explainer (content authored
 * in a later workstream; the key string is the contract).
 */
import type { FormulaDef } from "@/lib/model/types";

const f = (id: string, katex: string, external?: string): FormulaDef => ({
  id,
  katex,
  explainerKey: `model.formulas.${id}`,
  ...(external ? { external } : {}),
});

export const FORMULAS: Record<string, FormulaDef> = Object.fromEntries(
  [
    // ── WACC build ──
    f(
      "capm-ke",
      String.raw`k_e = r_f + \beta \cdot ERP`,
      "https://en.wikipedia.org/wiki/Capital_asset_pricing_model",
    ),
    f("kd-pre", String.raw`k_d = r_f + \text{spread}`),
    f("kd-after", String.raw`k_{d,\text{after}} = k_d \cdot (1 - t_{zakat})`),
    f(
      "wacc",
      String.raw`WACC = w_e \cdot k_e + w_d \cdot k_{d,\text{after}}`,
      "https://en.wikipedia.org/wiki/Weighted_average_cost_of_capital",
    ),
    f(
      "beta-comp-set",
      String.raw`\beta = \operatorname{median}(\beta_{\text{Peer 1}}, \beta_{\text{Peer 2}}) = \tfrac{\beta_{\text{Peer 1}} + \beta_{\text{Peer 2}}}{2}`,
    ),
    f("market-cap", String.raw`E = \text{shares} \times P`),
    f("capital-total", String.raw`V = E + D`),
    f("weight-equity", String.raw`w_e = E / V`),
    f("weight-debt", String.raw`w_d = D / V`),
    f(
      "net-cash",
      String.raw`\text{net cash} = \text{cash} - \text{debt} - \text{leases}`,
    ),
    // ── revenue drivers ──
    f(
      "orders-growth",
      String.raw`\text{orders}_t = \text{orders}_{t-1} \cdot (1 + g_{\text{orders},t})`,
    ),
    f("aov-growth", String.raw`AOV_t = AOV_{t-1} \cdot (1 + g_{\text{AOV},t})`),
    f("gmv", String.raw`GMV = \text{orders} \times AOV`),
    f(
      "net-revenue",
      String.raw`\text{net revenue} = GMV \times \text{net-revenue rate}`,
    ),
    f(
      "commission",
      String.raw`\text{commission} = GMV \times \text{take rate}`,
    ),
    f(
      "take-rate-held",
      String.raw`\text{take rate}_t = \text{take rate}_{FY25}`,
    ),
    // ── statement ──
    f("ebitda", String.raw`EBITDA = \text{net revenue} \times \text{margin}`),
    f("dna", String.raw`D\&A = \text{net revenue} \times \text{D\&A rate}`),
    f("ebit", String.raw`EBIT = EBITDA - D\&A`),
    f("nopat", String.raw`NOPAT = EBIT \cdot (1 - t_{zakat})`),
    f(
      "capex",
      String.raw`\text{capex} = \text{net revenue} \times \text{capex rate}`,
    ),
    f(
      "dnwc",
      String.raw`\Delta NWC = (\text{net rev}_t - \text{net rev}_{t-1}) \times \text{NWC rate}`,
    ),
    f(
      "fcff",
      String.raw`FCFF = NOPAT + D\&A - \text{capex} - \Delta NWC`,
      "https://en.wikipedia.org/wiki/Free_cash_flow_to_firm",
    ),
    // ── scenarios ──
    f(
      "rev-growth",
      String.raw`g_t = \text{net rev}_t / \text{net rev}_{t-1} - 1`,
    ),
    f(
      "scenario-rev-growth",
      String.raw`g_{\text{scen},t} = g_{\text{base},t} + \Delta_t`,
    ),
    f(
      "scenario-margin",
      String.raw`m_{\text{scen},t} = m_{\text{base},t} + \Delta m`,
    ),
    f(
      "net-rev-growth",
      String.raw`\text{net rev}_t = \text{net rev}_{t-1} \cdot (1 + g_t)`,
    ),
    // ── discounting / DCF ──
    f("pv-factor", String.raw`PVF_t = \dfrac{1}{(1 + WACC)^{t}}`),
    f("pv-fcff", String.raw`PV(FCFF_t) = FCFF_t \times PVF_t`),
    f("sum-pv", String.raw`\Sigma PV = \sum_{t=1}^{5} PV(FCFF_t)`),
    f(
      "gordon-tv",
      String.raw`TV = \dfrac{FCFF_5 \cdot (1 + g)}{WACC - g}`,
      "https://en.wikipedia.org/wiki/Terminal_value_(finance)",
    ),
    f("pv-tv", String.raw`PV(TV) = TV \times PVF_5`),
    f("dcf-ev", String.raw`EV = \Sigma PV + PV(TV)`),
    f("equity-value", String.raw`\text{equity value} = EV + \text{net cash}`),
    f(
      "per-share",
      String.raw`\text{value/share} = \text{equity value} / \text{shares}`,
    ),
    f("upside", String.raw`\text{upside} = \text{value/share} / P - 1`),
    f(
      "exit-irr",
      String.raw`IRR = (1 + k_e) \cdot \left(\dfrac{V}{P}\right)^{1/n} - 1`,
    ),
    f(
      "prob-weighted-per-share",
      String.raw`\mathbb{E}[V] = p_{\text{bull}} V_{\text{bull}} + p_{\text{base}} V_{\text{base}} + p_{\text{bear}} V_{\text{bear}}`,
    ),
    f(
      "prob-weighted-return",
      String.raw`\mathbb{E}[IRR] = p_{\text{bull}} IRR_{\text{bull}} + p_{\text{base}} IRR_{\text{base}} + p_{\text{bear}} IRR_{\text{bear}}`,
    ),
    // ── sensitivity ──
    f(
      "wacc-axis",
      String.raw`WACC + \delta,\ \delta \in \{-1\%, -0.5\%, 0, +0.5\%, +1\%\}`,
    ),
    f(
      "g-axis",
      String.raw`g + \delta,\ \delta \in \{-0.5\%, -0.25\%, 0, +0.25\%, +0.5\%\}`,
    ),
    f(
      "grid1-per-share",
      String.raw`\left(\sum_{t=1}^{5} \dfrac{FCFF_t}{(1+w)^{t}} + \dfrac{TV(w, g)}{(1+w)^{5}} + \text{net cash}\right) / \text{shares}`,
    ),
    f(
      "take-axis",
      String.raw`\text{monetisation rate grid centred on the terminal net-revenue rate: } \{28\%, 29\%, 30.5\%, 32\%, 33\%\}`,
    ),
    f(
      "gmv-growth-axis",
      String.raw`g_{GMV} \in \{6\%, 8\%, 10\%, 12\%, 14\%\}\ \text{stress grid bracketing the base path's implied CAGR } (GMV_{FY30}/GMV_{FY25})^{1/5} - 1`,
    ),
    f(
      "grid2-ebitda",
      String.raw`EBITDA_{FY30E} = GMV_{FY25} \cdot (1 + g_{GMV})^{5} \times \text{take rate} \times m_{T}`,
    ),
    // ── comps ──
    f(
      "comps-ev-rev",
      String.raw`\text{implied/share} = \dfrac{EV/\text{Rev} \times \text{net rev}_{FY25} + \text{net cash}}{\text{shares}}`,
    ),
    f(
      "comps-ev-ebitda",
      String.raw`\text{implied/share} = \dfrac{EV/EBITDA \times EBITDA_{FY25} + \text{net cash}}{\text{shares}}`,
    ),
    f(
      "comps-pe",
      String.raw`\text{implied/share} = \dfrac{P/E \times NI_{FY25}}{\text{shares}}`,
    ),
    f("comps-min", String.raw`\min(\text{implied values})`),
    f("comps-median", String.raw`\operatorname{median}(\text{implied values})`),
    f("comps-max", String.raw`\max(\text{implied values})`),
    // ── Shariah screen (AAOIFI-style) ──
    f("shariah-debt-ratio", String.raw`\text{debt} / \text{market cap} < 33\%`),
    f("shariah-cash-ratio", String.raw`\text{cash} / \text{market cap} < 33\%`),
    f(
      "shariah-lease-ratio",
      String.raw`(\text{debt} + \text{leases}) / \text{market cap}`,
    ),
    // ── risk composite ──
    f(
      "risk-composite",
      String.raw`\text{risk} = \dfrac{10 \cdot \left(0.6 \cdot \max(P{\times}I) + 0.4 \cdot \overline{P{\times}I}\right)}{25}`,
    ),
  ].map((d) => [d.id, d]),
);
