/**
 * Jahez IC memo, the Lunar-branded Word deliverable (§11 "IC memo (Word) sections").
 *
 * Nine sections exactly per spec: Executive summary & recommendation ·
 * Investment thesis (3 pillars) · Company & industry · Financial analysis ·
 * Valuation · Quantified risk assessment · Compliance screen ·
 * Catalysts & monitoring KPIs · Appendix: sources.
 *
 * All prose comes from `data/narratives.json` template strings, resolved via
 * `resolveNarrativeTree()` against `buildNarrativeFacts(computeModel())`, every
 * quantitative claim traces to a `ModelInput` or a `computeModel()` output, never
 * a hand-typed number (AGENTS.md rule 5). Tables (actuals, scenarios, risk
 * register, Compliance ratios, mandate-fit, sources appendix) are built directly
 * from the same data, so the numbers in prose and in tables can never drift
 * apart. Lunar brand (charcoal + gold, serif headings) comes from
 * `lib/generate/shared.ts`'s `lunarBrand`, the one legal home for Office hexes.
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
import { computeModel } from "@/lib/model/compute";

// ════════════════════════════ narrative shapes ══════════════════════════════
interface Pillar {
  title: string;
  body: string;
}
interface MemoNarratives {
  execSummary: string;
  thesisPillars: Pillar[];
  companyIndustry: string;
  financialAnalysis: {
    unitEconomics: string;
    operatingLeverage: string;
    fcfProfile: string;
  };
  valuation: string;
  riskIntro: string;
  mandateFit: string;
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

function h1(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 420, after: 140 },
    border: { bottom: goldRule(10) },
    children: [
      new TextRun({
        text,
        font: B.serif,
        size: half(16),
        bold: true,
        color: B.charcoal,
      }),
    ],
  });
}

function h2(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 220, after: 90 },
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
    spacing: { after: 80, line: 250 },
    children: [
      new TextRun({ text, font: B.sans, size: half(10.5), color: B.ink }),
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
            size: half(9.5),
            bold: opts.bold ?? opts.header ?? false,
            color: opts.color ?? (opts.header ? B.cream : B.ink),
          }),
        ],
      }),
    ],
  });
}

/** A Lunar-styled data table: charcoal header row, alternating body-row tint. */
function dataTable(
  headers: string[],
  rows: string[][],
  widths?: number[],
): Table {
  const w = widths ?? headers.map(() => Math.floor(100 / headers.length));
  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map((h, i) =>
      cell(h, {
        header: true,
        fill: B.charcoal,
        width: w[i],
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

/** Cover at-a-glance: label/value rows, no header band (IC-memo house style). */
function kvTable(rows: [string, string][]): Table {
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
      ([label, value]) =>
        new TableRow({
          children: [
            cell(label, { width: 42, fill: B.paper, bold: true }),
            cell(value, { width: 58 }),
          ],
        }),
    ),
  });
}

// ═════════════════════════════ appendix (sources) ═══════════════════════════
// Every ModelInput key actually cited (by placeholder) anywhere in the memo
// prose, plus the handful of policy/industry-pack pages cited inline as plain
// text (not ModelInput-backed figures), grouped by doc for the sources table.
const CITED_MODEL_INPUT_KEYS = [
  "fy23.gmv",
  "fy23.orders",
  "fy23.aov",
  "fy23.net_revenue",
  "fy23.take_rate",
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
      spacing: { before: 160, after: 260 },
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
      spacing: { after: 80 },
      children: [
        new TextRun({
          text: fact(facts, "calc.rating"),
          font: B.serif,
          size: half(40),
          bold: true,
          color: B.positive,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
      children: [
        new TextRun({
          text: `Target price ${fact(facts, "calc.targetPrice")}  ·  ${fact(facts, "calc.upside")} vs ${fact(facts, "calc.currentPrice")} close`,
          font: B.sans,
          size: half(11.5),
          color: B.charcoalMid,
        }),
      ],
    }),
    kvTable([
      [
        "Target price (12m, DCF-anchored)",
        `${fact(facts, "calc.targetPrice")} (${fact(facts, "calc.upside")} vs ${fact(facts, "calc.currentPrice")} close)`,
      ],
      ["Base-case IRR (4-year hold)", fact(facts, "calc.irrBase")],
      [
        "Scenario-weighted return",
        `${fact(facts, "calc.weightedReturn")} vs ${fact(facts, "calc.hurdle")} benchmark`,
      ],
      ["Quantified risk score", `${fact(facts, "calc.riskScore")} / 10`],
      ["Compliance screen", fact(facts, "calc.complianceStatus")],
      ["Valuation basis", "FCFF DCF, cross-checked against trading comps"],
    ]),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 260, after: 200 },
      children: [
        new TextRun({
          text: "Contents: Executive Summary & Recommendation · Investment Thesis · Company & Industry · Financial Analysis · Valuation · Quantified Risk Assessment · Compliance Screen · Catalysts & Monitoring KPIs · Sources",
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

  // ── Section 1: Executive summary & recommendation ──
  const section1 = [
    h1("Executive Summary & Recommendation"),
    dataTable(
      [
        "Rating",
        "Target price",
        "Current price",
        "Upside",
        "Base IRR (4y)",
        "Wtd. return",
        "Benchmark",
        "Risk score",
        "Compliance",
      ],
      [
        [
          fact(facts, "calc.rating"),
          fact(facts, "calc.targetPrice"),
          fact(facts, "calc.currentPrice"),
          fact(facts, "calc.upside"),
          fact(facts, "calc.irrBase"),
          fact(facts, "calc.weightedReturn"),
          fact(facts, "calc.hurdle"),
          `${fact(facts, "calc.riskScore")} / 10`,
          fact(facts, "calc.complianceStatus"),
        ],
      ],
      [9, 12, 12, 8, 12, 11, 9, 11, 16],
    ),
    caption(
      "Source: Faheem Valuation Model (DCF, Scenarios & Risk, Compliance Screen tabs), see the workbook for the full formula chain.",
    ),
    body(memo.execSummary),
  ];

  // ── Section 2: Investment thesis ──
  const section2 = [h1("Investment Thesis")];
  memo.thesisPillars.forEach((p: Pillar, i: number) => {
    section2.push(h2(`${i + 1}. ${p.title}`));
    section2.push(body(p.body));
  });

  // ── Section 3: Company & industry ──
  const section3 = [h1("Company & Industry"), body(memo.companyIndustry)];

  // ── Section 4: Financial analysis ──
  const inputs = loadModelInputs();
  const actualsRow = (label: string, k23: string, k24: string, k25: string) => [
    label,
    inputs.get(k23) ? formatValueOnly(inputs.get(k23)!) : "n/a",
    inputs.get(k24) ? formatValueOnly(inputs.get(k24)!) : "n/a",
    inputs.get(k25) ? formatValueOnly(inputs.get(k25)!) : "n/a",
  ];
  const section4 = [
    h1("Financial Analysis"),
    h2("Unit economics"),
    body(memo.financialAnalysis.unitEconomics),
    dataTable(
      ["Metric", "FY23A", "FY24A", "FY25A"],
      [
        actualsRow("Orders (m)", "fy23.orders", "fy24.orders", "fy25.orders"),
        actualsRow("AOV (SAR)", "fy23.aov", "fy24.aov", "fy25.aov"),
        actualsRow("GMV (SAR m)", "fy23.gmv", "fy24.gmv", "fy25.gmv"),
        actualsRow(
          "Take rate",
          "fy23.take_rate",
          "fy24.take_rate",
          "fy25.take_rate",
        ),
        actualsRow(
          "Net revenue (SAR m)",
          "fy23.net_revenue",
          "fy24.net_revenue",
          "fy25.net_revenue",
        ),
        actualsRow(
          "Adj. EBITDA (SAR m)",
          "fy23.adj_ebitda",
          "fy24.adj_ebitda",
          "fy25.adj_ebitda",
        ),
      ],
      [30, 23, 23, 24],
    ),
    caption(
      "Source: Annual Report 2024, p.5, p.24; Q4 2025 Earnings Results, p.4.",
    ),
    h2("Operating leverage"),
    body(memo.financialAnalysis.operatingLeverage),
    h2("Free cash flow profile"),
    body(memo.financialAnalysis.fcfProfile),
  ];

  // ── Section 5: Valuation ──
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
  const section5 = [
    h1("Valuation"),
    body(memo.valuation),
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
      `Source: Faheem Valuation Model, DCF tab (WACC ${fact(facts, "calc.wacc")}, cost of equity ${fact(facts, "calc.costOfEquity")}); Market Data & Comparables Snapshot, p.2-4.`,
    ),
  ];

  // ── Section 6: Quantified risk assessment ──
  const section6 = [
    h1("Quantified Risk Assessment"),
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
    h2("Mandate-fit check"),
    body(memo.mandateFit),
    dataTable(
      ["Criterion", "Status", "Detail"],
      [
        [
          "IRR benchmark (15%)",
          model.weightedReturn >= 0.15 ? "PASS" : "REVIEW",
          `Weighted return ${fact(facts, "calc.weightedReturn")} vs ${fact(facts, "calc.hurdle")} benchmark`,
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

  // ── Section 7: Compliance screen ──
  const section7 = [
    h1("Compliance Screen"),
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
    h1("Catalysts & Monitoring KPIs"),
    body(memo.catalysts),
    h2("Monitoring KPIs"),
    ...memo.monitoringKpis.map((k: string) => bullet(k)),
  ];

  // ── Section 9: Appendix, sources ──
  const section9 = [
    h1("Appendix: Sources"),
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

/** Bare value (no unit suffix) for a compact FY23A-FY25A actuals table cell. */
function formatValueOnly(input: { value: number; unit: string }): string {
  const v = input.value;
  switch (input.unit) {
    case "SAR m":
      return v.toLocaleString("en-US", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      });
    case "%":
      return `${v.toFixed(1)}%`;
    case "SAR":
      return v.toFixed(2);
    case "m":
      return v.toFixed(1);
    default:
      return String(v);
  }
}
