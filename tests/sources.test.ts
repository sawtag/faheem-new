import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { SOURCE_GROUPS, SOURCES, sourcesInGroup } from "@/lib/sources";

/** External capabilities that are concepts, not discrete providers, no url. */
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

  it("orders external sources GCC-first, sahmk leads the group", () => {
    expect(sourcesInGroup("external")[0]?.id).toBe("sahmk");
  });

  // Standing user rule: GCC/local sources always sort above international.
  it("pins the Saudi/local block at the top of the external group", () => {
    expect(
      sourcesInGroup("external")
        .slice(0, 9)
        .map((s) => s.id),
    ).toEqual([
      "sahmk",
      "wamid",
      "wathq",
      "argaam-plus",
      "mubasher",
      "sama-open-data",
      "gastat",
      "lean",
      "zawya",
    ]);
  });

  it("opens the broker group with the seven Saudi houses, before the regional block", () => {
    const ids = sourcesInGroup("broker").map((s) => s.id);
    expect(ids.slice(0, 7)).toEqual([
      "snb-capital",
      "alrajhi-capital",
      "jadwa",
      "riyad-capital",
      "aljazira-capital",
      "albilad-capital",
      "gib-capital",
    ]);
    expect(ids.slice(7)).toEqual([
      "efg-hermes",
      "arqaam-capital",
      "sico",
      "kamco-invest",
      "markaz",
    ]);
  });

  it("opens the internal group with the native/local block, before any SaaS", () => {
    expect(
      sourcesInGroup("internal")
        .slice(0, 5)
        .map((s) => s.id),
    ).toEqual([
      "dataroom",
      "templates",
      "mandate",
      "org-analytics",
      "shared-folder",
    ]);
    expect(sourcesInGroup("internal").at(-1)?.id).toBe("granola");
  });

  it("points every image icon at an existing vendored file", () => {
    for (const s of SOURCES) {
      if (s.icon.kind !== "image") continue;
      expect(s.icon.src, s.id).toMatch(/^\/logos\/connectors\//);
      expect(
        existsSync(path.join(process.cwd(), "public", s.icon.src)),
        `${s.id}: ${s.icon.src} missing from public/`,
      ).toBe(true);
    }
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
