/**
 * lib/model/provenance — the "no orphan numbers" node graph.
 *
 * `buildNodes()` annotates every real, renderable number in a ModelResult with
 * provenance that terminates at a sourced actual (PDF page) or a labeled
 * assumption. `provenanceViolations()` / `assertProvenanceInvariants()` are the
 * test walkers for the graph invariants (resolvable inputs, acyclic,
 * terminating, real formula ids / assumption keys / doc ids).
 *
 * Value convention (types.ts): percent quantities carry unit "%" and
 * percent-number values (wacc node = 13.31, not 0.1331) — the conversion
 * happens HERE only; the underlying ModelResult stays decimal.
 */
import { MARKET_DATA_DOC, MKT, getModelInputs } from "@/lib/model/inputs";
import type {
  Assumptions,
  FormulaDef,
  ModelKey,
  ModelResult,
  Provenance,
  ValueNode,
} from "@/lib/model/types";

const S = <T>(a: ArrayLike<T>, i: number): T => {
  const v = a[i];
  if (v === undefined) throw new Error(`index ${i} out of bounds`);
  return v;
};

const F0 = 3; // first forecast index (FY26E)
const ACTUAL_PERIODS = ["fy23", "fy24", "fy25"] as const;
const SCENARIOS = ["base", "bull", "bear"] as const;
const COMP_NAMES = ["talabat", "doordash", "dhero"] as const;

export function buildNodes(
  result: ModelResult,
  a: Assumptions,
): Record<ModelKey, ValueNode> {
  const inputs = getModelInputs();
  const nodes: Record<ModelKey, ValueNode> = {};

  const put = (
    key: ModelKey,
    value: number,
    unit: string,
    provenance: Provenance,
  ): void => {
    nodes[key] = { value, unit, provenance, labelKey: `model.nodes.${key}` };
  };
  const pct = (x: number): number => x * 100;
  const fromInput = (key: string): Provenance => {
    const inp = inputs.get(key);
    if (!inp) throw new Error(`missing model input: ${key}`);
    return { kind: "sourced", docId: inp.sourceDoc, page: inp.page };
  };
  const mktSrc = (page: number): Provenance => ({
    kind: "sourced",
    docId: MARKET_DATA_DOC,
    page,
  });
  const assumption = (
    assumptionKey: string,
    rationaleKey: string,
  ): Provenance => ({ kind: "assumption", assumptionKey, rationaleKey });
  const computed = (formulaId: string, inputKeys: ModelKey[]): Provenance => ({
    kind: "computed",
    formulaId,
    inputs: inputKeys,
  });

  // ── assumption nodes ("assumptions.<key>") ──
  const scalarAssumptions: [keyof Assumptions, string, string][] = [
    ["spread", "%", "spread"],
    ["zakat", "%", "zakat"],
    ["g", "%", "g"],
    ["gBull", "%", "g"],
    ["gBear", "%", "g"],
    ["holdYears", "years", "hold"],
    ["dnaRate", "%", "dna"],
    ["capexRate", "%", "capex"],
    ["nwcRate", "%", "nwc"],
    ["bullMarginDelta", "%", "scenario"],
    ["bearMarginDelta", "%", "scenario"],
    ["probBull", "%", "prob"],
    ["probBase", "%", "prob"],
    ["probBear", "%", "prob"],
    ["ebitdaMarginTerminal", "%", "ebitdaMargin"],
  ];
  for (const [key, unit, rationaleKey] of scalarAssumptions) {
    const raw = a[key] as number;
    put(
      `assumptions.${key}`,
      unit === "%" ? pct(raw) : raw,
      unit,
      assumption(key, rationaleKey),
    );
  }
  const arrayAssumptions: [keyof Assumptions, string, string][] = [
    ["ordersGrowth", "%", "ordersGrowth"],
    ["aovGrowth", "%", "aovGrowth"],
    ["netRevRate", "%", "netRevRate"],
    ["ebitdaMargin", "%", "ebitdaMargin"],
    ["bullRevDelta", "%", "scenario"],
    ["bearRevDelta", "%", "scenario"],
    ["riskWeights", "score", "riskWeights"],
  ];
  for (const [key, unit, rationaleKey] of arrayAssumptions) {
    (a[key] as number[]).forEach((raw, i) => {
      put(
        `assumptions.${key}.${i}`,
        unit === "%" ? pct(raw) : raw,
        unit,
        assumption(`${key}.${i}`, rationaleKey),
      );
    });
  }

  // ── WACC build ──
  put("rf", pct(result.rf), "%", mktSrc(MKT.rf.page));
  put("erp", pct(result.erp), "%", mktSrc(MKT.erp.page));
  put("mkt.betaDash", MKT.betaDash.value, "x", mktSrc(MKT.betaDash.page));
  put("mkt.betaDher", MKT.betaDher.value, "x", mktSrc(MKT.betaDher.page));
  put(
    "beta",
    result.beta,
    "x",
    computed("beta-comp-set", ["mkt.betaDash", "mkt.betaDher"]),
  );
  put("ke", pct(result.ke), "%", computed("capm-ke", ["rf", "beta", "erp"]));
  put(
    "kdPre",
    pct(result.kdPre),
    "%",
    computed("kd-pre", ["rf", "assumptions.spread"]),
  );
  put(
    "kdAfter",
    pct(result.kdAfter),
    "%",
    computed("kd-after", ["kdPre", "assumptions.zakat"]),
  );
  put("price", result.price, "SAR", mktSrc(MKT.price.page));
  put("shares", result.shares, "m", fromInput("fy25.shares_outstanding"));
  put("cash", result.cash, "SAR m", fromInput("q1_26.cash"));
  put(
    "debt",
    result.debt,
    "SAR m",
    fromInput("q1_26.islamic_facilities_loans"),
  );
  put("lease", result.lease, "SAR m", fromInput("q1_26.lease_liabilities"));
  put(
    "netCash",
    result.netCash,
    "SAR m",
    computed("net-cash", ["cash", "debt", "lease"]),
  );
  put("E", result.E, "SAR m", computed("market-cap", ["shares", "price"]));
  put("V", result.V, "SAR m", computed("capital-total", ["E", "debt"]));
  put("we", pct(result.we), "%", computed("weight-equity", ["E", "V"]));
  put("wd", pct(result.wd), "%", computed("weight-debt", ["debt", "V"]));
  put(
    "wacc",
    pct(result.wacc),
    "%",
    computed("wacc", ["we", "ke", "wd", "kdAfter"]),
  );

  // ── revenue drivers 0..7 (actuals sourced, forecast computed) ──
  for (let i = 0; i < 8; i++) {
    const period = i < F0 ? S(ACTUAL_PERIODS, i) : null;
    const j = i - F0; // forecast-driver index
    put(
      `orders.${i}`,
      S(result.orders, i),
      "m",
      period
        ? fromInput(`${period}.orders`)
        : computed("orders-growth", [
            `orders.${i - 1}`,
            `assumptions.ordersGrowth.${j}`,
          ]),
    );
    put(
      `aov.${i}`,
      S(result.aov, i),
      "SAR",
      period
        ? fromInput(`${period}.aov`)
        : computed("aov-growth", [
            `aov.${i - 1}`,
            `assumptions.aovGrowth.${j}`,
          ]),
    );
    put(
      `gmv.${i}`,
      S(result.gmv, i),
      "SAR m",
      period
        ? fromInput(`${period}.gmv`)
        : computed("gmv", [`orders.${i}`, `aov.${i}`]),
    );
    put(
      `netRev.${i}`,
      S(result.netRev, i),
      "SAR m",
      period
        ? fromInput(`${period}.net_revenue`)
        : computed("net-revenue", [`gmv.${i}`, `assumptions.netRevRate.${j}`]),
    );
    put(
      `takeRate.${i}`,
      pct(S(result.takeRate, i)),
      "%",
      period
        ? fromInput(`${period}.take_rate`)
        : computed("take-rate-held", ["takeRate.2"]),
    );
    put(
      `commission.${i}`,
      S(result.commission, i),
      "SAR m",
      i === 2
        ? fromInput("fy25.commission_revenue")
        : computed("commission", [`gmv.${i}`, `takeRate.${i}`]),
    );
  }

  // ── statement 0..7 (index 0 skipped where the model holds a 0 placeholder) ──
  for (let i = 0; i < 8; i++) {
    put(
      `ebitda.${i}`,
      S(result.ebitda, i),
      "SAR m",
      i < F0
        ? fromInput(`${S(ACTUAL_PERIODS, i)}.adj_ebitda`)
        : computed("ebitda", [
            `netRev.${i}`,
            `assumptions.ebitdaMargin.${i - F0}`,
          ]),
    );
    if (i === 0) continue; // dna[0]/ebit[0]/… are structural 0 placeholders
    put(
      `dna.${i}`,
      S(result.dna, i),
      "SAR m",
      i < F0
        ? fromInput(`${S(ACTUAL_PERIODS, i)}.dna`)
        : computed("dna", [`netRev.${i}`, "assumptions.dnaRate"]),
    );
    put(
      `ebit.${i}`,
      S(result.ebit, i),
      "SAR m",
      computed("ebit", [`ebitda.${i}`, `dna.${i}`]),
    );
    put(
      `nopat.${i}`,
      S(result.nopat, i),
      "SAR m",
      computed("nopat", [`ebit.${i}`, "assumptions.zakat"]),
    );
    put(
      `capex.${i}`,
      S(result.capex, i),
      "SAR m",
      computed("capex", [`netRev.${i}`, "assumptions.capexRate"]),
    );
    put(
      `dnwc.${i}`,
      S(result.dnwc, i),
      "SAR m",
      computed("dnwc", [
        `netRev.${i}`,
        `netRev.${i - 1}`,
        "assumptions.nwcRate",
      ]),
    );
    put(
      `fcff.${i}`,
      S(result.fcff, i),
      "SAR m",
      computed("fcff", [`nopat.${i}`, `dna.${i}`, `capex.${i}`, `dnwc.${i}`]),
    );
  }

  // ── scenarios ──
  for (const name of SCENARIOS) {
    const scen = result[name];
    const deltaKey =
      name === "bull"
        ? "bullRevDelta"
        : name === "bear"
          ? "bearRevDelta"
          : null;
    const marginDeltaKey =
      name === "bull"
        ? "bullMarginDelta"
        : name === "bear"
          ? "bearMarginDelta"
          : null;
    for (let i = 0; i < 5; i++) {
      const prevNetRev = i === 0 ? "netRev.2" : `${name}.netRev.${i - 1}`;
      put(
        `${name}.revGrowth.${i}`,
        pct(S(scen.revGrowth, i)),
        "%",
        deltaKey
          ? computed("scenario-rev-growth", [
              `base.revGrowth.${i}`,
              `assumptions.${deltaKey}.${i}`,
            ])
          : computed("rev-growth", [
              `netRev.${F0 + i}`,
              i === 0 ? "netRev.2" : `netRev.${F0 + i - 1}`,
            ]),
      );
      put(
        `${name}.ebitdaMargin.${i}`,
        pct(S(scen.ebitdaMargin, i)),
        "%",
        marginDeltaKey
          ? computed("scenario-margin", [
              `assumptions.ebitdaMargin.${i}`,
              `assumptions.${marginDeltaKey}`,
            ])
          : assumption(`ebitdaMargin.${i}`, "ebitdaMargin"),
      );
      put(
        `${name}.netRev.${i}`,
        S(scen.netRev, i),
        "SAR m",
        computed("net-rev-growth", [prevNetRev, `${name}.revGrowth.${i}`]),
      );
      put(
        `${name}.ebitda.${i}`,
        S(scen.ebitda, i),
        "SAR m",
        computed("ebitda", [
          `${name}.netRev.${i}`,
          `${name}.ebitdaMargin.${i}`,
        ]),
      );
      put(
        `${name}.dna.${i}`,
        S(scen.dna, i),
        "SAR m",
        computed("dna", [`${name}.netRev.${i}`, "assumptions.dnaRate"]),
      );
      put(
        `${name}.ebit.${i}`,
        S(scen.ebit, i),
        "SAR m",
        computed("ebit", [`${name}.ebitda.${i}`, `${name}.dna.${i}`]),
      );
      put(
        `${name}.nopat.${i}`,
        S(scen.nopat, i),
        "SAR m",
        computed("nopat", [`${name}.ebit.${i}`, "assumptions.zakat"]),
      );
      put(
        `${name}.capex.${i}`,
        S(scen.capex, i),
        "SAR m",
        computed("capex", [`${name}.netRev.${i}`, "assumptions.capexRate"]),
      );
      put(
        `${name}.dnwc.${i}`,
        S(scen.dnwc, i),
        "SAR m",
        computed("dnwc", [
          `${name}.netRev.${i}`,
          prevNetRev,
          "assumptions.nwcRate",
        ]),
      );
      put(
        `${name}.fcff.${i}`,
        S(scen.fcff, i),
        "SAR m",
        computed("fcff", [
          `${name}.nopat.${i}`,
          `${name}.dna.${i}`,
          `${name}.capex.${i}`,
          `${name}.dnwc.${i}`,
        ]),
      );
      put(
        `${name}.pvf.${i}`,
        S(scen.pvf, i),
        "x",
        computed("pv-factor", ["wacc"]),
      );
      put(
        `${name}.pvFcff.${i}`,
        S(scen.pvFcff, i),
        "SAR m",
        computed("pv-fcff", [`${name}.fcff.${i}`, `${name}.pvf.${i}`]),
      );
    }
    put(
      `${name}.sumPv`,
      scen.sumPv,
      "SAR m",
      computed(
        "sum-pv",
        [0, 1, 2, 3, 4].map((i) => `${name}.pvFcff.${i}`),
      ),
    );
    put(
      `${name}.g`,
      pct(scen.g),
      "%",
      assumption(
        name === "bull" ? "gBull" : name === "bear" ? "gBear" : "g",
        "g",
      ),
    );
    put(
      `${name}.tv`,
      scen.tv,
      "SAR m",
      computed("gordon-tv", [`${name}.fcff.4`, `${name}.g`, "wacc"]),
    );
    put(
      `${name}.pvTv`,
      scen.pvTv,
      "SAR m",
      computed("pv-tv", [`${name}.tv`, `${name}.pvf.4`]),
    );
    put(
      `${name}.ev`,
      scen.ev,
      "SAR m",
      computed("dcf-ev", [`${name}.sumPv`, `${name}.pvTv`]),
    );
    put(
      `${name}.equity`,
      scen.equity,
      "SAR m",
      computed("equity-value", [`${name}.ev`, "netCash"]),
    );
    put(
      `${name}.perShare`,
      scen.perShare,
      "SAR",
      computed("per-share", [`${name}.equity`, "shares"]),
    );
    put(
      `${name}.upside`,
      pct(scen.upside),
      "%",
      computed("upside", [`${name}.perShare`, "price"]),
    );
    put(
      `${name}.irr`,
      pct(scen.irr),
      "%",
      computed("exit-irr", [
        "ke",
        `${name}.perShare`,
        "price",
        "assumptions.holdYears",
      ]),
    );
  }
  const weightedPerShareInputs: ModelKey[] = [
    "assumptions.probBull",
    "bull.perShare",
    "assumptions.probBase",
    "base.perShare",
    "assumptions.probBear",
    "bear.perShare",
  ];
  const weightedReturnInputs: ModelKey[] = [
    "assumptions.probBull",
    "bull.irr",
    "assumptions.probBase",
    "base.irr",
    "assumptions.probBear",
    "bear.irr",
  ];
  put(
    "weightedPerShare",
    result.weightedPerShare,
    "SAR",
    computed("prob-weighted-per-share", weightedPerShareInputs),
  );
  put(
    "weightedReturn",
    pct(result.weightedReturn),
    "%",
    computed("prob-weighted-return", weightedReturnInputs),
  );

  // ── sensitivity grid 1: value/share across WACC × terminal growth ──
  result.waccAxis.forEach((w, i) =>
    put(`waccAxis.${i}`, pct(w), "%", computed("wacc-axis", ["wacc"])),
  );
  result.gAxis.forEach((g, i) =>
    put(`gAxis.${i}`, pct(g), "%", computed("g-axis", ["assumptions.g"])),
  );
  const baseFcffKeys = [0, 1, 2, 3, 4].map((i) => `base.fcff.${i}`);
  result.grid1.forEach((row, r) =>
    row.forEach((cell, c) =>
      put(
        `grid1.${r}.${c}`,
        cell,
        "SAR",
        computed("grid1-per-share", [
          `waccAxis.${c}`,
          `gAxis.${r}`,
          ...baseFcffKeys,
          "netCash",
          "shares",
        ]),
      ),
    ),
  );

  // ── sensitivity grid 2: FY30E EBITDA across take-rate × GMV growth ──
  result.takeAxis.forEach((t, i) =>
    put(
      `takeAxis.${i}`,
      pct(t),
      "%",
      computed("take-axis", ["assumptions.netRevRate.4"]),
    ),
  );
  result.gmvGrowthAxis.forEach((g, i) =>
    put(
      `gmvGrowthAxis.${i}`,
      pct(g),
      "%",
      computed("gmv-growth-axis", ["gmv.2", "gmv.7"]),
    ),
  );
  result.grid2.forEach((row, r) =>
    row.forEach((cell, c) =>
      put(
        `grid2.${r}.${c}`,
        cell,
        "SAR m",
        computed("grid2-ebitda", [
          "gmv.2",
          `gmvGrowthAxis.${c}`,
          `takeAxis.${r}`,
          "assumptions.ebitdaMarginTerminal",
        ]),
      ),
    ),
  );

  // ── comps: sourced multiples + implied value per share ──
  const mults = {
    evRev: {
      talabat: MKT.talabatEvRev,
      doordash: MKT.doordashEvRev,
      dhero: MKT.dheroEvRev,
    },
    evEbitda: {
      talabat: MKT.talabatEvEbitda,
      doordash: MKT.doordashEvEbitda,
      dhero: MKT.dheroEvEbitda,
    },
    pe: { talabat: MKT.talabatPe, doordash: MKT.doordashPe },
  } as const;
  put(
    "fy25.netIncome",
    inputs.get("fy25.net_income")!.value,
    "SAR m",
    fromInput("fy25.net_income"),
  );
  for (const comp of COMP_NAMES) {
    put(
      `mkt.evRev.${comp}`,
      mults.evRev[comp].value,
      "x",
      mktSrc(mults.evRev[comp].page),
    );
    put(
      `comps.evRev.${comp}`,
      result.comps.evRev[comp],
      "SAR",
      computed("comps-ev-rev", [
        `mkt.evRev.${comp}`,
        "netRev.2",
        "netCash",
        "shares",
      ]),
    );
    put(
      `mkt.evEbitda.${comp}`,
      mults.evEbitda[comp].value,
      "x",
      mktSrc(mults.evEbitda[comp].page),
    );
    put(
      `comps.evEbitda.${comp}`,
      result.comps.evEbitda[comp],
      "SAR",
      computed("comps-ev-ebitda", [
        `mkt.evEbitda.${comp}`,
        "ebitda.2",
        "netCash",
        "shares",
      ]),
    );
    if (comp !== "dhero") {
      put(
        `mkt.pe.${comp}`,
        mults.pe[comp].value,
        "x",
        mktSrc(mults.pe[comp].page),
      );
      put(
        `comps.pe.${comp}`,
        result.comps.pe[comp],
        "SAR",
        computed("comps-pe", [`mkt.pe.${comp}`, "fy25.netIncome", "shares"]),
      );
    }
  }
  const impliedKeys: ModelKey[] = [
    "comps.evRev.talabat",
    "comps.evRev.doordash",
    "comps.evRev.dhero",
    "comps.evEbitda.talabat",
    "comps.evEbitda.doordash",
    "comps.evEbitda.dhero",
    "comps.pe.talabat",
    "comps.pe.doordash",
  ];
  put(
    "comps.field.min",
    result.comps.field.min,
    "SAR",
    computed("comps-min", impliedKeys),
  );
  put(
    "comps.field.median",
    result.comps.field.median,
    "SAR",
    computed("comps-median", impliedKeys),
  );
  put(
    "comps.field.max",
    result.comps.field.max,
    "SAR",
    computed("comps-max", impliedKeys),
  );

  // ── Shariah screen (booleans skipped — nodes are numbers only) ──
  put(
    "shariah.debtRatio",
    pct(result.shariah.debtRatio),
    "%",
    computed("shariah-debt-ratio", ["debt", "E"]),
  );
  put(
    "shariah.cashRatio",
    pct(result.shariah.cashRatio),
    "%",
    computed("shariah-cash-ratio", ["cash", "E"]),
  );
  put(
    "shariah.leaseInclRatio",
    pct(result.shariah.leaseInclRatio),
    "%",
    computed("shariah-lease-ratio", ["debt", "lease", "E"]),
  );

  // ── risk composite + IC summary ──
  const riskWeightKeys = a.riskWeights.map(
    (_, i) => `assumptions.riskWeights.${i}`,
  );
  put(
    "riskScore",
    result.riskScore,
    "score",
    computed("risk-composite", riskWeightKeys),
  );
  put(
    "ic.irr",
    pct(result.ic.irr),
    "%",
    computed("exit-irr", [
      "ke",
      "base.perShare",
      "price",
      "assumptions.holdYears",
    ]),
  );
  // IC hurdle: 15% gross IRR per the Lunar IC Charter — "Hurdle rate: no
  // private growth-equity commitment may be underwritten below a 15% base-case
  // IRR", p.4 (verified via pdftotext). Already a percent-number in
  // ModelResult (15), so no conversion.
  put("ic.hurdle", result.ic.hurdle, "%", {
    kind: "sourced",
    docId: "lunar-ic-charter",
    page: 4,
  });
  put(
    "ic.expectedReturn",
    pct(result.ic.expectedReturn),
    "%",
    computed("prob-weighted-return", weightedReturnInputs),
  );
  put(
    "ic.riskScore",
    result.ic.riskScore,
    "score",
    computed("risk-composite", riskWeightKeys),
  );

  return nodes;
}

// ═════════════════════════ invariant walker (tests) ═════════════════════════

/** Resolves a dotted assumption key ("g", "ordersGrowth.0") into Assumptions;
 * returns true iff it lands on a number. */
function resolvesToNumber(a: Assumptions, key: string): boolean {
  let cur: unknown = a;
  for (const part of key.split(".")) {
    if (cur === null || typeof cur !== "object") return false;
    cur = (cur as Record<string, unknown>)[part];
  }
  return typeof cur === "number";
}

/**
 * Returns every provenance-invariant violation in the node graph:
 *  (a) every computed input resolves to an existing node key;
 *  (b) the graph is acyclic;
 *  (c) every path terminates at sourced | assumption (computed nodes must
 *      have ≥1 input — no constant "orphan" numbers);
 *  (d) every formulaId exists in `formulas`;
 *  (e) every assumptionKey resolves to a number in `assumptions`;
 *  (f) every sourced docId exists in `manifestDocIds`.
 * `rationaleKeys`, when given, additionally checks every rationaleKey.
 */
export function provenanceViolations(
  nodes: Record<ModelKey, ValueNode>,
  formulas: Record<string, FormulaDef>,
  assumptions: Assumptions,
  manifestDocIds: ReadonlySet<string>,
  rationaleKeys?: ReadonlySet<string>,
): string[] {
  const violations: string[] = [];

  for (const [key, node] of Object.entries(nodes)) {
    const p = node.provenance;
    if (!Number.isFinite(node.value)) {
      violations.push(`${key}: value is not a finite number`);
    }
    if (p.kind === "sourced") {
      if (!manifestDocIds.has(p.docId)) {
        violations.push(`${key}: sourced docId "${p.docId}" not in manifest`);
      }
    } else if (p.kind === "assumption") {
      if (!resolvesToNumber(assumptions, p.assumptionKey)) {
        violations.push(
          `${key}: assumptionKey "${p.assumptionKey}" does not resolve in Assumptions`,
        );
      }
      if (rationaleKeys && !rationaleKeys.has(p.rationaleKey)) {
        violations.push(
          `${key}: rationaleKey "${p.rationaleKey}" not in RATIONALE`,
        );
      }
    } else {
      if (!formulas[p.formulaId]) {
        violations.push(`${key}: formulaId "${p.formulaId}" not in FORMULAS`);
      }
      if (p.inputs.length === 0) {
        violations.push(`${key}: computed node has no inputs (orphan number)`);
      }
      for (const input of p.inputs) {
        if (!nodes[input]) {
          violations.push(`${key}: input "${input}" is not a node`);
        }
      }
    }
  }

  // acyclicity (b) — iterative DFS with colors; with (a) and non-empty inputs
  // this also proves every path terminates at sourced | assumption (c).
  const state = new Map<string, "visiting" | "done">();
  const visit = (start: string): void => {
    const stack: [string, number][] = [[start, 0]];
    state.set(start, "visiting");
    while (stack.length > 0) {
      const frame = S(stack, stack.length - 1);
      const [key, idx] = frame;
      const node = nodes[key];
      const inputs =
        node && node.provenance.kind === "computed"
          ? node.provenance.inputs
          : [];
      if (idx >= inputs.length) {
        state.set(key, "done");
        stack.pop();
        continue;
      }
      frame[1] = idx + 1;
      const next = S(inputs, idx);
      const s = state.get(next);
      if (s === "visiting") {
        violations.push(`cycle detected through "${next}" (from "${key}")`);
        state.set(next, "done");
      } else if (s === undefined && nodes[next]) {
        state.set(next, "visiting");
        stack.push([next, 0]);
      }
    }
  };
  for (const key of Object.keys(nodes)) {
    if (!state.has(key)) visit(key);
  }

  return violations;
}

/** Throws (with every violation listed) if the graph breaks an invariant. */
export function assertProvenanceInvariants(
  nodes: Record<ModelKey, ValueNode>,
  formulas: Record<string, FormulaDef>,
  assumptions: Assumptions,
  manifestDocIds: ReadonlySet<string>,
  rationaleKeys?: ReadonlySet<string>,
): void {
  const violations = provenanceViolations(
    nodes,
    formulas,
    assumptions,
    manifestDocIds,
    rationaleKeys,
  );
  if (violations.length > 0) {
    throw new Error(
      `provenance invariants violated:\n${violations.join("\n")}`,
    );
  }
}
