/**
 * Acceptance tests for the company-template tag catalog + fill/inspect
 * pipeline (lib/generate/template.ts). Tag values are spot-checked against
 * the frozen model snapshot (tests/fixtures/model-base-snapshot.json,
 * mirrors tests/model/compute.test.ts's literal-number convention) — proves
 * every value traces to `computeModel()`, never a hand-typed number.
 */
import { Document, Packer, Paragraph, TextRun } from "docx";
import PizZip from "pizzip";
import { describe, expect, it } from "vitest";
import {
  buildTemplateTags,
  fillCompanyTemplate,
  inspectTemplateTags,
  TEMPLATE_TAG_KEYS,
  TemplateParseError,
} from "@/lib/generate/template";

describe("buildTemplateTags — spot-checked against the frozen model snapshot", () => {
  const tags = buildTemplateTags();

  it("perShare / currentPrice — SAR, 2 decimals", () => {
    expect(tags.perShare).toBe("SAR 14.36");
    expect(tags.currentPrice).toBe("SAR 12.79");
  });

  it("bull / bear per-share", () => {
    expect(tags.bullPerShare).toBe("SAR 19.24");
    expect(tags.bearPerShare).toBe("SAR 10.03");
  });

  it("wacc — one-decimal percent", () => {
    expect(tags.wacc).toBe("13.3%");
  });

  it("recommendation derives from the weighted return vs. the BUY threshold", () => {
    expect(tags.recommendation).toBe("BUY");
  });

  it("shariahVerdict reflects the pass/fail composite", () => {
    expect(tags.shariahVerdict).toBe("PASS");
  });

  it("scenario probabilities come from BASE_ASSUMPTIONS, one-decimal percent", () => {
    expect(tags.bullProbability).toBe("25.0%");
    expect(tags.baseProbability).toBe("50.0%");
    expect(tags.bearProbability).toBe("25.0%");
  });

  it("riskScore — one decimal", () => {
    expect(tags.riskScore).toBe("5.5");
  });

  it("execSummary / thesisPillar* / keyRisks are non-empty resolved prose", () => {
    expect(tags.execSummary.length).toBeGreaterThan(20);
    expect(tags.thesisPillar1.length).toBeGreaterThan(20);
    expect(tags.thesisPillar2.length).toBeGreaterThan(20);
    expect(tags.thesisPillar3.length).toBeGreaterThan(20);
    expect(tags.keyRisks.length).toBeGreaterThan(20);
    // narrative resolution never leaves an unresolved {placeholder} brace
    expect(tags.execSummary).not.toMatch(/\{[a-zA-Z0-9_.]+\}/);
  });

  it("every catalog key is present with a non-empty string value", () => {
    for (const key of TEMPLATE_TAG_KEYS) {
      expect(typeof tags[key]).toBe("string");
      expect(tags[key].length).toBeGreaterThan(0);
    }
  });
});

/** Builds a minimal tagged .docx in-memory via the `docx` lib (test fixture, not a file on disk). */
async function buildTaggedDocx(paragraphs: string[]): Promise<Buffer> {
  const doc = new Document({
    sections: [
      {
        children: paragraphs.map(
          (text) => new Paragraph({ children: [new TextRun(text)] }),
        ),
      },
    ],
  });
  return Packer.toBuffer(doc);
}

function documentXml(buf: Buffer): string {
  const zip = new PizZip(buf);
  const file = zip.file("word/document.xml");
  if (!file) throw new Error("word/document.xml missing");
  return file.asText();
}

describe("fillCompanyTemplate", () => {
  it("resolves known tags to live values and leaves no known-tag brace behind", async () => {
    const template = await buildTaggedDocx([
      "Target: {{perShare}} vs {{currentPrice}} — {{recommendation}}",
      "WACC {{wacc}}",
    ]);
    const filled = fillCompanyTemplate(template);
    const xml = documentXml(filled);
    const tags = buildTemplateTags();

    expect(xml).toContain(tags.perShare);
    expect(xml).toContain(tags.currentPrice);
    expect(xml).toContain(tags.recommendation);
    expect(xml).toContain(tags.wacc);
    expect(xml).not.toMatch(
      /\{\{(perShare|currentPrice|recommendation|wacc)\}\}/,
    );
  });

  it("an unknown tag stays literal (nullGetter echoes {{tag}} back)", async () => {
    const template = await buildTaggedDocx([
      "Known: {{perShare}} — Unknown: {{totallyMadeUpTag}}",
    ]);
    const filled = fillCompanyTemplate(template);
    const xml = documentXml(filled);
    expect(xml).toContain("totallyMadeUpTag");
  });

  it("throws TemplateParseError on bytes that aren't a zip at all", () => {
    expect(() => fillCompanyTemplate(Buffer.from("not a docx"))).toThrow(
      TemplateParseError,
    );
  });

  it("throws TemplateParseError on a malformed tag (unclosed delimiter)", async () => {
    const template = await buildTaggedDocx(["Broken: {{unclosed"]);
    expect(() => fillCompanyTemplate(template)).toThrow(TemplateParseError);
  });
});

describe("inspectTemplateTags", () => {
  it("splits found (catalog) vs. unknown (not in the catalog) tags", async () => {
    const template = await buildTaggedDocx([
      "{{perShare}} {{currentPrice}} {{notInCatalog}}",
    ]);
    const { found, unknown } = inspectTemplateTags(template);
    expect(found.sort()).toEqual(["currentPrice", "perShare"]);
    expect(unknown).toEqual(["notInCatalog"]);
  });

  it("an all-catalog template reports zero unknown tags", async () => {
    const template = await buildTaggedDocx(["{{recommendation}} {{wacc}}"]);
    const { found, unknown } = inspectTemplateTags(template);
    expect(found.sort()).toEqual(["recommendation", "wacc"]);
    expect(unknown).toEqual([]);
  });

  it("unparseable bytes throw TemplateParseError", () => {
    expect(() => inspectTemplateTags(Buffer.from("garbage"))).toThrow(
      TemplateParseError,
    );
  });
});
