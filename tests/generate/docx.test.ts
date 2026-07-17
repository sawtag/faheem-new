/**
 * Acceptance tests for the Jahez IC memo (Word deliverable).
 *
 * The memo is written to a Buffer and read back with JSZip against the real
 * .docx XML a judge would open. Key checks:
 *   - all 9 house-template section headings are present in document.xml;
 *   - the register is neutral (no BUY/HOLD/REDUCE rating advocacy; the
 *     decision is framed as the Investment Committee's);
 *   - the sources appendix lists >=6 distinct corpus documents;
 *   - no `{placeholder}` template brace survives narrative resolution;
 *   - LibreOffice opens the file (soffice --convert-to pdf exits 0).
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import JSZip from "jszip";
import { beforeAll, describe, expect, it } from "vitest";
import { buildIcMemo } from "@/lib/generate/docx";
import manifest from "@/data/corpus/manifest.json";

let documentXml: string;

beforeAll(async () => {
  const buf = await buildIcMemo();
  const zip = await JSZip.loadAsync(buf);
  const file = zip.file("word/document.xml");
  if (!file)
    throw new Error("word/document.xml missing from the generated docx");
  documentXml = await file.async("text");
});

/** Undo docx.js's XML entity escaping so heading text can be matched literally. */
function unescapeXml(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

const SECTION_HEADINGS = [
  "Executive Summary",
  "Return Analysis",
  "Key Strengths and Concerns",
  "Quantified Risk Assessment",
  "Company and Market Overview",
  "Historical and Projected Financials",
  "Compliance Screen",
  "Catalysts and Monitoring KPIs",
  "Appendix: Sources",
];

describe("IC memo structure", () => {
  it("produces a non-trivial word/document.xml", () => {
    expect(documentXml.length).toBeGreaterThan(2000);
  });

  it.each(SECTION_HEADINGS)('contains the "%s" section heading', (heading) => {
    expect(unescapeXml(documentXml)).toContain(heading);
  });

  it("keeps a neutral register: no analyst rating advocacy anywhere", () => {
    const text = unescapeXml(documentXml);
    expect(/\b(BUY|HOLD|REDUCE)\b/.test(text)).toBe(false);
  });

  it("frames the decision as the Investment Committee's on the cover", () => {
    const text = unescapeXml(documentXml);
    expect(text).toContain("For Investment Committee Decision");
    expect(text).toContain(
      "the investment decision rests with the Investment Committee",
    );
  });
});

describe("appendix: sources", () => {
  it("lists at least 6 distinct corpus documents actually cited", () => {
    const text = unescapeXml(documentXml);
    const citedTitles = manifest.filter((doc) => text.includes(doc.title.en));
    expect(citedTitles.length).toBeGreaterThanOrEqual(6);
  });

  it('includes the "Pages cited" appendix column', () => {
    expect(unescapeXml(documentXml)).toContain("Pages cited");
  });
});

describe("narrative resolution", () => {
  it("leaves no unresolved {placeholder} template brace anywhere in the document", () => {
    const text = unescapeXml(documentXml);
    expect(text.match(/\{[a-zA-Z0-9_.]+\}/g)).toBeNull();
  });
});

describe("LibreOffice can open the memo", () => {
  it("soffice --convert-to pdf exits 0", async () => {
    const soffice = ["/usr/bin/soffice", "soffice", "libreoffice"].find(
      (p) => p === "soffice" || p === "libreoffice" || existsSync(p),
    );
    const dir = mkdtempSync(path.join(tmpdir(), "jahez-docx-"));
    const docxPath = path.join(dir, "memo.docx");
    writeFileSync(docxPath, await buildIcMemo());
    // isolated profile dir: parallel vitest files each spawning soffice would
    // otherwise collide on the shared default LibreOffice user-profile lock.
    const profileDir = mkdtempSync(path.join(tmpdir(), "jahez-docx-lo-"));
    execFileSync(
      soffice ?? "soffice",
      [
        `-env:UserInstallation=file://${profileDir}`,
        "--headless",
        "--convert-to",
        "pdf",
        "--outdir",
        dir,
        docxPath,
      ],
      { stdio: "ignore", timeout: 120000 },
    );
    expect(existsSync(path.join(dir, "memo.pdf"))).toBe(true);
  }, 130000);
});
