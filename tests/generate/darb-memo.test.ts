/**
 * Acceptance tests for the Darb screening memo (Word deliverable).
 *
 * Mirrors tests/generate/docx.test.ts: read the real .docx XML back with
 * JSZip, check the template section headings, the sources appendix, no
 * unresolved template artifacts, and that LibreOffice can open the file.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import JSZip from "jszip";
import { beforeAll, describe, expect, it } from "vitest";
import { buildDarbMemo, darbSourceCount } from "@/lib/generate/darb-memo";
import manifest from "@/data/corpus/manifest.json";

let documentXml: string;

beforeAll(async () => {
  const buf = await buildDarbMemo();
  const zip = await JSZip.loadAsync(buf);
  const file = zip.file("word/document.xml");
  if (!file)
    throw new Error("word/document.xml missing from the generated docx");
  documentXml = await file.async("text");
});

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
  "Screening Outcome vs the IC Charter",
  "Key Strengths and Concerns",
  "Company and Market Overview",
  "Financial Summary and Use of Proceeds",
  "Appendix: Sources",
];

describe("Darb screening memo structure", () => {
  it("produces a non-trivial word/document.xml", () => {
    expect(documentXml.length).toBeGreaterThan(2000);
  });

  it.each(SECTION_HEADINGS)('contains the "%s" section heading', (heading) => {
    expect(unescapeXml(documentXml)).toContain(heading);
  });

  it("shows the screening outcome to advance to a pitch meeting", () => {
    expect(unescapeXml(documentXml)).toContain(
      "Screening Outcome: Advance to Pitch Meeting",
    );
  });

  it("states that the decision rests with the Investment Committee", () => {
    expect(unescapeXml(documentXml)).toContain(
      "the investment decision rests with the Investment Committee",
    );
  });

  it("flags the concentration warning requiring explicit IC acknowledgement", () => {
    const text = unescapeXml(documentXml);
    expect(text).toContain("10.5%");
    expect(text.toLowerCase()).toContain("ic acknowledgement");
  });
});

describe("financial figures", () => {
  it("shows the sourced FY2025A / FY2026E ARR figures", () => {
    const text = unescapeXml(documentXml);
    expect(text).toContain("SAR 18.2m");
    expect(text).toContain("SAR 29.5m");
  });

  it("shows the use-of-proceeds split", () => {
    const text = unescapeXml(documentXml);
    expect(text).toContain("55%");
    expect(text).toContain("30%");
    expect(text).toContain("15%");
  });
});

describe("appendix: sources", () => {
  it("lists at least 3 distinct corpus documents actually cited", () => {
    const text = unescapeXml(documentXml);
    const citedTitles = manifest.filter((doc) => text.includes(doc.title.en));
    expect(citedTitles.length).toBeGreaterThanOrEqual(3);
  });

  it('includes the "Pages cited" appendix column', () => {
    expect(unescapeXml(documentXml)).toContain("Pages cited");
  });

  it("darbSourceCount() matches the number of distinct cited docs", () => {
    const text = unescapeXml(documentXml);
    const citedTitles = manifest.filter((doc) => text.includes(doc.title.en));
    expect(darbSourceCount()).toBe(citedTitles.length);
  });
});

describe("no unresolved template artifacts", () => {
  it("leaves no stray {placeholder} template brace anywhere in the document", () => {
    const text = unescapeXml(documentXml);
    expect(text.match(/\{[a-zA-Z0-9_.]+\}/g)).toBeNull();
  });
});

describe("LibreOffice can open the memo", () => {
  it("soffice --convert-to pdf exits 0", async () => {
    const soffice = ["/usr/bin/soffice", "soffice", "libreoffice"].find(
      (p) => p === "soffice" || p === "libreoffice" || existsSync(p),
    );
    const dir = mkdtempSync(path.join(tmpdir(), "darb-docx-"));
    const docxPath = path.join(dir, "memo.docx");
    writeFileSync(docxPath, await buildDarbMemo());
    const profileDir = mkdtempSync(path.join(tmpdir(), "darb-docx-lo-"));
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
