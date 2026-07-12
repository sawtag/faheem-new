import { describe, expect, it } from "vitest";
import { formatDate, formatPercent, formatSAR } from "@/lib/utils";

describe("formatSAR", () => {
  it("renders the house millions style with Western digits in both locales", () => {
    expect(formatSAR(7245.2, "en")).toBe("SAR 7,245.2M");
    expect(formatSAR(7245.2, "ar")).toBe("SAR 7,245.2M");
  });

  it("supports raw (absolute) amounts", () => {
    expect(formatSAR(12500, "en", { unit: "abs" })).toBe("SAR 12,500");
  });
});

describe("formatPercent", () => {
  it("formats to one decimal by default", () => {
    expect(formatPercent(17.2, "en")).toBe("17.2%");
  });

  it("shows an explicit sign for deltas", () => {
    expect(formatPercent(2.2, "en", { signed: true })).toBe("+2.2%");
    expect(formatPercent(-3, "en", { signed: true })).toBe("-3.0%");
  });
});

describe("formatDate", () => {
  it("formats a medium date in English", () => {
    expect(formatDate("2026-07-12T12:00:00Z", "en")).toBe("Jul 12, 2026");
  });

  it("keeps Western digits in Arabic (localized month, Latin numerals)", () => {
    const out = formatDate("2026-07-12T12:00:00Z", "ar");
    expect(out).toContain("2026");
    expect(out).toMatch(/[0-9]/); // Western digits present
    expect(out).not.toMatch(/[٠-٩]/); // no Arabic-Indic digits
  });
});
