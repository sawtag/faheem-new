/**
 * lib/model/compute, the pure valuation engine (Jahez DCF + comps + Shariah +
 * risk composite), extracted from lib/generate/xlsx.ts so the Excel builder and
 * the Live Model UI share one implementation.
 *
 * Client-safe: no node:fs / ExcelJS, sourced actuals come from the static
 * import in inputs.ts. `buildModel(a)` parameterizes every analyst assumption;
 * `computeModel()` keeps the legacy zero-arg contract for the Office builders
 * (byte-identical at BASE_ASSUMPTIONS, snapshot-gated in tests).
 */
import { MKT, getModelInputs } from "@/lib/model/inputs";
import { buildNodes } from "@/lib/model/provenance";
import type {
  Assumptions,
  ModelOutputs,
  ModelResult,
  ScenarioResult,
} from "@/lib/model/types";

// Years: index 0..7 = FY23A, FY24A, FY25A, FY26E, FY27E, FY28E, FY29E, FY30E.
export const YEARS = [
  "FY23A",
  "FY24A",
  "FY25A",
  "FY26E",
  "FY27E",
  "FY28E",
  "FY29E",
  "FY30E",
] as const;
const F0 = 3; // first forecast index (FY26E)

// ════════════════════════════════ assumptions ═══════════════════════════════
// Every value here is an analyst judgment (no clean source), each renders in
// the gold assumption style with its rationale (RATIONALE) as the cell comment.
export const BASE_ASSUMPTIONS: Assumptions = {
  spread: 0.02, // cost-of-debt spread over rf
  zakat: 0.025, // Saudi zakat convention
  g: 0.03, // terminal growth (base)
  gBull: 0.035,
  gBear: 0.025,
  holdYears: 4, // mid of Lunar's 3–5y mandate
  dnaRate: 0.035, // D&A as % of net revenue
  capexRate: 0.025, // capex as % of net revenue
  nwcRate: 0.02, // ΔNWC as % of the change in net revenue
  // per-year forecast drivers FY26E–FY30E
  ordersGrowth: [0.18, 0.12, 0.09, 0.07, 0.06],
  aovGrowth: [0.06, 0.04, 0.03, 0.03, 0.03],
  netRevRate: [0.31, 0.305, 0.305, 0.305, 0.305], // net revenue / GMV
  ebitdaMargin: [0.075, 0.09, 0.105, 0.115, 0.12], // on net revenue
  // scenario deltas (applied to base net-revenue growth & EBITDA margin)
  bullRevDelta: [0.03, 0.03, 0.025, 0.02, 0.02],
  bullMarginDelta: 0.015,
  bearRevDelta: [-0.04, -0.04, -0.035, -0.03, -0.03],
  bearMarginDelta: -0.015,
  probBull: 0.25,
  probBase: 0.5,
  probBear: 0.25,
  ebitdaMarginTerminal: 0.12, // for sensitivity grid 2
  riskWeights: [16, 12, 9, 9, 4, 12], // P×I per row (see Scenarios & Risk tab)
};

export const RATIONALE = {
  beta: "levered beta = comp-set median of DoorDash 1.78 and Delivery Hero 1.86 (Talabat n/a, insufficient trading history), per Market Data & Comparables Snapshot p.3. Jahez's own 0.02 5Y beta is a thin-trading artifact and is NOT used. A bottom-up unlever/relever to Jahez's capital structure is the flagged next step.",
  spread:
    "cost-of-debt spread of +200bps over the risk-free rate. No clean Jahez credit spread is sourceable (Cbonds Saudi IG index is paywalled; the sovereign USD spread of ~50–100bps is sovereign, not corporate). 200bps reflects an unrated but cash-generative KSA mid-cap.",
  zakat:
    "Saudi zakat convention ~2.5% of the zakat base for Saudi/GCC-owned entities (vs the 20% CIT that applies to foreign ownership). Q1-26 zakat of SAR 0.12m sat on a pre-zakat loss, so no meaningful effective rate is observable. Applied as the NOPAT tax rate and the debt tax-shield.",
  g: "long-run nominal terminal growth ~3.0%, broadly Saudi long-term inflation / nominal GDP, below the explicit-period growth and above zero real. Bull 3.5% / Bear 2.5%.",
  hold: "IRR hold period = 4 years, the mid-point of Lunar's 3–5 year mandate window (see Lunar IC Charter).",
  dna: "D&A held at 3.5% of net revenue (FY25 actual ~3.85%; normalises slightly lower as the IFRS-16 right-of-use base matures).",
  capex:
    "capex at 2.5% of net revenue. No capex line is disclosed in the pack; Jahez is an asset-light platform, so this is set modestly above steady-state maintenance capex.",
  nwc: "ΔNWC drag at 2.0% of the change in net revenue. Delivery platforms run negative-to-near-zero working capital (collect from diners fast, settle restaurants/riders later); a small 2% drag on incremental revenue is deliberately conservative.",
  ordersGrowth:
    "order growth FY26E +18% (Snoonu full-year consolidation from Oct-2025 plus organic; Q1-26 orders +21% YoY), tapering toward +6% single-market maturity by FY30E.",
  aovGrowth:
    "AOV growth FY26E +6% (basket-mix + inflation; Q1-26 AOV +15% YoY on Snoonu mix), tapering to +3%.",
  netRevRate:
    "net-revenue monetisation (net revenue / GMV) eases from FY25's 32.1% to 31.0% in FY26E then holds at 30.5%, reflecting continued delivery-fee competition (KSA platform revenue fell 8.6% YoY in FY25) before stabilising.",
  ebitdaMargin:
    "EBITDA margin path anchored to management's FY2026 guidance of SAR 200–220m adj. EBITDA (~7.5% on forecast revenue), recovering to 12.0% by FY30E as Q4-25 one-offs roll off, Snoonu (FY25 adj. EBITDA +SAR 53.7m, profitable) consolidates for a full year, and operating leverage builds, a terminal margin at ~the FY24 peak plus modest leverage.",
  scenario:
    "bull/bear apply parallel shifts to net-revenue growth (±~3–4pp/yr) and EBITDA margin (±1.5pp) with terminal growth of 3.5% / 2.5%; WACC is held constant to isolate the operating case.",
  prob: "scenario probabilities 25% bull / 50% base / 25% bear, analyst's central-case weighting.",
  exit: "exit convention: the share price converges to intrinsic value at exit, and intrinsic value compounds at the cost of equity over the hold. IRR = (1+Ke)·(value/entry)^(1/years) − 1, buying at fair value earns Ke; the discount to value is the additional annualised premium.",
  debtFlat:
    "interest-bearing debt and lease liabilities held flat at the FY25 audited level across the forecast (no disclosed amortisation schedule).",
  cashRoll:
    "forecast cash rolled forward as prior-year cash + FCFF (no dividends/financing modelled, Jahez pays negligible dividends and is net-cash).",
  netIncome:
    "forecast net income simplified to EBIT×(1−zakat); net finance cost is ~nil given the net-cash balance sheet.",
  actualFcff:
    "actual-year FCFF applies the same capex (2.5%) and ΔNWC (2.0%) assumptions to reported EBIT, capex is not separately disclosed, so this is an estimate, shown for continuity only (it does not feed the DCF).",
  hurdle:
    "IC hurdle rate of 15% gross IRR per the Lunar IC Charter & Investment Mandate, the committee's minimum acceptable return for new positions.",
  riskWeights:
    "quantified risk-register weights: probability × impact (1–5 each) per register row, mirroring the Scenarios & Risk tab. Composite = 10 × (0.6·max + 0.4·mean) / 25, peak-weighted so one severe risk dominates.",
} as const;

// strict-mode (noUncheckedIndexedAccess) bounds-asserting access helper: array
// elements here are defined by construction, so assert rather than thread
// `| undefined` through the math.
const S = <T>(a: ArrayLike<T>, i: number): T => {
  const v = a[i];
  if (v === undefined) throw new Error(`index ${i} out of bounds`);
  return v;
};

const median = (xs: number[]): number => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? S(s, m) : (S(s, m - 1) + S(s, m)) / 2;
};

function runScenario(
  revGrowth: number[],
  ebitdaMargin: number[],
  g: number,
  ctx: {
    startNetRev: number;
    wacc: number;
    ke: number;
    zakat: number;
    dnaRate: number;
    capexRate: number;
    nwcRate: number;
    netCash: number;
    shares: number;
    price: number;
    holdYears: number;
  },
): ScenarioResult {
  const netRev: number[] = [];
  const ebitda: number[] = [];
  const dna: number[] = [];
  const ebit: number[] = [];
  const nopat: number[] = [];
  const capex: number[] = [];
  const dnwc: number[] = [];
  const fcff: number[] = [];
  const pvf: number[] = [];
  const pvFcff: number[] = [];
  let prev = ctx.startNetRev;
  for (let i = 0; i < 5; i++) {
    const nr = prev * (1 + S(revGrowth, i));
    netRev.push(nr);
    const eb = nr * S(ebitdaMargin, i);
    ebitda.push(eb);
    const d = nr * ctx.dnaRate;
    dna.push(d);
    const ei = eb - d;
    ebit.push(ei);
    const np = ei * (1 - ctx.zakat);
    nopat.push(np);
    const cx = nr * ctx.capexRate;
    capex.push(cx);
    const wc = (nr - prev) * ctx.nwcRate;
    dnwc.push(wc);
    const fc = np + d - cx - wc;
    fcff.push(fc);
    const factor = 1 / Math.pow(1 + ctx.wacc, i + 1);
    pvf.push(factor);
    pvFcff.push(fc * factor);
    prev = nr;
  }
  const sumPv = pvFcff.reduce((a, b) => a + b, 0);
  const tv = (S(fcff, 4) * (1 + g)) / (ctx.wacc - g);
  const pvTv = tv * S(pvf, 4);
  const ev = sumPv + pvTv;
  const equity = ev + ctx.netCash;
  const perShare = equity / ctx.shares;
  const upside = perShare / ctx.price - 1;
  const irr =
    (1 + ctx.ke) * Math.pow(perShare / ctx.price, 1 / ctx.holdYears) - 1;
  return {
    revGrowth,
    netRev,
    ebitdaMargin,
    ebitda,
    dna,
    ebit,
    nopat,
    capex,
    dnwc,
    fcff,
    pvf,
    pvFcff,
    sumPv,
    g,
    tv,
    pvTv,
    ev,
    equity,
    perShare,
    upside,
    irr,
  };
}

/** The parameterized engine: same math as the legacy computeModel(), with every
 * analyst assumption read from `a`. Returns the numeric result plus the
 * provenance node graph. */
export function buildModel(a: Assumptions): ModelOutputs {
  const m = getModelInputs();
  const v = (k: string): number => {
    const inp = m.get(k);
    if (!inp) throw new Error(`missing model input: ${k}`);
    return inp.unit === "%" ? inp.value / 100 : inp.value;
  };

  // ── WACC build ──
  const rf = MKT.rf.value / 100;
  const erp = MKT.erp.value / 100;
  const beta = (MKT.betaDash.value + MKT.betaDher.value) / 2; // comp-set median
  const ke = rf + beta * erp;
  const kdPre = rf + a.spread;
  const kdAfter = kdPre * (1 - a.zakat);
  const shares = 209.836; // q1-26-fs note 9: 209,836,060 shares at SR 0.5 par
  const price = MKT.price.value;
  const cash = v("q1_26.cash");
  const debt = v("q1_26.islamic_facilities_loans");
  const lease = v("q1_26.lease_liabilities");
  const netCash = cash - debt - lease;
  const E = shares * price;
  const D = debt;
  const V = E + D;
  const we = E / V;
  const wd = D / V;
  const wacc = we * ke + wd * kdAfter;

  // ── revenue drivers (actuals sourced, forecast driven) ──
  const orders = [
    v("fy23.orders"),
    v("fy24.orders"),
    v("fy25.orders"),
    0,
    0,
    0,
    0,
    0,
  ];
  const aov = [v("fy23.aov"), v("fy24.aov"), v("fy25.aov"), 0, 0, 0, 0, 0];
  const gmv = [v("fy23.gmv"), v("fy24.gmv"), v("fy25.gmv"), 0, 0, 0, 0, 0];
  const netRev = [
    v("fy23.net_revenue"),
    v("fy24.net_revenue"),
    v("fy25.net_revenue"),
    0,
    0,
    0,
    0,
    0,
  ];
  const takeRate = [
    v("fy23.take_rate"),
    v("fy24.take_rate"),
    v("fy25.take_rate"),
    0,
    0,
    0,
    0,
    0,
  ];
  for (let i = 0; i < 5; i++) {
    const idx = F0 + i;
    orders[idx] = S(orders, idx - 1) * (1 + S(a.ordersGrowth, i));
    aov[idx] = S(aov, idx - 1) * (1 + S(a.aovGrowth, i));
    gmv[idx] = S(orders, idx) * S(aov, idx);
    netRev[idx] = S(gmv, idx) * S(a.netRevRate, i);
    takeRate[idx] = S(takeRate, 2); // commission take rate held at FY25 level
  }
  const commission = gmv.map((g2, i) => g2 * S(takeRate, i));
  commission[2] = v("fy25.commission_revenue"); // sourced FY25

  // ── statement (forecast) ──
  const ebitda = new Array(8).fill(0);
  const dna = new Array(8).fill(0);
  const ebit = new Array(8).fill(0);
  const nopat = new Array(8).fill(0);
  const capex = new Array(8).fill(0);
  const dnwc = new Array(8).fill(0);
  const fcff = new Array(8).fill(0);
  // sourced actual EBITDA/DNA
  ebitda[0] = v("fy23.adj_ebitda");
  ebitda[1] = v("fy24.adj_ebitda");
  ebitda[2] = v("fy25.adj_ebitda");
  dna[1] = v("fy24.dna");
  dna[2] = v("fy25.dna");
  for (let i = 0; i < 5; i++) {
    const idx = F0 + i;
    ebitda[idx] = S(netRev, idx) * S(a.ebitdaMargin, i);
    dna[idx] = S(netRev, idx) * a.dnaRate;
    ebit[idx] = S(ebitda, idx) - S(dna, idx);
    nopat[idx] = S(ebit, idx) * (1 - a.zakat);
    capex[idx] = S(netRev, idx) * a.capexRate;
    dnwc[idx] = (S(netRev, idx) - S(netRev, idx - 1)) * a.nwcRate;
    fcff[idx] = S(nopat, idx) + S(dna, idx) - S(capex, idx) - S(dnwc, idx);
  }
  // actual-year FCFF (memo, same assumptions) for FY24A/FY25A
  for (const idx of [1, 2]) {
    ebit[idx] = S(ebitda, idx) - S(dna, idx);
    nopat[idx] = S(ebit, idx) * (1 - a.zakat);
    capex[idx] = S(netRev, idx) * a.capexRate;
    dnwc[idx] = (S(netRev, idx) - S(netRev, idx - 1)) * a.nwcRate;
    fcff[idx] = S(nopat, idx) + S(dna, idx) - S(capex, idx) - S(dnwc, idx);
  }

  const ctx = {
    startNetRev: S(netRev, 2),
    wacc,
    ke,
    zakat: a.zakat,
    dnaRate: a.dnaRate,
    capexRate: a.capexRate,
    nwcRate: a.nwcRate,
    netCash,
    shares,
    price,
    holdYears: a.holdYears,
  };

  const baseRevGrowth = netRev
    .slice(F0)
    .map((nr, i) => nr / (i === 0 ? S(netRev, 2) : S(netRev, F0 + i - 1)) - 1);
  const base = runScenario(baseRevGrowth, [...a.ebitdaMargin], a.g, ctx);
  const bull = runScenario(
    baseRevGrowth.map((x, i) => x + S(a.bullRevDelta, i)),
    a.ebitdaMargin.map((x) => x + a.bullMarginDelta),
    a.gBull,
    ctx,
  );
  const bear = runScenario(
    baseRevGrowth.map((x, i) => x + S(a.bearRevDelta, i)),
    a.ebitdaMargin.map((x) => x + a.bearMarginDelta),
    a.gBear,
    ctx,
  );
  const weightedPerShare =
    a.probBull * bull.perShare +
    a.probBase * base.perShare +
    a.probBear * bear.perShare;
  const weightedReturn =
    a.probBull * bull.irr + a.probBase * base.irr + a.probBear * bear.irr;

  // ── sensitivity grid 1: value/share across WACC × terminal growth ──
  const waccAxis = [-0.01, -0.005, 0, 0.005, 0.01].map((d) => wacc + d);
  const gAxis = [-0.005, -0.0025, 0, 0.0025, 0.005].map((d) => a.g + d);
  const fArr = base.fcff;
  const valAt = (w: number, gg: number): number => {
    let s = 0;
    for (let t = 0; t < 5; t++) s += S(fArr, t) / Math.pow(1 + w, t + 1);
    const tv = (S(fArr, 4) * (1 + gg)) / (w - gg);
    s += tv / Math.pow(1 + w, 5);
    return (s + netCash) / shares;
  };
  const grid1 = gAxis.map((gg) => waccAxis.map((w) => valAt(w, gg)));

  // ── sensitivity grid 2: FY30E EBITDA across take-rate × GMV growth ──
  const takeAxis = [0.28, 0.29, 0.305, 0.32, 0.33];
  const gmvGrowthAxis = [0.06, 0.08, 0.1, 0.12, 0.14];
  const fy25gmv = S(gmv, 2);
  const grid2 = takeAxis.map((tr) =>
    gmvGrowthAxis.map(
      (gg) => fy25gmv * Math.pow(1 + gg, 5) * tr * a.ebitdaMarginTerminal,
    ),
  );

  // ── comps: implied value per share ──
  const impliedFromEv = (mult: number, metric: number): number =>
    (mult * metric + netCash) / shares;
  const evRev = {
    talabat: impliedFromEv(MKT.talabatEvRev.value, S(netRev, 2)),
    doordash: impliedFromEv(MKT.doordashEvRev.value, S(netRev, 2)),
    dhero: impliedFromEv(MKT.dheroEvRev.value, S(netRev, 2)),
  };
  const evEbitda = {
    talabat: impliedFromEv(MKT.talabatEvEbitda.value, S(ebitda, 2)),
    doordash: impliedFromEv(MKT.doordashEvEbitda.value, S(ebitda, 2)),
    dhero: impliedFromEv(MKT.dheroEvEbitda.value, S(ebitda, 2)),
  };
  const pe = {
    talabat: (MKT.talabatPe.value * v("fy25.net_income")) / shares,
    doordash: (MKT.doordashPe.value * v("fy25.net_income")) / shares,
  };
  const allImplied = [
    ...Object.values(evRev),
    ...Object.values(evEbitda),
    ...Object.values(pe),
  ];
  const field = {
    min: Math.min(...allImplied),
    median: median(allImplied),
    max: Math.max(...allImplied),
  };

  // ── Shariah screen (AAOIFI-style) ──
  const mktCap = E;
  const debtRatio = debt / mktCap;
  const cashRatio = cash / mktCap;
  const leaseInclRatio = (debt + lease) / mktCap;
  const shariah = {
    debtRatio,
    cashRatio,
    leaseInclRatio,
    debtPass: debtRatio < 0.33,
    cashPass: cashRatio < 0.33,
    pass: debtRatio < 0.33 && cashRatio < 0.33,
  };

  // ── quantified risk register composite (peak-weighted) ──
  const risk = a.riskWeights;
  const riskScore =
    (10 *
      (0.6 * Math.max(...risk) +
        0.4 * (risk.reduce((x, y) => x + y, 0) / risk.length))) /
    25;

  const result: ModelResult = {
    rf,
    erp,
    beta,
    ke,
    kdPre,
    kdAfter,
    E,
    D,
    V,
    we,
    wd,
    wacc,
    price,
    shares,
    cash,
    debt,
    lease,
    netCash,
    orders,
    aov,
    gmv,
    netRev,
    takeRate,
    commission,
    ebitda,
    dna,
    ebit,
    nopat,
    capex,
    dnwc,
    fcff,
    base,
    bull,
    bear,
    weightedPerShare,
    weightedReturn,
    waccAxis,
    gAxis,
    grid1,
    takeAxis,
    gmvGrowthAxis,
    grid2,
    comps: { dcfPerShare: base.perShare, evRev, evEbitda, pe, field },
    shariah,
    riskScore,
    ic: {
      irr: base.irr,
      hurdle: 15,
      expectedReturn: weightedReturn,
      riskScore,
    },
  };

  return { result, nodes: buildNodes(result, a) };
}

let baseCache: ModelResult | null = null;

/** Legacy zero-arg contract for the Office builders: the base-case ModelResult. */
export function computeModel(): ModelResult {
  if (!baseCache) baseCache = buildModel(BASE_ASSUMPTIONS).result;
  return baseCache;
}
