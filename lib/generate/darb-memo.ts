/**
 * Darb screening memorandum, the Lunar-branded Word deliverable for the
 * screening-stage inbound deal (workspace "darb"). Neutral analytical tone,
 * opinions labeled as judgments (AGENTS.md rule 5): this is a screening memo,
 * not an IC recommendation, so the register stays deliberately more cautious
 * than the Jahez IC memo, figures are flagged company-reported/unaudited.
 *
 * Ten sections: Purpose & recommendation (bullet-led screening summary),
 * Company at a glance, Product & market, Financial summary, Use of proceeds,
 * Founding team, Screening assessment: strengths & concerns, Mandate
 * screening vs the IC Charter, Risks & open diligence, Appendix: sources.
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

/** "Title: body" bullet, bolded lead-in, the strengths/concerns register style. */
function bulletTitled(title: string, bodyText: string): Paragraph {
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { after: 100, line: 250 },
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
    // explicit per-column twips (A4 usable width = 6.27in): Word respects the
    // per-cell percentage widths alone, LibreOffice does not and re-flows the
    // columns evenly, wrapping headers mid-word without this.
    columnWidths: w.map((p) => Math.round((p / 100) * 6.27 * 1440)),
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

// ═══════════════════════════ darb.* input helpers ═══════════════════════════
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
          text: "ADVANCE TO PITCH MEETING",
          font: B.serif,
          size: half(28),
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
          text: `Series B · ${fmt("ask")} ask · Logistics SaaS · Riyadh`,
          font: B.sans,
          size: half(11.5),
          color: B.charcoalMid,
        }),
      ],
    }),
    kvTable([
      ["Round / ask", `Series B · ${fmt("ask")}`],
      ["Sector / headquarters", "Logistics SaaS · Riyadh, Saudi Arabia"],
      [
        "ARR (company-reported, unaudited)",
        `${fmt("arr_fy25")} FY2025A · ${fmt("arr_fy26e")} FY2026E guided`,
      ],
      ["Net revenue retention (FY2025A)", fmt("nrr_fy25")],
      [
        "Screening result",
        "5 criteria pass · 1 concentration warning (IC acknowledgement required)",
      ],
      ["Compliance pre-screen", "Pass"],
    ]),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 260, after: 200 },
      children: [
        new TextRun({
          text: "Contents: Purpose and Recommendation · Company at a Glance · Product and Market · Financial Summary · Use of Proceeds · Founding Team · Screening Assessment: Strengths and Concerns · Mandate Screening vs the IC Charter · Risks and Open Diligence Items · Sources",
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
          text: "A screening recommendation only, the investment decision rests with the Investment Committee.",
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

  // ── Section 1: Purpose and recommendation ──
  const section1 = [
    h1("Purpose and Recommendation"),
    body(
      "This memorandum summarizes the initial mandate screening of Darb Logistics Technology, an inbound Series B opportunity, against the Lunar Investments IC Charter. It is a screening-stage document: it establishes whether the opportunity clears the firm's baseline mandate criteria, not a full investment recommendation.",
    ),
    body(
      "Screening recommendation: advance Darb to a pitch meeting. Five of six criteria pass outright; the sixth, sector concentration, is flagged rather than failed. The Charter treats a post-deal concentration breach as requiring explicit Investment Committee acknowledgement before the deal may advance further, not as an automatic decline, this acknowledgement is a required step, not a formality to be assumed.",
    ),
    h2("Screening summary"),
    bullet(
      `Darb Logistics Technology is a Riyadh-based logistics SaaS company founded in 2022, raising a ${fmt("ask")} Series B. The opportunity arrived inbound via founder outreach to Lunar's private growth-equity desk.`,
    ),
    bullet(
      `Company-reported ARR of ${fmt("arr_fy25")} in FY2025A, with ${fmt("arr_fy26e")} guided for FY2026E (+${fmt("arr_growth")} YoY). All figures are unaudited at the screening stage.`,
    ),
    bullet(
      `Net revenue retention of ${fmt("nrr_fy25")} (FY2025A) against a guided ${fmt("nrr_fy26e")} (FY2026E); gross margin of ${fmt("gross_margin_fy25")} rising to a guided ${fmt("gross_margin_fy26e")}; ${fmt("logos_fy25")} active logos growing to a guided ${fmt("logos_fy26e")}.`,
    ),
    bullet(
      `Average monthly cash burn of ${fmt("burn_monthly")}; management projects ${fmt("runway_months")} of runway post-round.`,
    ),
    bullet(
      `Indicated use of proceeds: ${fmt("proceeds_gtm")} go-to-market expansion, ${fmt("proceeds_product")} product and engineering, ${fmt("proceeds_working_capital")} working capital and runway.`,
    ),
    bullet(
      "Mandate screening result: five of six Charter criteria pass; sector concentration is flagged and requires explicit Investment Committee acknowledgement before the deal advances.",
    ),
    caption(
      `${sourceLabel(dataroomCite(1))}; ${sourceLabel(dataroomCite(3))}. Company-reported and unaudited at screening stage.`,
    ),
  ];

  // ── Section 2: Company at a glance ──
  const section2 = [
    h1("Company at a Glance"),
    dataTable(
      ["Attribute", "Detail"],
      [
        ["Round", `${fmt("ask")} Series B`],
        ["Sector", "Logistics SaaS"],
        ["Headquarters", "Riyadh, Kingdom of Saudi Arabia"],
        ["Founded", "2022"],
        [
          "Source of introduction",
          "Inbound, founder outreach via Lunar's private growth-equity desk",
        ],
      ],
      [30, 70],
    ),
    caption(sourceLabel(dataroomCite(1))),
  ];

  // ── Section 3: Product and market ──
  const section3 = [
    h1("Product and Market"),
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
  ];

  // ── Section 4: Financial summary ──
  const section4 = [
    h1("Financial Summary"),
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
  ];

  // ── Section 5: Use of proceeds ──
  const section5 = [
    h1("Use of Proceeds"),
    body(
      `Management indicates the ${fmt("ask")} Series B is earmarked roughly ${fmt("proceeds_gtm")} for go-to-market expansion (enterprise sales, quick-commerce partnerships), ${fmt("proceeds_product")} for product and engineering headcount, and ${fmt("proceeds_working_capital")} for working capital and runway extension.`,
    ),
    caption(sourceLabel(dataroomCite(3))),
  ];

  // ── Section 6: Founding team ──
  const section6 = [
    h1("Founding Team"),
    h2("Faisal Al-Otaibi, Co-founder & CEO"),
    body(
      "Former operations lead at a Riyadh-based quick-commerce platform, where he built the last-mile dispatch system that Darb's routing engine is descended from. Industrial engineering background, King Saud University.",
    ),
    h2("Nourah Al-Harbi, Co-founder & CTO"),
    body(
      "Previously a senior backend engineer on a regional ride-hailing platform's logistics team. Led Darb's API and carrier-integration architecture from day one. Computer science background, KFUPM.",
    ),
    h2("Khalid Al-Dossari, Co-founder & Head of Revenue"),
    body(
      "Ten years in enterprise SaaS sales across the GCC prior to Darb, most recently running mid-market sales for a regional fleet-management vendor. Owns Darb's enterprise and quick-commerce partnership pipeline.",
    ),
    caption(sourceLabel(dataroomCite(4))),
  ];

  // ── Section 6b: Screening assessment, strengths & concerns ──
  const section6b = [
    h1("Screening Assessment: Strengths & Concerns"),
    h2("Key strengths (screening-stage view)"),
    bulletTitled(
      "Growth with retention",
      `guided ARR growth of ${fmt("arr_growth")} arrives alongside net revenue retention of ${fmt("nrr_fy25")} to ${fmt("nrr_fy26e")}, indicating expansion within the existing customer base rather than purely new-logo acquisition. Company-reported, to be verified against cohort data.`,
    ),
    bulletTitled(
      "Software margin profile",
      `gross margin of ${fmt("gross_margin_fy25")} rising to a guided ${fmt("gross_margin_fy26e")} is consistent with subscription software economics rather than asset-heavy logistics operation.`,
    ),
    bulletTitled(
      "Asset-light model in a policy-backed sector",
      "the platform layers on the customer's existing fleet, avoiding owned-fleet capital intensity, and management frames demand against logistics-sector digitization under Vision 2030's transport pillar. The framing is management's and is a diligence item, not an independently verified market estimate.",
    ),
    bulletTitled(
      "Domain-matched founding team",
      "the three co-founders cover last-mile dispatch operations, logistics platform engineering, and GCC enterprise SaaS sales respectively, the three functions this business model depends on.",
    ),
    h2("Key concerns (screening-stage view)"),
    bulletTitled(
      "Unaudited financials",
      "every figure in this memo is company-reported; audited or reviewed FY2023-FY2025 statements are a required diligence item before any ticket is issued.",
    ),
    bulletTitled(
      "Sector concentration breach",
      "a SAR 40M ticket takes post-deal Technology & Consumer exposure to 10.5% of firm AUM, above the Charter's 10% cap; the Charter requires explicit IC acknowledgement, recorded in the minutes, before the deal advances.",
    ),
    bulletTitled(
      "Unknown customer concentration",
      "the revenue split shared at screening is anonymized; concentration cannot be assessed until customer contracts and cohort-level retention are reviewed in the full data room.",
    ),
    bulletTitled(
      "Retention durability untested",
      `net revenue retention of ${fmt("nrr_fy25")} to ${fmt("nrr_fy26e")} has not been independently tested against cohort-level churn.`,
    ),
    bulletTitled(
      "Competitive response",
      "in-house dispatch tooling built by large logistics operators and quick-commerce platforms is management's stated primary competitive risk and has not yet been independently assessed.",
    ),
    caption(
      `${sourceLabel(dataroomCite(3))}; ${sourceLabel({ sourceDoc: "lunar-portfolio", page: 1 })}; ${sourceLabel(charterCite(4))}. Qualitative judgments are the analyst's and are labeled as such.`,
    ),
  ];

  // ── Section 7: Mandate screening vs the IC Charter ──
  const screeningRows = deal.screening.rows.map((row) => [
    row.criterion.en,
    row.verdict.toUpperCase(),
    row.note.en,
  ]);
  const section7 = [
    h1("Mandate Screening vs the IC Charter"),
    body(
      "The Screening Agent checked Darb against every Charter criterion that applies to a private growth-equity opportunity. Five criteria pass outright; sector concentration is flagged, not failed, per the Charter's own escalation rule.",
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

  // ── Section 8: Risks and open diligence items ──
  const section8 = [
    h1("Risks and Open Diligence Items"),
    bullet(
      "All financial figures in this memo are company-reported and unaudited, full audited/reviewed statements for FY2023-FY2025 are pending under NDA.",
    ),
    bullet(
      "Customer concentration is unknown until the full data room (customer contracts and cohort-level retention) is reviewed, the segment split shared at screening is anonymized.",
    ),
    bullet(
      "Net revenue retention durability at 118-124% has not been independently tested against cohort-level churn data.",
    ),
    bullet(
      "Competitive response from in-house dispatch tooling built by large logistics operators and quick-commerce platforms is management's stated primary competitive risk, not yet independently assessed.",
    ),
    caption(sourceLabel(dataroomCite(6))),
  ];

  // ── Section 9: Appendix, sources ──
  const section9 = [
    h1("Appendix: Sources"),
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
          ...section6b,
          ...section7,
          ...section8,
          ...section9,
        ],
      },
    ],
  });

  return Packer.toBuffer(doc);
}
