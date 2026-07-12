/**
 * Acceptance tests for the Jahez board deck (PowerPoint deliverable).
 *
 * The deck is written to a Buffer and read back with JSZip against the real
 * .pptx package a judge would open. Key checks:
 *   - slide count is 8 (±1 of the §11 8-slide spec);
 *   - every slide's relationship file resolves to a part that actually exists
 *     in the package (no broken rels);
 *   - the Lunar footer text is present in the package;
 *   - no `{placeholder}` template brace survives narrative resolution;
 *   - LibreOffice opens the file (soffice --convert-to pdf exits 0).
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import JSZip from "jszip";
import { beforeAll, describe, expect, it } from "vitest";
import { buildBoardDeck } from "@/lib/generate/pptx";

let zip: JSZip;
let slideFiles: string[];
let allXmlText: string;

beforeAll(async () => {
  const buf = await buildBoardDeck();
  zip = await JSZip.loadAsync(buf);
  slideFiles = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort();

  const xmlNames = Object.keys(zip.files).filter((n) => n.endsWith(".xml"));
  const texts = await Promise.all(
    xmlNames.map((n) => zip.file(n)!.async("text")),
  );
  allXmlText = texts.join("\n");
});

function unescapeXml(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

describe("board deck structure", () => {
  it("has 8 slides (§11 spec: ~8 slides)", () => {
    expect(slideFiles.length).toBeGreaterThanOrEqual(7);
    expect(slideFiles.length).toBeLessThanOrEqual(9);
    expect(slideFiles.length).toBe(8);
  });

  it("every slide relationship resolves to a part that exists in the package", async () => {
    for (const slidePath of slideFiles) {
      const slideName = slidePath.split("/").pop()!;
      const relsPath = `ppt/slides/_rels/${slideName}.rels`;
      const relsFile = zip.file(relsPath);
      if (!relsFile) continue; // a slide with no rels is not broken, just relless
      const relsXml = await relsFile.async("text");
      const targets = [...relsXml.matchAll(/Target="([^"]+)"/g)].map(
        (m) => m[1]!,
      );
      for (const target of targets) {
        if (/^https?:\/\//.test(target)) continue; // external URL, not a package part
        const resolved = path
          .normalize(path.join("ppt/slides", target))
          .replace(/\\/g, "/");
        expect(zip.file(resolved), `${slidePath} -> ${target}`).not.toBeNull();
      }
    }
  });
});

describe("Lunar branding", () => {
  it("the footer/disclaimer text is present in the package", () => {
    expect(allXmlText).toContain("Prepared by Faheem for Lunar Investments");
    expect(unescapeXml(allXmlText)).toContain("Advisory only");
  });
});

describe("narrative resolution", () => {
  it("leaves no unresolved {placeholder} template brace anywhere in the package", () => {
    const text = unescapeXml(allXmlText);
    expect(text.match(/\{[a-zA-Z0-9_.]+\}/g)).toBeNull();
  });
});

describe("LibreOffice can open the deck", () => {
  it("soffice --convert-to pdf exits 0", async () => {
    const soffice = ["/usr/bin/soffice", "soffice", "libreoffice"].find(
      (p) => p === "soffice" || p === "libreoffice" || existsSync(p),
    );
    const dir = mkdtempSync(path.join(tmpdir(), "jahez-pptx-"));
    const pptxPath = path.join(dir, "deck.pptx");
    writeFileSync(pptxPath, await buildBoardDeck());
    // isolated profile dir: parallel vitest files each spawning soffice would
    // otherwise collide on the shared default LibreOffice user-profile lock.
    const profileDir = mkdtempSync(path.join(tmpdir(), "jahez-pptx-lo-"));
    execFileSync(
      soffice ?? "soffice",
      [
        `-env:UserInstallation=file://${profileDir}`,
        "--headless",
        "--convert-to",
        "pdf",
        "--outdir",
        dir,
        pptxPath,
      ],
      { stdio: "ignore", timeout: 120000 },
    );
    expect(existsSync(path.join(dir, "deck.pdf"))).toBe(true);
  }, 130000);
});
