#!/usr/bin/env -S npx tsx
/**
 * Builds `public/templates/sample-ic-template.docx` — a modest, neutral IC
 * memo skeleton (title + a handful of headed sections) whose body text is
 * literal `{{tag}}` placeholders from `lib/generate/template.ts`'s catalog.
 * No hand-typed numbers anywhere — only tag placeholders and section
 * headings — so it doubles as a worked example of the company-template
 * feature: upload it as-is on Library and the IC memo generator fills every
 * tag with live Jahez model values.
 *
 * Run: npm run build:sample-template (idempotent — overwrites the file).
 */
import fs from "node:fs";
import path from "node:path";
import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from "docx";

const OUT_PATH = path.join(
  process.cwd(),
  "public/templates/sample-ic-template.docx",
);

const tag = (key: string): string => `{{${key}}}`;

function heading(text: string): Paragraph {
  return new Paragraph({ heading: HeadingLevel.HEADING_1, text });
}

function body(text: string): Paragraph {
  return new Paragraph({
    spacing: { after: 200 },
    children: [new TextRun(text)],
  });
}

const doc = new Document({
  sections: [
    {
      children: [
        new Paragraph({
          heading: HeadingLevel.TITLE,
          alignment: AlignmentType.CENTER,
          text: "Investment Committee Memorandum",
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
          children: [
            new TextRun(
              `${tag("companyName")} — prepared for ${tag("firmName")} — ${tag("date")}`,
            ),
          ],
        }),

        heading("Recommendation"),
        body(
          `Recommendation: ${tag("recommendation")} — target price ${tag("perShare")} versus a ${tag("currentPrice")} current price (${tag("upside")} implied upside). Base-case IRR ${tag("irr")}; weighted return ${tag("weightedReturn")} against a ${tag("hurdle")} hurdle.`,
        ),

        heading("Executive Summary"),
        body(tag("execSummary")),

        heading("Investment Thesis"),
        body(tag("thesisPillar1")),
        body(tag("thesisPillar2")),
        body(tag("thesisPillar3")),

        heading("Scenario Analysis"),
        body(
          `Bull case: ${tag("bullPerShare")} per share (${tag("bullProbability")} probability, ${tag("bullIrr")} IRR). Bear case: ${tag("bearPerShare")} per share (${tag("bearProbability")} probability, ${tag("bearIrr")} IRR).`,
        ),

        heading("Valuation & Cost of Capital"),
        body(
          `WACC ${tag("wacc")}, cost of equity ${tag("costOfEquity")}, terminal growth ${tag("terminalGrowth")}. Comparable-set median ${tag("compsMedian")} per share.`,
        ),

        heading("Shariah & Risk Screen"),
        body(
          `Shariah screen: ${tag("shariahVerdict")}. Debt ratio ${tag("debtRatio")}, cash ratio ${tag("cashRatio")}. Composite risk score ${tag("riskScore")}.`,
        ),

        heading("Key Risks"),
        body(tag("keyRisks")),
      ],
    },
  ],
});

async function main() {
  const buf = await Packer.toBuffer(doc);
  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, buf);
  console.log(`Wrote ${OUT_PATH} (${buf.length} bytes)`);
}

void main();
