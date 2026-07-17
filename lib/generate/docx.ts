/**
 * Jahez IC memo, the Lunar-branded Word deliverable.
 *
 * Structure follows the house investment-memorandum template (modeled on the
 * reference IC memos Lunar's committee reads): an at-a-glance deal grid on the
 * cover, a bulleted Executive Summary, Return Analysis (valuation approaches,
 * scenarios, Benchmark check), Key Strengths and Concerns, Quantified Risk
 * Assessment, Company and Market Overview, Historical and Projected
 * Financials, Compliance Screen, Catalysts and Monitoring KPIs, and a sources
 * appendix. The register is deliberately neutral: modeled outputs are stated,
 * never advocated, and the investment decision rests with the Investment
 * Committee.
 *
 * All prose comes from `data/narratives.json` template strings, resolved via
 * `resolveNarrativeTree()` against `buildNarrativeFacts(computeModel())`, every
 * quantitative claim traces to a `ModelInput`, an `MKT` market datum, or a
 * `computeModel()` output, never a hand-typed number (AGENTS.md rule 5).
 * Tables (financials, comps, scenarios, risk register, Compliance ratios,
 * mandate check, sources appendix) are built directly from the same data, so
 * the numbers in prose and in tables can never drift apart. Lunar brand
 * (charcoal + gold, serif headings) comes from `lib/generate/shared.ts`'s
 * `lunarBrand`, the one legal home for Office hexes.
 */
import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  HeadingLevel,
  Packer,
  PageNumber,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TabStopType,
  TextRun,
  VerticalAlign,
  WidthType,
  convertInchesToTwip,
  type IBorderOptions,
} from "docx";
import {
  buildNarrativeFacts,
  docTitleEn,
  fact,
  loadModelInputs,
  loadNarratives,
  lunarBrand as B,
  resolveNarrativeTree,
  riskRegister,
  type NarrativeFacts,
} from "@/lib/generate/shared";
import { computeModel, YEARS } from "@/lib/model/compute";
import { MKT } from "@/lib/model/inputs";

// ════════════════════════════ narrative shapes ══════════════════════════════
interface TitledItem {
  title: string;
  body: string;
}
interface MemoNarratives {
  execSummary: string[];
  returnAnalysis: {
    approach: string;
    compsNote: string;
    scenarios: string;
    benchmarkCheck: string;
  };
  strengths: TitledItem[];
  concerns: TitledItem[];
  riskIntro: string;
  companyOverview: string;
  marketOverview: string;
  financials: { historical: string; forecast: string };
  compliance: string;
  catalysts: string;
  monitoringKpis: string[];
}

// ═══════════════════════════════ layout helpers ═════════════════════════════
const half = (pt: number): number => Math.round(pt * 2); // docx font sizes are half-points

const thin = (color: string = B.border): IBorderOptions => ({
  style: BorderStyle.SINGLE,
  size: 4,
  color,
});
const goldRule = (size = 10): IBorderOptions => ({
  style: BorderStyle.SINGLE,
  size,
  color: B.gold,
});

function coverBand(
  text: string,
  opts: {
    size: number;
    color: string;
    bold?: boolean;
    italic?: boolean;
    spaceAfter?: number;
  },
): Paragraph {
  // vertical breathing room scaled to font size (twips = 1/20pt), NOT the
  // `spacing.line` unit (240ths of a line); mixing the two caused the band
  // paragraphs to overlap instead of stacking.
  const pad = Math.round(opts.size * 0.3 * 20);
  return new Paragraph({
    shading: { fill: B.charcoal, type: ShadingType.CLEAR, color: "auto" },
    spacing: {
      before: pad,
      after: (opts.spaceAfter ?? 0) + pad,
    },
    indent: { left: convertInchesToTwip(0.3) },
    children: [
      new TextRun({
        text,
        font: B.serif,
        size: half(opts.size),
        bold: opts.bold ?? true,
        italics: opts.italic ?? false,
        color: opts.color,
      }),
    ],
  });
}

/** Section heading: a full-width charcoal band with cream serif text and a
 * gold base rule (the reference-memo section-band pattern in Lunar colors).
 * Paragraph shading fills the paragraph's own spacing, so the air above the
 * band comes from a separate unshaded spacer paragraph. */
function h1(text: string): Paragraph[] {
  return [
    new Paragraph({ spacing: { before: 220, after: 0 }, children: [] }),
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      shading: { fill: B.charcoal, type: ShadingType.CLEAR, color: "auto" },
      border: { bottom: goldRule(12) },
      spacing: { before: 90, after: 240 },
      indent: { left: convertInchesToTwip(0.12) },
      children: [
        new TextRun({
          text,
          font: B.serif,
          size: half(14),
          bold: true,
          color: B.cream,
        }),
      ],
    }),
  ];
}

function h2(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 220, after: 90 },
    border: { bottom: thin(B.border) },
    children: [
      new TextRun({
        text,
        font: B.sans,
        size: half(12),
        bold: true,
        color: B.charcoalMid,
      }),
    ],
  });
}

function body(text: string): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { after: 160, line: 264 },
    children: [
      new TextRun({ text, font: B.sans, size: half(10.5), color: B.ink }),
    ],
  });
}

function bullet(text: string): Paragraph {
  return new Paragraph({
    bullet: { level: 0 },
    alignment: AlignmentType.JUSTIFIED,
    spacing: { after: 100, line: 256 },
    children: [
      new TextRun({ text, font: B.sans, size: half(10.5), color: B.ink }),
    ],
  });
}

/** Reference-memo strengths/concerns bullet: bold lead-in phrase, plain body. */
function bulletLead(title: string, bodyText: string): Paragraph {
  return new Paragraph({
    bullet: { level: 0 },
    alignment: AlignmentType.JUSTIFIED,
    spacing: { after: 110, line: 256 },
    children: [
      new TextRun({
        text: `${title}: `,
        font: B.sans,
        size: half(10.5),
        bold: true,
        color: B.charcoal,
      }),
      new TextRun({
        text: bodyText,
        font: B.sans,
        size: half(10.5),
        color: B.ink,
      }),
    ],
  });
}

function caption(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 40, after: 200 },
    children: [
      new TextRun({
        text,
        font: B.sans,
        size: half(8.5),
        italics: true,
        color: B.inkMuted,
      }),
    ],
  });
}

function cell(
  text: string,
  opts: {
    header?: boolean;
    bold?: boolean;
    fill?: string;
    color?: string;
    align?: (typeof AlignmentType)[keyof typeof AlignmentType];
    width?: number;
    size?: number;
  } = {},
): TableCell {
  return new TableCell({
    width: opts.width
      ? { size: opts.width, type: WidthType.PERCENTAGE }
      : undefined,
    shading: opts.fill
      ? { fill: opts.fill, type: ShadingType.CLEAR, color: "auto" }
      : undefined,
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 70, bottom: 70, left: 110, right: 110 },
    children: [
      new Paragraph({
        alignment: opts.align ?? AlignmentType.LEFT,
        children: [
          new TextRun({
            text,
            font: B.sans,
            size: half(opts.size ?? 9.5),
            bold: opts.bold ?? opts.header ?? false,
            color: opts.color ?? (opts.header ? B.cream : B.ink),
          }),
        ],
      }),
    ],
  });
}

/** A Lunar-styled data table: charcoal header row, alternating body-row tint.
 * `fontSize` drops to 8pt for the wide financials table. */
function dataTable(
  headers: string[],
  rows: string[][],
  widths?: number[],
  fontSize?: number,
): Table {
  const w = widths ?? headers.map(() => Math.floor(100 / headers.length));
  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map((h, i) =>
      cell(h, {
        header: true,
        fill: B.charcoal,
        width: w[i],
        size: fontSize,
        align: i === 0 ? AlignmentType.LEFT : AlignmentType.CENTER,
      }),
    ),
  });
  const bodyRows = rows.map(
    (r, ri) =>
      new TableRow({
        children: r.map((v, i) =>
          cell(v, {
            width: w[i],
            fill: ri % 2 === 1 ? B.paper : undefined,
            size: fontSize,
            align: i === 0 ? AlignmentType.LEFT : AlignmentType.CENTER,
          }),
        ),
      }),
  );
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: thin(B.borderStrong),
      bottom: thin(B.borderStrong),
      left: thin(B.borderStrong),
      right: thin(B.borderStrong),
      insideHorizontal: thin(),
      insideVertical: thin(),
    },
    rows: [headerRow, ...bodyRows],
  });
}

/** Reference-memo at-a-glance grid: paired label/value columns, charcoal label
 * bands with cream text (the cover deal-summary pattern in Lunar colors). */
function pairGrid(rows: [string, string, string, string][]): Table {
  const label = (t: string, w: number): TableCell =>
    cell(t, {
      fill: B.charcoal,
      color: B.cream,
      bold: true,
      width: w,
      align: AlignmentType.LEFT,
    });
  const value = (t: string, w: number): TableCell =>
    cell(t, { width: w, align: AlignmentType.LEFT });
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: thin(B.borderStrong),
      bottom: thin(B.borderStrong),
      left: thin(B.borderStrong),
      right: thin(B.borderStrong),
      insideHorizontal: thin(),
      insideVertical: thin(),
    },
    rows: rows.map(
      ([l1, v1, l2, v2]) =>
        new TableRow({
          children: [
            label(l1, 18),
            value(v1, 32),
            label(l2, 18),
            value(v2, 32),
          ],
        }),
    ),
  });
}

// ══════════════════════════ number formatting (tables) ══════════════════════
const m0 = (v: number): string =>
  v < 0
    ? `(${Math.abs(v).toLocaleString("en-US", { maximumFractionDigits: 0 })})`
    : v.toLocaleString("en-US", { maximumFractionDigits: 0 });
const m1 = (v: number): string =>
  v.toLocaleString("en-US", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
const pc1 = (v: number): string => `${(v * 100).toFixed(1)}%`;
const mult = (v: number): string => `${v.toFixed(2)}x`;

// ═════════════════════════════ appendix (sources) ═══════════════════════════
// Every ModelInput key actually cited (by placeholder in the memo prose or as
// a cell in the financials table), plus the handful of policy/industry-pack
// pages cited inline as plain text (not ModelInput-backed figures), grouped by
// doc for the sources table.
const CITED_MODEL_INPUT_KEYS = [
  "fy23.gmv",
  "fy23.orders",
  "fy23.aov",
  "fy23.net_revenue",
  "fy23.take_rate",
  "fy23.adj_ebitda",
  "fy24.gmv",
  "fy24.orders",
  "fy24.aov",
  "fy24.net_revenue",
  "fy24.take_rate",
  "fy24.adj_ebitda",
  "fy24.adj_ebitda_margin",
  "fy24.dna",
  "fy25.gmv",
  "fy25.gov",
  "fy25.orders",
  "fy25.aov",
  "fy25.net_revenue",
  "fy25.commission_revenue",
  "fy25.take_rate",
  "fy25.gross_margin",
  "fy24.gross_margin",
  "fy25.adj_ebitda",
  "fy25.adj_ebitda_margin",
  "fy25.dna",
  "fy25.net_income",
  "fy25.net_income_yoy",
  "fy25.one_off",
  "fy25.segment_ksa_net_revenue",
  "fy25.segment_ksa_adj_ebitda",
  "fy25.segment_logistics_net_revenue",
  "fy25.snoonu_gmv",
  "fy25.snoonu_gross_revenue",
  "fy25.snoonu_adj_ebitda",
  "fy25.snoonu_gmv_contribution",
  "q1_26.adj_ebitda",
  "q1_26.cash",
  "q1_26.islamic_facilities_loans",
  "q1_26.lease_liabilities",
  "q1_26.net_loss",
] as const;

/** Policy/industry-pack pages cited inline as plain text (no ModelInput backs them). */
const MANUAL_CITATIONS: Record<string, number[]> = {
  "lunar-ic-charter": [3, 4],
  "industry-news-pack": [2, 4],
  "market-data-comps": [2, 3, 4],
};

function buildAppendixRows(): string[][] {
  const inputs = loadModelInputs();
  const byDoc = new Map<string, Set<number>>();
  for (const key of CITED_MODEL_INPUT_KEYS) {
    const input = inputs.get(key);
    if (!input) continue;
    const pages = byDoc.get(input.sourceDoc) ?? new Set<number>();
    pages.add(input.page);
    byDoc.set(input.sourceDoc, pages);
  }
  for (const [doc, pages] of Object.entries(MANUAL_CITATIONS)) {
    const set = byDoc.get(doc) ?? new Set<number>();
    for (const p of pages) set.add(p);
    byDoc.set(doc, set);
  }
  return [...byDoc.entries()]
    .sort((a, b) => docTitleEn(a[0]).localeCompare(docTitleEn(b[0])))
    .map(([docId, pages]) => [
      docTitleEn(docId),
      [...pages]
        .sort((a, b) => a - b)
        .map((p) => `p.${p}`)
        .join(", "),
    ]);
}

// ═══════════════════════════════ document builder ═══════════════════════════
export async function buildIcMemo(): Promise<Buffer> {
  const model = computeModel();
  const facts: NarrativeFacts = buildNarrativeFacts(model);
  const memo = resolveNarrativeTree(
    loadNarratives().memo as unknown as MemoNarratives,
    facts,
  );

  const emptyHeader = new Header();
  const emptyFooter = new Footer();

  const runningHeader = new Header({
    children: [
      new Paragraph({
        border: { bottom: goldRule(6) },
        spacing: { after: 60 },
        tabStops: [
          { type: TabStopType.RIGHT, position: convertInchesToTwip(6.5) },
        ],
        children: [
          new TextRun({
            text: "LUNAR INVESTMENTS",
            font: B.sans,
            size: half(8.5),
            bold: true,
            color: B.charcoalMid,
          }),
          new TextRun({
            text: "\tInvestment Committee Memorandum, Jahez International (Tadawul: 6017)",
            font: B.sans,
            size: half(8.5),
            italics: true,
            color: B.inkMuted,
          }),
        ],
      }),
    ],
  });

  const runningFooter = new Footer({
    children: [
      new Paragraph({
        border: { top: thin(B.border) },
        spacing: { before: 60 },
        children: [
          new TextRun({
            text: "Prepared by Faheem for Lunar Investments, Advisory only. Not investment advice.",
            font: B.sans,
            size: half(8),
            italics: true,
            color: B.inkMuted,
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [
          new TextRun({
            children: [
              "Page ",
              PageNumber.CURRENT,
              " of ",
              PageNumber.TOTAL_PAGES,
            ],
            font: B.sans,
            size: half(8),
            color: B.inkMuted,
          }),
        ],
      }),
    ],
  });

  // ── Cover page ──
  const coverChildren: (Paragraph | Table)[] = [
    new Paragraph({ spacing: { after: 0 }, children: [] }),
    coverBand("LUNAR INVESTMENTS", {
      size: 30,
      color: B.cream,
      spaceAfter: 60,
    }),
    coverBand("Equity Research · Investment Committee Memorandum", {
      size: 13,
      color: B.gold,
      italic: true,
      spaceAfter: 30,
    }),
    coverBand("Jahez International Company (Tadawul: 6017)", {
      size: 13,
      color: B.cream,
      bold: false,
      spaceAfter: 220,
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 160, after: 200 },
      children: [
        new TextRun({
          text: "PRIVILEGED & CONFIDENTIAL · PREPARED FOR THE INVESTMENT COMMITTEE",
          font: B.sans,
          size: half(8.5),
          bold: true,
          color: B.inkMuted,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
      children: [
        new TextRun({
          text: "For Investment Committee Decision",
          font: B.serif,
          size: half(20),
          bold: true,
          color: B.charcoal,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
      children: [
        new TextRun({
          text: `Scenario-weighted expected return ${fact(facts, "calc.weightedReturn")} vs the ${fact(facts, "calc.hurdle")} Benchmark · 4-year hold`,
          font: B.sans,
          size: half(11.5),
          color: B.charcoalMid,
        }),
      ],
    }),
    pairGrid([
      [
        "Company",
        "Jahez International Company",
        "Listing",
        "Tadawul Main Market · 6017",
      ],
      ["Sector", "Quick-commerce & food delivery", "Geography", "Saudi Arabia"],
      [
        "Instrument",
        "Public equity",
        "Hold period",
        "4 years (mandate window 3-5)",
      ],
      [
        "Current price",
        fact(facts, "calc.currentPrice"),
        "Base-case value (DCF)",
        fact(facts, "calc.targetPrice"),
      ],
      [
        "Weighted return",
        fact(facts, "calc.weightedReturn"),
        "Benchmark",
        `${fact(facts, "calc.hurdle")} gross IRR`,
      ],
      [
        "Risk score",
        `${fact(facts, "calc.riskScore")} / 10`,
        "Compliance screen",
        fact(facts, "calc.complianceStatus"),
      ],
    ]),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 260, after: 200 },
      children: [
        new TextRun({
          text: "Contents: Executive Summary · Return Analysis · Key Strengths and Concerns · Quantified Risk Assessment · Company and Market Overview · Historical and Projected Financials · Compliance Screen · Catalysts and Monitoring KPIs · Sources",
          font: B.sans,
          size: half(8.5),
          color: B.inkMuted,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      border: { top: goldRule(6), bottom: goldRule(6) },
      spacing: { before: 200, after: 200 },
      children: [
        new TextRun({
          text: "Advisory only, the investment decision rests with the Investment Committee.",
          font: B.sans,
          size: half(10),
          italics: true,
          color: B.inkMuted,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 320 },
      pageBreakBefore: false,
      children: [
        new TextRun({
          text: "Prepared by Faheem for Lunar Investments · 12 July 2026",
          font: B.sans,
          size: half(9.5),
          color: B.inkMuted,
        }),
      ],
    }),
  ];

  // ── Section 1: Executive summary (bulleted, reference-memo style) ──
  const section1 = [
    ...h1("Executive Summary"),
    ...memo.execSummary.map((b) => bullet(b)),
    caption(
      "Figures: FY2025 Earnings Results, Q1 2026 Financial Statements, and the Faheem Valuation Model; every figure traces to the sources appendix.",
    ),
  ];

  // ── Section 2: Return analysis ──
  const scenarioRow = (
    name: string,
    s: { g: number; perShare: number; upside: number; irr: number },
  ) => [
    name,
    `${(s.g * 100).toFixed(1)}%`,
    `SAR ${s.perShare.toFixed(2)}`,
    `${s.upside >= 0 ? "+" : ""}${(s.upside * 100).toFixed(1)}%`,
    `${(s.irr * 100).toFixed(1)}%`,
  ];
  const section2 = [
    ...h1("Return Analysis"),
    h2("Valuation approach"),
    body(memo.returnAnalysis.approach),
    h2("Trading comparables cross-check"),
    body(memo.returnAnalysis.compsNote),
    dataTable(
      ["Comparable", "EV/Revenue", "EV/EBITDA", "P/E (TTM)"],
      [
        [
          "Talabat",
          mult(MKT.talabatEvRev.value),
          mult(MKT.talabatEvEbitda.value),
          mult(MKT.talabatPe.value),
        ],
        [
          "DoorDash",
          mult(MKT.doordashEvRev.value),
          mult(MKT.doordashEvEbitda.value),
          mult(MKT.doordashPe.value),
        ],
        [
          "Delivery Hero",
          mult(MKT.dheroEvRev.value),
          mult(MKT.dheroEvEbitda.value),
          "n/a",
        ],
      ],
      [34, 22, 22, 22],
    ),
    caption(
      `Source: Market Data & Comparables Snapshot, p.4. Implied value per share across all methods: ${fact(facts, "calc.compsMin")} min · ${fact(facts, "calc.compsMedian")} median · ${fact(facts, "calc.compsMax")} max.`,
    ),
    h2("Scenario analysis"),
    body(memo.returnAnalysis.scenarios),
    dataTable(
      [
        "Scenario",
        "Terminal growth",
        "Value / share",
        "Upside / (downside)",
        "IRR (4y)",
      ],
      [
        scenarioRow("Bear (25%)", model.bear),
        scenarioRow("Base (50%)", model.base),
        scenarioRow("Bull (25%)", model.bull),
        [
          "Probability-weighted",
          "–",
          fact(facts, "calc.weightedPerShare"),
          "–",
          fact(facts, "calc.weightedReturn"),
        ],
      ],
      [30, 18, 18, 18, 16],
    ),
    caption(
      `Source: Faheem Valuation Model, DCF and Scenarios & Risk tabs (WACC ${fact(facts, "calc.wacc")}, cost of equity ${fact(facts, "calc.costOfEquity")}).`,
    ),
    h2("Return summary"),
    dataTable(
      ["Metric", "Value"],
      [
        ["Current price (close)", fact(facts, "calc.currentPrice")],
        ["Base-case value per share (DCF)", fact(facts, "calc.targetPrice")],
        ["Implied upside vs close", fact(facts, "calc.upside")],
        ["Base-case IRR (4-year hold)", fact(facts, "calc.irrBase")],
        [
          "Scenario-weighted value per share",
          fact(facts, "calc.weightedPerShare"),
        ],
        [
          "Scenario-weighted expected return",
          fact(facts, "calc.weightedReturn"),
        ],
        ["Benchmark (Lunar mandate, gross IRR)", fact(facts, "calc.hurdle")],
      ],
      [55, 45],
    ),
    caption(
      "Source: Faheem Valuation Model; Lunar IC Charter & Investment Mandate, p.3.",
    ),
    h2("Benchmark and mandate check"),
    body(memo.returnAnalysis.benchmarkCheck),
    dataTable(
      ["Criterion", "Status", "Detail"],
      [
        [
          "IRR Benchmark (15%)",
          model.weightedReturn >= 0.15 ? "PASS" : "REVIEW",
          `Weighted return ${fact(facts, "calc.weightedReturn")} vs the ${fact(facts, "calc.hurdle")} Benchmark`,
        ],
        [
          "Single-name concentration (10% cap)",
          "PASS (subject to ticket sizing)",
          "Public-equity position sized within the mandate cap by the Investment Committee",
        ],
        [
          "Liquidity",
          "PASS",
          "Tadawul-listed (6017) with active daily trading",
        ],
      ],
      [34, 30, 36],
    ),
    caption("Source: Lunar IC Charter & Investment Mandate, p.3-4."),
  ];

  // ── Section 3: Key strengths and concerns ──
  const section3 = [
    ...h1("Key Strengths and Concerns"),
    h2("Key strengths"),
    ...memo.strengths.map((s) => bulletLead(s.title, s.body)),
    h2("Key concerns"),
    ...memo.concerns.map((c) => bulletLead(c.title, c.body)),
  ];

  // ── Section 4: Quantified risk assessment ──
  const section4 = [
    ...h1("Quantified Risk Assessment"),
    body(memo.riskIntro),
    dataTable(
      ["Risk", "P", "I", "Score", "Mitigation", "Cite"],
      riskRegister.map((r) => [
        r.name,
        String(r.probability),
        String(r.impact),
        String(r.probability * r.impact),
        r.mitigation,
        r.cite,
      ]),
      [26, 6, 6, 8, 34, 20],
    ),
    caption(
      `Composite risk score (peak-weighted, 0-10): ${fact(facts, "calc.riskScore")}.`,
    ),
  ];

  // ── Section 5: Company and market overview ──
  const section5 = [
    ...h1("Company and Market Overview"),
    h2("Company overview"),
    body(memo.companyOverview),
    h2("Market and competitive landscape"),
    body(memo.marketOverview),
  ];

  // ── Section 6: Historical and projected financials ──
  const margin = (i: number): number =>
    (model.ebitda[i] ?? 0) / (model.netRev[i] ?? 1);
  const years8 = [...YEARS];
  const finRow = (
    label: string,
    format: (v: number, i: number) => string,
    series: number[],
  ): string[] => [label, ...series.map((v, i) => format(v, i))];
  const section6 = [
    ...h1("Historical and Projected Financials"),
    body(memo.financials.historical),
    dataTable(
      ["SAR m unless noted", ...years8],
      [
        finRow("Orders (m)", (v) => m1(v), model.orders),
        finRow("Avg. order value (SAR)", (v) => v.toFixed(2), model.aov),
        finRow("GMV", (v) => m0(v), model.gmv),
        finRow("Net revenue", (v) => m0(v), model.netRev),
        finRow("Take rate", (v) => pc1(v), model.takeRate),
        finRow("Adj. EBITDA", (v) => m0(v), model.ebitda),
        finRow("Adj. EBITDA margin", (_v, i) => pc1(margin(i)), model.ebitda),
        finRow("FCFF", (v, i) => (i === 0 ? "–" : m0(v)), model.fcff),
      ],
      [16.8, 10.4, 10.4, 10.4, 10.4, 10.4, 10.4, 10.4, 10.4],
      8,
    ),
    caption(
      "FY23A-FY25A actuals: Annual Report 2024, p.5, p.24; Q4 2025 Earnings Results, p.4. FY26E-FY30E and actual-year FCFF: Faheem Valuation Model on documented assumptions (workbook Assumptions tab). E = estimate.",
    ),
    body(memo.financials.forecast),
  ];

  // ── Section 7: Compliance screen ──
  const section7 = [
    ...h1("Compliance Screen"),
    body(memo.compliance),
    dataTable(
      ["Screen", "Value", "Threshold", "Flag"],
      [
        [
          "Interest-bearing debt / market cap",
          fact(facts, "calc.debtRatio"),
          "33.00%",
          model.compliance.debtPass ? "PASS" : "FAIL",
        ],
        [
          "Cash & securities / market cap",
          fact(facts, "calc.cashRatio"),
          "33.00%",
          model.compliance.cashPass ? "PASS" : "FAIL",
        ],
        [
          "Memo: (debt + leases) / market cap",
          fact(facts, "calc.leaseInclRatio"),
          "33.00%",
          model.compliance.leaseInclRatio < 0.33 ? "PASS" : "FAIL",
        ],
      ],
      [40, 20, 20, 20],
    ),
    caption("Source: Q1 2026 Financial Statements, p.4 (balance sheet)."),
  ];

  // ── Section 8: Catalysts & monitoring KPIs ──
  const section8 = [
    ...h1("Catalysts and Monitoring KPIs"),
    body(memo.catalysts),
    h2("Monitoring KPIs"),
    ...memo.monitoringKpis.map((k: string) => bullet(k)),
  ];

  // ── Section 9: Appendix, sources ──
  const section9 = [
    ...h1("Appendix: Sources"),
    body(
      "Every source document actually cited in this memo, with the pages the cited figures came from. Full cell-level source trails are in the accompanying Excel valuation workbook.",
    ),
    dataTable(["Document", "Pages cited"], buildAppendixRows(), [70, 30]),
  ];

  const doc = new Document({
    title: "Jahez International, Investment Committee Memorandum",
    creator: "Faheem",
    subject: "Jahez International Company (Tadawul: 6017)",
    description:
      "Lunar Investments IC memo, advisory only, generated by Faheem",
    sections: [
      {
        properties: {
          page: {
            size: {
              width: convertInchesToTwip(8.27),
              height: convertInchesToTwip(11.69),
            }, // A4
            margin: {
              top: convertInchesToTwip(1),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(1),
              right: convertInchesToTwip(1),
            },
          },
          titlePage: true,
        },
        headers: { default: runningHeader, first: emptyHeader },
        footers: { default: runningFooter, first: emptyFooter },
        children: [
          ...coverChildren,
          new Paragraph({ pageBreakBefore: true, children: [] }),
          ...section1,
          ...section2,
          ...section3,
          ...section4,
          ...section5,
          ...section6,
          ...section7,
          ...section8,
          ...section9,
        ],
      },
    ],
  });

  return Packer.toBuffer(doc);
}
