import { describe, expect, it } from "vitest";
import { matchQuote } from "@/lib/highlight";

describe("matchQuote — citation quote → text-layer ranges", () => {
  it("finds an exact match inside a single item", () => {
    const items = [
      "Header",
      "Commission revenue grew 16.3% this year.",
      "Footer",
    ];
    expect(matchQuote("grew 16.3%", items)).toEqual([
      { itemIndex: 1, start: 19, end: 29 },
    ]);
  });

  it("matches across whitespace raggedness (linebreaks, double spaces, soft hyphens)", () => {
    // recorded quotes carry artifacts like "grew 16.3% to  1,113.8 \nmillion"
    const items = ["Commission revenue grew 16.3% to 1,113.8 million SAR."];
    const spans = matchQuote("grew 16.3% to  1,113.8 \nmillion", items);
    expect(spans).toEqual([{ itemIndex: 0, start: 19, end: 48 }]);
    // soft hyphen + curly quotes + en-dash on the page side
    const ragged = ["net income “com­pressed” –61.2% YoY"];
    expect(matchQuote('income "compressed" -61.2%', ragged)).toEqual([
      { itemIndex: 0, start: 4, end: 31 },
    ]);
  });

  it("maps one quote onto multiple items (multi-span)", () => {
    const items = ["Revenue grew 16.3% to ", "1,113.8 ", "million in FY2025"];
    expect(matchQuote("grew 16.3% to 1,113.8 million", items)).toEqual([
      { itemIndex: 0, start: 8, end: 21 },
      { itemIndex: 1, start: 0, end: 7 },
      { itemIndex: 2, start: 0, end: 7 },
    ]);
  });

  it("falls back to a long prefix when the quote's tail is not on the page", () => {
    const items = [
      "Adjusted EBITDA margin expanded 240bps to 11.2% in FY2025 driven by pricing.",
    ];
    const spans = matchQuote(
      "Adjusted EBITDA margin expanded 240bps to 11.2% — commentary added by the analyst afterwards",
      items,
    );
    // highlights the prefix that IS on the page (≥40 chars), nothing else
    expect(spans).toEqual([{ itemIndex: 0, start: 0, end: 47 }]);
  });

  it("falls back to the longest whole-token fragment for composed quotes", () => {
    // table extraction: label and value live in different cells
    const items = ["Metric", "Average Order Value", "64.9", "+5.2%", "GMV"];
    const spans = matchQuote("Average Order Value 64.9 (+5.2% YoY)", items);
    // label + adjacent value both covered — a multi-span fragment
    expect(spans).toEqual([
      { itemIndex: 1, start: 0, end: 19 },
      { itemIndex: 2, start: 0, end: 4 },
    ]);
  });

  it("trims punctuation-only edge tokens from a fragment", () => {
    const items = ["Ratio: Commission Revenue / Gross Merchandise Value"];
    const spans = matchQuote(
      "Take Rate = Commission Revenue / GMV (definition)",
      items,
    );
    // the run extends through "/" but the dangling slash is trimmed —
    // the highlighted run is exactly "Commission Revenue"
    expect(spans).toEqual([{ itemIndex: 0, start: 7, end: 25 }]);
  });

  it("returns null when nothing clears the thresholds (silent page-only fallback)", () => {
    const items = ["Totally unrelated page about logistics coverage."];
    expect(matchQuote("Net profit compressed 61.2% YoY", items)).toBeNull();
    // short/generic overlap below fragment threshold must NOT match
    expect(matchQuote("the company grew", ["the company reported"])).toBeNull();
  });

  it("handles empty inputs without matching", () => {
    expect(matchQuote("", ["some text"])).toBeNull();
    expect(matchQuote("some text", [])).toBeNull();
    expect(matchQuote("   \n ", ["some text"])).toBeNull();
  });
});
