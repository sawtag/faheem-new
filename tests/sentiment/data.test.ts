import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  SENTIMENT,
  SOCIAL_PACK,
  postsForEntry,
  sentimentByCompany,
} from "@/lib/sentiment";

/**
 * WS-D acceptance (live-model-provenance plan §0): sentiment/social-pack data
 * NEVER carries a sourced-number shape ({value, sourceDoc, page} — the
 * ModelInput/Cite shape used everywhere else in the corpus). This walks the
 * RAW JSON on disk (not the zod-parsed objects) so the guarantee holds even
 * if a schema is loosened later — the same defensive check scripts/
 * validate-data.ts runs at build time.
 */
function walk(node: unknown, hits: string[], keyPath: string) {
  if (Array.isArray(node)) {
    node.forEach((item, i) => walk(item, hits, `${keyPath}[${i}]`));
    return;
  }
  if (node && typeof node === "object") {
    for (const forbidden of ["sourceDoc", "page", "value"]) {
      if (Object.prototype.hasOwnProperty.call(node, forbidden)) {
        // "value" alone isn't forbidden everywhere, but paired with
        // sourceDoc/page it's the sourced-number shape — flag sourceDoc/page
        // unconditionally (the hard rule), and only flag "value" if it also
        // has a sourceDoc or page sibling.
        if (forbidden !== "value") {
          hits.push(`${keyPath}.${forbidden}`);
        }
      }
    }
    const keys = Object.keys(node as Record<string, unknown>);
    if (
      keys.includes("value") &&
      (keys.includes("sourceDoc") || keys.includes("page"))
    ) {
      hits.push(`${keyPath}.value (sourced-number shape)`);
    }
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      walk(v, hits, `${keyPath}.${k}`);
    }
  }
}

function rawJson(relativePath: string): unknown {
  const abs = path.join(process.cwd(), relativePath);
  return JSON.parse(fs.readFileSync(abs, "utf-8"));
}

describe("sentiment/social-pack data — no sourced-number shape", () => {
  it("data/sentiment.json has no sourceDoc/page keys anywhere", () => {
    const hits: string[] = [];
    walk(rawJson("data/sentiment.json"), hits, "sentiment");
    expect(hits).toEqual([]);
  });

  it("data/social-pack.json has no sourceDoc/page keys anywhere", () => {
    const hits: string[] = [];
    walk(rawJson("data/social-pack.json"), hits, "social-pack");
    expect(hits).toEqual([]);
  });

  it("every sentiment entry carries the literal signalOnly marker", () => {
    for (const entry of SENTIMENT) {
      expect(entry.signalOnly).toBe(true);
    }
  });

  it("every sentiment entry's postIds resolve to real social-pack posts", () => {
    for (const entry of SENTIMENT) {
      const posts = postsForEntry(entry);
      expect(posts).toHaveLength(entry.postIds.length);
    }
  });

  it("social-pack posts use generic synthetic handles, not real people", () => {
    for (const post of SOCIAL_PACK) {
      expect(post.handle.length).toBeGreaterThan(0);
    }
    expect(SOCIAL_PACK.length).toBeGreaterThanOrEqual(6);
    expect(SOCIAL_PACK.length).toBeLessThanOrEqual(10);
  });

  it("describes delivery-fee competition with generic entrant wording", () => {
    expect(SOCIAL_PACK[0]!.text.en).toContain("new entrants");
    expect(SOCIAL_PACK[0]!.text.ar).toContain("اللاعبين الجدد");
  });

  it("jahez has a recorded sentiment read with a defensible label", () => {
    const jahez = sentimentByCompany("jahez");
    expect(jahez).toBeDefined();
    expect(["constructive", "cautious", "negative-drift"]).toContain(
      jahez!.label,
    );
    expect(jahez!.rationale.en.length).toBeGreaterThan(0);
    expect(jahez!.rationale.ar.length).toBeGreaterThan(0);
  });
});
