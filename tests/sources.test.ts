import { describe, expect, it } from "vitest";
import { SOURCE_GROUPS, SOURCES, sourcesInGroup } from "@/lib/sources";

/** External capabilities that are concepts, not discrete providers — no url. */
const EXTERNAL_WITHOUT_URL = new Set([
  "earnings",
  "investor-presentations",
  "web",
  "international-filings",
]);

describe("SOURCES taxonomy", () => {
  it("has unique ids across all groups", () => {
    const ids = SOURCES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("gives every entry a non-empty en + ar name and description", () => {
    for (const s of SOURCES) {
      expect(s.name.en.length, s.id).toBeGreaterThan(0);
      expect(s.name.ar.length, s.id).toBeGreaterThan(0);
      expect(s.description.en.length, s.id).toBeGreaterThan(0);
      expect(s.description.ar.length, s.id).toBeGreaterThan(0);
    }
  });

  it("has a non-empty entry in every group", () => {
    for (const g of SOURCE_GROUPS) {
      expect(sourcesInGroup(g).length, g).toBeGreaterThan(0);
    }
  });

  it("orders external sources GCC-first — sahmk leads the group", () => {
    expect(sourcesInGroup("external")[0]?.id).toBe("sahmk");
  });

  it("carries a url on every broker entry and every external provider", () => {
    for (const s of sourcesInGroup("broker")) {
      expect(s.url, `${s.id} should have a url`).toBeTruthy();
    }
    for (const s of sourcesInGroup("external")) {
      if (EXTERNAL_WITHOUT_URL.has(s.id)) {
        expect(s.url, `${s.id} should have no url`).toBeUndefined();
      } else {
        expect(s.url, `${s.id} should have a url`).toBeTruthy();
      }
    }
  });

  it("uses a parseable https url wherever a url is present", () => {
    for (const s of SOURCES) {
      if (!s.url) continue;
      expect(() => new URL(s.url!), s.id).not.toThrow();
      expect(new URL(s.url!).protocol, s.id).toBe("https:");
    }
  });
});
