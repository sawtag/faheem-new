/**
 * Recorded-goldens guard: every palette entry (lib/demo/golden-questions.ts,
 * minus "deliverables", the artifact-generation beat) must resolve to a
 * healthy recording in data/demo-cache, and the cache dir must carry nothing
 * else. "Healthy" is the on-stage contract:
 *   - the file at cacheKey(request) parses against CacheEntrySchema
 *   - entry.key and entry.request match the palette exactly (a drifted
 *     recording replays a stale answer for a different question)
 *   - the stream ends with `done` and contains no `error` event
 *   - citation events and [[n]] text markers pair one-to-one, no duplicates
 *   - every citation resolves to a corpus-manifest doc at a real page with a
 *     non-empty quote (rule 5: every figure resolves to a clickable source)
 *   - an answer that shows digits carries at least one citation
 * Remedy for any failure: npx tsx scripts/record-goldens.ts --only <id>
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { cacheKey, readCacheEntry } from "@/lib/ai/cache";
import { GOLDEN_QUESTIONS } from "@/lib/demo/golden-questions";
import { CorpusDocSchema, type CacheEntry } from "@/lib/types";
import manifestData from "@/data/corpus/manifest.json";

const CACHE_DIR = path.join(process.cwd(), "data/demo-cache");
const docsById = new Map(
  CorpusDocSchema.array()
    .parse(manifestData)
    .map((doc) => [doc.id, doc]),
);

const recorded = GOLDEN_QUESTIONS.filter((q) => q.id !== "deliverables");

function loadEntry(id: string): CacheEntry {
  const q = recorded.find((entry) => entry.id === id)!;
  const entry = readCacheEntry(cacheKey(q.request));
  expect(
    entry,
    `${id}: missing/invalid recording, re-record with scripts/record-goldens.ts --only ${id}`,
  ).not.toBeNull();
  return entry!;
}

describe("data/demo-cache, recorded golden answers", () => {
  it.each(recorded.map((q) => [q.id] as const))(
    "%s replays healthily from cache",
    (id) => {
      const q = recorded.find((entry) => entry.id === id)!;
      const key = cacheKey(q.request);
      const entry = loadEntry(id);

      expect(entry.key).toBe(key);
      expect(entry.request).toEqual(q.request);

      const last = entry.events[entry.events.length - 1];
      expect(last?.type, `${id}: stream must terminate with done`).toBe("done");
      expect(
        entry.events.some((e) => e.type === "error"),
        `${id}: recording contains an error event`,
      ).toBe(false);

      const text = entry.events
        .filter((e) => e.type === "delta")
        .map((e) => e.text)
        .join("");
      const citations = entry.events.filter((e) => e.type === "citation");

      const markerNs = [...text.matchAll(/\[\[(\d+)\]\]/g)].map((m) =>
        Number(m[1]),
      );
      const citationNs = citations.map((c) => c.n);
      expect([...markerNs].sort((a, b) => a - b)).toEqual(
        [...citationNs].sort((a, b) => a - b),
      );
      expect(new Set(citationNs).size, `${id}: duplicate citation n`).toBe(
        citationNs.length,
      );

      for (const cite of citations) {
        const doc = docsById.get(cite.docId);
        expect(
          doc,
          `${id}: [[${cite.n}]] cites unknown doc "${cite.docId}"`,
        ).toBeDefined();
        expect(
          cite.page,
          `${id}: [[${cite.n}]] cites past the end of "${cite.docId}"`,
        ).toBeLessThanOrEqual(doc!.pages);
        expect(cite.quote.trim(), `${id}: [[${cite.n}]] empty quote`).not.toBe(
          "",
        );
      }

      const prose = text.replace(/\[\[\d+\]\]/g, "");
      if (/\d/.test(prose)) {
        expect(
          citations.length,
          `${id}: answer shows figures but carries no citation`,
        ).toBeGreaterThan(0);
      }
    },
  );

  it("carries no orphan recordings (every file maps to a palette entry)", () => {
    const expected = new Set(
      recorded.map((q) => `${cacheKey(q.request)}.json`),
    );
    const onDisk = fs
      .readdirSync(CACHE_DIR)
      .filter((file) => file.endsWith(".json"));
    const orphans = onDisk.filter((file) => !expected.has(file));
    expect(
      orphans,
      "stale recordings, delete or re-point a palette entry",
    ).toEqual([]);
    expect(onDisk).toHaveLength(recorded.length);
  });
});
