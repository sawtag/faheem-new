import { describe, expect, it } from "vitest";
import { buildDocBlocks, filterDocs } from "@/lib/ai/corpus";
import type { CorpusDoc } from "@/lib/types";

describe("filterDocs, context scoping (real manifest)", () => {
  it("workspace: company docs + Lunar docs + firm packs, in manifest order", () => {
    const ids = filterDocs({ kind: "workspace", companyId: "jahez" }).map(
      (d) => d.id,
    );
    expect(ids).toContain("fy25-er"); // jahez filing
    expect(ids).toContain("leadership-pack"); // jahez workspace doc
    expect(ids).toContain("lunar-ic-charter"); // lunar
    expect(ids).toContain("lunar-portfolio");
    expect(ids).toContain("industry-news-pack"); // packs
    expect(ids).toContain("market-data-comps");
    // not another deal's workspace docs
    expect(ids).not.toContain("darb-dataroom");
    expect(ids).not.toContain("thara-analysis");
    // manifest order is preserved
    expect(ids.indexOf("fy24-ar")).toBeLessThan(
      ids.indexOf("industry-news-pack"),
    );
    expect(ids.indexOf("industry-news-pack")).toBeLessThan(
      ids.indexOf("lunar-ic-charter"),
    );
  });

  it("firm: exactly the Lunar docs + packs, manifest order", () => {
    const ids = filterDocs({ kind: "firm" }).map((d) => d.id);
    expect(ids).toEqual([
      "industry-news-pack",
      "market-data-comps",
      "lunar-ic-charter",
      "lunar-risk-appetite",
      "lunar-portfolio",
      "lunar-public-book",
      "gastat-macro-pack",
    ]);
  });

  it("ic: thara + charter + portfolio + packs + analysis/ic-review workspace docs", () => {
    const ids = filterDocs({ kind: "ic" }).map((d) => d.id);
    expect(ids).toContain("thara-analysis"); // ic-review deal (Thara Pay)
    expect(ids).toContain("lunar-ic-charter");
    expect(ids).toContain("lunar-portfolio");
    expect(ids).toContain("industry-news-pack");
    expect(ids).toContain("market-data-comps");
    // Jahez is stage "analysis", its filings must be live-rankable in the IC room
    expect(ids).toContain("fy25-er");
    expect(ids).toContain("fy24-ar");
    expect(ids).toContain("q1-26-fs");
    // screening-stage deals and other Lunar docs stay out
    expect(ids).not.toContain("darb-dataroom");
    expect(ids).not.toContain("lunar-risk-appetite");
  });
});

describe("filterDocs, #-refs narrowing", () => {
  it("restricts to exactly the listed docs", () => {
    const ids = filterDocs({ kind: "workspace", companyId: "jahez" }, [
      "fy25-er",
    ]).map((d) => d.id);
    expect(ids).toEqual(["fy25-er"]);
  });

  it("always keeps the IC charter for the screening flavor", () => {
    const ids = filterDocs(
      { kind: "workspace", companyId: "darb" },
      ["darb-dataroom"],
      "screening",
    ).map((d) => d.id);
    expect(ids).toContain("darb-dataroom");
    expect(ids).toContain("lunar-ic-charter");
  });

  it("does not force the charter for the plain analyst flavor", () => {
    const ids = filterDocs({ kind: "workspace", companyId: "jahez" }, [
      "fy25-er",
    ]).map((d) => d.id);
    expect(ids).not.toContain("lunar-ic-charter");
  });
});

describe("buildDocBlocks, fileId vs base64 shapes", () => {
  const fakeDocs: CorpusDoc[] = [
    {
      id: "a",
      title: { en: "A", ar: "أ" },
      path: "data/corpus/a.pdf",
      pages: 2,
      sizeMB: 0.1,
      type: "public",
    },
    {
      id: "b",
      title: { en: "B", ar: "ب" },
      path: "data/corpus/b.pdf",
      pages: 2,
      sizeMB: 0.1,
      type: "public",
      fileId: "file_xyz",
    },
  ];

  it("base64 when no fileId, file reference when present; cache_control on last only", () => {
    const stub = () => Buffer.from("%PDF-1.4 fake");
    const blocks = buildDocBlocks(fakeDocs, "en", stub);
    expect(blocks).toHaveLength(2);

    expect(blocks[0]!.source).toEqual({
      type: "base64",
      media_type: "application/pdf",
      data: Buffer.from("%PDF-1.4 fake").toString("base64"),
    });
    expect(blocks[0]!.citations).toEqual({ enabled: true });
    expect(blocks[0]!.cache_control).toBeUndefined();

    expect(blocks[1]!.source).toEqual({ type: "file", file_id: "file_xyz" });
    expect(blocks[1]!.cache_control).toEqual({ type: "ephemeral", ttl: "1h" });
  });

  it("localizes the block title by lang", () => {
    const stub = () => Buffer.from("x");
    expect(buildDocBlocks(fakeDocs, "en", stub)[0]!.title).toBe("A");
    expect(buildDocBlocks(fakeDocs, "ar", stub)[0]!.title).toBe("أ");
  });
});
