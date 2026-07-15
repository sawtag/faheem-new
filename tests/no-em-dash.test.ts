/**
 * AGENTS.md rule 11: the em-dash character (U+2014) is banned from all authored
 * copy. This guard scans messages/ (all UI strings) and data/ (all authored
 * data, prompts, recorded goldens, seed chats).
 *
 * One documented exemption: citation `quote` fields inside recorded events
 * (data/demo-cache, data/seed-chats.json). Those quote the SOURCE PDFs
 * verbatim, and the PdfPanel highlighter matches them byte-exact against the
 * PDF text layer, so an em-dash that exists in a filing must stay. They are
 * source-document text, not our copy.
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const EM = "—";

function listFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) out.push(...listFiles(p));
    else out.push(p);
  }
  return out;
}

/** Every string in a parsed JSON tree except citation `quote` fields. */
function collectStrings(node: unknown, key?: string): string[] {
  if (typeof node === "string") return key === "quote" ? [] : [node];
  if (Array.isArray(node)) return node.flatMap((x) => collectStrings(x));
  if (node && typeof node === "object") {
    return Object.entries(node).flatMap(([k, v]) => collectStrings(v, k));
  }
  return [];
}

describe("no em-dash (U+2014) in authored copy", () => {
  it("messages/ carries none", () => {
    for (const file of listFiles(path.join(ROOT, "messages"))) {
      const raw = fs.readFileSync(file, "utf8");
      expect(raw.includes(EM), path.relative(ROOT, file)).toBe(false);
    }
  });

  it("data/ carries none outside verbatim PDF citation quotes", () => {
    const files = listFiles(path.join(ROOT, "data")).filter((f) =>
      f.endsWith(".json"),
    );
    expect(files.length).toBeGreaterThan(10); // the scan actually sees the pack
    for (const file of files) {
      const rel = path.relative(ROOT, file);
      const parsed = JSON.parse(fs.readFileSync(file, "utf8")) as unknown;
      for (const s of collectStrings(parsed)) {
        expect(s.includes(EM), `${rel}: ${s.slice(0, 60)}`).toBe(false);
      }
    }
  });
});
