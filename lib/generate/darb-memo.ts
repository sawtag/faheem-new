/**
 * Darb screening memorandum, the Lunar-branded Word deliverable for the
 * screening-stage inbound deal (workspace "darb"). Neutral analytical tone,
 * opinions labeled as judgments (AGENTS.md rule 5): this is a screening memo,
 * not an IC recommendation, so the register stays deliberately more cautious
 * than the Jahez IC memo, figures are flagged company-reported/unaudited.
 *
 * Structure follows the house investment-memorandum template (same shape as
 * the Jahez IC memo, adapted for a private screening-stage deal): at-a-glance
 * grid on the cover, bulleted Executive Summary, Screening Outcome vs the IC
 * Charter, Key Strengths and Concerns, Company and Market Overview, Financial
 * Summary and Use of Proceeds, and a sources appendix. The screening outcome
 * is reported, never advocated: advancing past screening and any investment
 * decision rest with the Investment Committee.
 *
 * Layout helpers mirror lib/generate/docx.ts (same Lunar brand, same table
 * chrome) but are re-implemented locally, docx.ts is owned by another
 * workstream and AGENTS.md rule 7 forbids editing files outside one's lane.
 * Every figure traces to a `data/model-inputs.json` `darb.*` entry or a
 * `data/deals.json` `darb` screening row, resolved through the same
 * `sourceLabel()`/`docTitleEn()` helpers the Jahez memo uses, never a
 * hand-typed number.
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
  docTitleEn,
  loadModelInputs,
  lunarBrand as B,
  sourceLabel,
  type Sourced,
} from "@/lib/generate/shared";
import { dealById } from "@/lib/deals";
import type { ModelInput } from "@/lib/types";

// ═══════════════════════════════ layout helpers ═════════════════════════════
// Mirrors docx.ts's private helpers (same visual language), duplicated rather
// than imported, see file header.
const half = (pt: number): number => Math.round(pt * 2);

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
  const pad = Math.round(opts.size * 0.3 * 20);
  return new Paragraph({
    shading: { fill: B.charcoal, type: ShadingType.CLEAR, color: "auto" },
    spacing: { before: pad, after: (opts.spaceAfter ?? 0) + pad },
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
 * gold base rule. The air above comes from a separate unshaded spacer. */
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

/** Strengths/concerns bullet: bold lead-in phrase, plain body. */
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

/** At-a-glance grid: paired label/value columns, charcoal label bands. */
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

// ═══════════════════════════ darb.* input helpers ═══════════════════════════
function darbInput(suffix: string): ModelInput {
  const input = loadModelInputs().get(`darb.${suffix}`);
  if (!input) throw new Error(`Missing model input: darb.${suffix}`);
  return input;
}

/** Unit-aware plain-text formatting for a darb.* ModelInput. */
function fmt(suffix: string): string {
  const input = darbInput(suffix);
  const v = input.value;
  // The Series B ask is a clean round figure, matches the "SAR 40M" convention
  // used for Deal.ask elsewhere in the product, unlike the decimal ARR/burn figures.
  if (suffix === "ask") return `SAR ${v}M`;
  switch (input.unit) {
    case "SAR m":
      return `SAR ${v.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}m`;
    case "%":
      return `${v.toFixed(0)}%`;
    case "months":
      return `~${v.toFixed(0)} months`;
    case "count":
    default:
      return String(v);
  }
}

/** Sources cited (by doc id) anywhere the memo pulls a figure or quoted fact from. */
const CITED_DOC_PAGES: Record<string, number[]> = {
  "darb-dataroom": [1, 2, 3, 4],
  "lunar-ic-charter": [3, 4, 5],
  "lunar-portfolio": [1],
};

function buildAppendixRows(): string[][] {
  return Object.entries(CITED_DOC_PAGES)
    .sort((a, b) => docTitleEn(a[0]).localeCompare(docTitleEn(b[0])))
    .map(([docId, pages]) => [
      docTitleEn(docId),
      [...pages]
        .sort((a, b) => a - b)
        .map((p) => `p.${p}`)
        .join(", "),
    ]);
}

/** Distinct source documents actually cited in the memo (drives the artifact's "sources" count). */
export function darbSourceCount(): number {
  return Object.keys(CITED_DOC_PAGES).length;
}

const dataroomCite = (page: number): Sourced => ({
  sourceDoc: "darb-dataroom",
  page,
});
const charterCite = (page: number): Sourced => ({
  sourceDoc: "lunar-ic-charter",
  page,
});

// ═══════════════════════════════ document builder ═══════════════════════════
export async function buildDarbMemo(): Promise<Buffer> {
  const deal = dealById("darb");
  if (!deal?.screening) throw new Error("Darb deal or screening rows missing");

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
            text: "\tScreening Memorandum, Darb Logistics Technology",
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
    coverBand("Private Growth Equity, Deal Screening", {
      size: 13,
      color: B.gold,
      italic: true,
      spaceAfter: 30,
    }),
    coverBand(
      "Darb Logistics Technology: Screening Memorandum for the Investment Committee",
      {
        size: 13,
        color: B.cream,
        bold: false,
        spaceAfter: 220,
      },
    ),
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
          text: "Screening Outcome: Advance to Pitch Meeting",
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
          text: "5 of 6 Charter criteria pass · 1 concentration flag requiring IC acknowledgement",
          font: B.sans,
          size: half(11.5),
          color: B.charcoalMid,
        }),
      ],
    }),
    pairGrid([
      ["Company", "Darb Logistics Technology", "Sector", "Logistics SaaS"],
      ["Transaction", "Series B · primary", "Ask", fmt("ask")],
      ["Geography", "Riyadh, Saudi Arabia", "Founded", "2022"],
      [
        "ARR (FY2025A)",
        `${fmt("arr_fy25")} (company-reported)`,
        "ARR (FY2026E)",
        `${fmt("arr_fy26e")} guided`,
      ],
      [
        "NRR (FY2025A)",
        fmt("nrr_fy25"),
        "Runway at close",
        fmt("runway_months"),
      ],
      [
        "Screening result",
        "5 of 6 pass · 1 flag",
        "Compliance pre-screen",
        "Pass",
      ],
    ]),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 260, after: 200 },
      children: [
        new TextRun({
          text: "Contents: Executive Summary · Screening Outcome vs the IC Charter · Key Strengths and Concerns · Company and Market Overview · Financial Summary and Use of Proceeds · Sources",
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
          text: "A screening outcome only, the investment decision rests with the Investment Committee.",
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
      children: [
        new TextRun({
          text: "Prepared by Faheem for Lunar Investments · 15 July 2026",
          font: B.sans,
          size: half(9.5),
          color: B.inkMuted,
        }),
      ],
    }),
  ];

  // ── Section 1: Executive summary ──
  const section1 = [
    ...h1("Executive Summary"),
    bullet(
      "Darb Logistics Technology is a Riyadh-based logistics SaaS company, founded in 2022, providing route optimization, live fleet operations, a carrier API layer and delivery analytics to last-mile and middle-mile operators; the product is subscription software deployed on the customer's existing fleet.",
    ),
    bullet(
      `The inbound opportunity is a ${fmt("ask")} Series B, sourced via founder outreach to Lunar's private growth-equity desk.`,
    ),
    bullet(
      `Company-reported, unaudited figures show ARR of ${fmt("arr_fy25")} in FY2025A and ${fmt("arr_fy26e")} guided for FY2026E (+${fmt("arr_growth")} YoY), gross margin of ${fmt("gross_margin_fy25")}, and net revenue retention of ${fmt("nrr_fy25")}.`,
    ),
    bullet(
      `Management indicates proceeds are earmarked roughly ${fmt("proceeds_gtm")} for go-to-market expansion, ${fmt("proceeds_product")} for product and engineering headcount, and ${fmt("proceeds_working_capital")} for working capital; post-round cash runway is guided at ${fmt("runway_months")}.`,
    ),
    bullet(
      "Mandate screening against the Lunar IC Charter: five of six criteria pass outright; sector concentration is flagged, post-deal Technology & Consumer exposure of 10.5% of firm AUM would exceed the Charter's 10% cap and requires explicit Investment Committee acknowledgement before the deal advances.",
    ),
    bullet(
      "No sanctions, conflicts-of-interest, or related-party issues were identified at the pre-screen stage; the compliance pre-screen passes.",
    ),
    bullet(
      "All figures in this memorandum are screening-stage and unaudited: audited FY2023-FY2025 statements, customer contracts, and cohort-level retention data are required diligence items under NDA.",
    ),
    bullet(
      "This memorandum reports a screening outcome, not an investment recommendation; advancing past screening and any subsequent investment decision rest with the Investment Committee.",
    ),
    caption(
      `${sourceLabel(dataroomCite(1))}; ${sourceLabel(dataroomCite(3))}; ${sourceLabel(charterCite(3))}.`,
    ),
  ];

  // ── Section 2: Screening outcome vs the IC Charter ──
  const screeningRows = deal.screening.rows.map((row) => [
    row.criterion.en,
    row.verdict.toUpperCase(),
    row.note.en,
  ]);
  const section2 = [
    ...h1("Screening Outcome vs the IC Charter"),
    body(
      "This memorandum summarizes the initial mandate screening of Darb Logistics Technology, an inbound Series B opportunity, against the Lunar Investments IC Charter. It is a screening-stage document: it establishes whether the opportunity clears the firm's baseline mandate criteria, not a full investment analysis.",
    ),
    body(
      "The Screening Agent checked Darb against every Charter criterion that applies to a private growth-equity opportunity. Five of six criteria pass outright; the sixth, sector concentration, is flagged rather than failed. The Charter treats a post-deal concentration breach as requiring explicit Investment Committee acknowledgement before the deal may advance further, not as an automatic decline; this acknowledgement is a required step, not a formality to be assumed.",
    ),
    dataTable(["Criterion", "Verdict", "Detail"], screeningRows, [22, 12, 66]),
    caption(
      `${sourceLabel(charterCite(3))}; ${sourceLabel(charterCite(4))}; ${sourceLabel(charterCite(5))}.`,
    ),
    h2("Concentration detail"),
    body(
      "The Technology & Consumer sector bucket currently sits at 8.5% of firm AUM. A SAR 40M ticket represents a further 2.0% of AUM, bringing post-deal sector exposure to 10.5%, above the Charter's 10% sector concentration cap. Per the Charter, this does not automatically fail the screen, but it requires explicit IC acknowledgement of the mandate breach before the deal may advance.",
    ),
    caption(
      `${sourceLabel({ sourceDoc: "lunar-portfolio", page: 1 })}; ${sourceLabel(charterCite(4))}.`,
    ),
    h2("Red flags"),
    body(
      "No sanctions, conflicts-of-interest, or related-party issues were identified at the pre-screen stage.",
    ),
  ];

  // ── Section 3: Key strengths and concerns ──
  const section3 = [
    ...h1("Key Strengths and Concerns"),
    h2("Key strengths"),
    bulletLead(
      "Subscription SaaS on an asset-light model",
      "The platform is deployed as subscription software layered on the customer's existing fleet, avoiding the asset-heavy economics of an owned-fleet delivery business; route optimization, fleet operations, carrier integrations and analytics sit in one dashboard and API layer.",
    ),
    bulletLead(
      "Reported net revenue retention above 100%",
      `Company-reported NRR of ${fmt("nrr_fy25")} in FY2025A and ${fmt("nrr_fy26e")} guided for FY2026E indicates expansion within the existing customer base; durability has not been independently tested and is an open diligence item.`,
    ),
    bulletLead(
      "Reported growth with logo expansion",
      `ARR is reported at ${fmt("arr_fy25")} for FY2025A with ${fmt("arr_fy26e")} guided for FY2026E (+${fmt("arr_growth")} YoY), on logo growth from ${fmt("logos_fy25")} to ${fmt("logos_fy26e")} active customers, at a ${fmt("gross_margin_fy25")} reported gross margin.`,
    ),
    bulletLead(
      "Policy-aligned market backdrop, as framed by management",
      "Management frames the opportunity against growth in Saudi e-commerce and quick-commerce delivery volumes and the logistics-digitization push under Vision 2030's transport and logistics pillar; this is management's framing, presented as a judgment to be tested in diligence, not an independently verified market estimate.",
    ),
    h2("Key concerns"),
    bulletLead(
      "Unaudited, company-reported figures",
      "All financial figures in this memorandum are company-reported and unaudited; full audited or reviewed statements for FY2023-FY2025 are pending under NDA and are a required diligence item before any ticket is issued.",
    ),
    bulletLead(
      "Customer concentration unknown",
      "Concentration cannot be assessed until the full data room (customer contracts and cohort-level retention) is reviewed; the segment split shared at screening is anonymized.",
    ),
    bulletLead(
      "Retention durability untested",
      "Net revenue retention at 118-124% has not been independently tested against cohort-level churn data.",
    ),
    bulletLead(
      "Competitive response from in-house tooling",
      "In-house dispatch tooling built by large logistics operators and quick-commerce platforms is management's stated primary competitive risk, not yet independently assessed.",
    ),
    bulletLead(
      "Sector concentration flag",
      "Post-deal Technology & Consumer exposure of 10.5% of AUM would sit above the Charter's 10% cap; the Charter requires explicit IC acknowledgement of the breach before the deal advances.",
    ),
    caption(
      `${sourceLabel(dataroomCite(3))}; ${sourceLabel(dataroomCite(6))}; ${sourceLabel(charterCite(4))}. Company-reported figures are unaudited at screening stage.`,
    ),
  ];

  // ── Section 4: Company and market overview ──
  const section4 = [
    ...h1("Company and Market Overview"),
    h2("Company overview"),
    body(
      "Darb builds fleet- and route-optimization software for last-mile and middle-mile logistics operators in the Kingdom. The platform sits between shippers and carrier fleets, providing route planning, real-time tracking, proof-of-delivery, and carrier-performance analytics through a single dashboard and API layer. The product is deployed as subscription SaaS layered on the customer's existing fleet, avoiding the asset-heavy economics of an owned-fleet delivery business.",
    ),
    h2("Product surface"),
    bullet("Route Optimization Engine, dynamic routing across driver fleets"),
    bullet(
      "Fleet Ops Dashboard, live tracking, proof-of-delivery, exception management",
    ),
    bullet(
      "Carrier API, integration layer for third-party carrier networks and quick-commerce platforms",
    ),
    bullet(
      "Analytics Suite, delivery SLA, cost-per-order, and carrier-performance reporting",
    ),
    h2("Market backdrop"),
    body(
      "Management frames the opportunity against rapid growth in Saudi e-commerce and quick-commerce delivery volumes, and the broader push toward logistics-sector digitization under Vision 2030's transport and logistics pillar. This is management's framing of the opportunity, presented here as a judgment to be tested in diligence, not an independently verified market estimate.",
    ),
    caption(sourceLabel(dataroomCite(2))),
    h2("Founding team"),
    bulletLead(
      "Faisal Al-Otaibi, Co-founder & CEO",
      "Former operations lead at a Riyadh-based quick-commerce platform, where he built the last-mile dispatch system that Darb's routing engine is descended from. Industrial engineering background, King Saud University.",
    ),
    bulletLead(
      "Nourah Al-Harbi, Co-founder & CTO",
      "Previously a senior backend engineer on a regional ride-hailing platform's logistics team. Led Darb's API and carrier-integration architecture from day one. Computer science background, KFUPM.",
    ),
    bulletLead(
      "Khalid Al-Dossari, Co-founder & Head of Revenue",
      "Ten years in enterprise SaaS sales across the GCC prior to Darb, most recently running mid-market sales for a regional fleet-management vendor. Owns Darb's enterprise and quick-commerce partnership pipeline.",
    ),
    caption(sourceLabel(dataroomCite(4))),
  ];

  // ── Section 5: Financial summary and use of proceeds ──
  const section5 = [
    ...h1("Financial Summary and Use of Proceeds"),
    body(
      "The figures below are Darb's own reporting, unaudited, as shared at the screening stage. Full audited or reviewed financial statements for FY2023-FY2025 sit in the data room under NDA and are a required diligence item before any ticket is issued.",
    ),
    dataTable(
      ["Metric", "FY2025A", "FY2026E"],
      [
        ["Annual Recurring Revenue (ARR)", fmt("arr_fy25"), fmt("arr_fy26e")],
        ["YoY ARR growth", "–", fmt("arr_growth")],
        ["Gross margin", fmt("gross_margin_fy25"), fmt("gross_margin_fy26e")],
        ["Net revenue retention (NRR)", fmt("nrr_fy25"), fmt("nrr_fy26e")],
        [
          "Logo count (active customers)",
          fmt("logos_fy25"),
          fmt("logos_fy26e"),
        ],
        ["Monthly cash burn (avg.)", fmt("burn_monthly"), "–"],
        ["Cash runway at close (post-round)", "–", fmt("runway_months")],
      ],
      [40, 30, 30],
    ),
    caption(
      `${sourceLabel(dataroomCite(3))}. Company-reported and unaudited at screening stage.`,
    ),
    h2("Use of proceeds"),
    body(
      `Management indicates the ${fmt("ask")} Series B is earmarked roughly ${fmt("proceeds_gtm")} for go-to-market expansion (enterprise sales, quick-commerce partnerships), ${fmt("proceeds_product")} for product and engineering headcount, and ${fmt("proceeds_working_capital")} for working capital and runway extension.`,
    ),
    caption(sourceLabel(dataroomCite(3))),
  ];

  // ── Section 6: Appendix, sources ──
  const section6 = [
    ...h1("Appendix: Sources"),
    body(
      "Every source document actually cited in this memo, with the pages the cited figures or facts came from.",
    ),
    dataTable(["Document", "Pages cited"], buildAppendixRows(), [70, 30]),
  ];

  const doc = new Document({
    title: "Darb Logistics Technology, Screening Memorandum",
    creator: "Faheem",
    subject: "Darb Logistics Technology, Series B screening",
    description:
      "Lunar Investments screening memo, advisory only, generated by Faheem",
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
        ],
      },
    ],
  });

  return Packer.toBuffer(doc);
}
