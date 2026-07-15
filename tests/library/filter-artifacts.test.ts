import { describe, expect, it } from "vitest";
import { filterArtifacts } from "@/app/(app)/library/filter-artifacts";
import type { ArtifactMeta } from "@/lib/types";

const artifacts: ArtifactMeta[] = [
  {
    id: "a1",
    kind: "docx",
    name: {
      en: "Jahez, IC Investment Memo",
      ar: "جاهز · مذكرة لجنة الاستثمار",
    },
    workspace: "jahez",
    file: "/artifacts/jahez-ic-memo.docx",
    createdAt: "2026-07-09T09:11:00Z",
    sources: 13,
  },
  {
    id: "a2",
    kind: "xlsx",
    name: { en: "Jahez · Valuation Model", ar: "جاهز · نموذج التقييم" },
    workspace: "jahez",
    file: "/artifacts/jahez-valuation-model.xlsx",
    createdAt: "2026-07-07T10:15:00Z",
    sources: 12,
  },
  {
    id: "a3",
    kind: "pptx",
    name: { en: "Thara Pay، Board Deck", ar: "ثارا باي، عرض المجلس" },
    workspace: "thara-pay",
    file: "/artifacts/thara-pay-board-deck.pptx",
    createdAt: "2026-07-11T09:22:00Z",
    sources: 14,
  },
];

describe("filterArtifacts", () => {
  it("returns everything for the 'all' filter with no query", () => {
    expect(filterArtifacts(artifacts, "all", "", "en")).toHaveLength(3);
  });

  it("filters by artifact kind", () => {
    const result = filterArtifacts(artifacts, "xlsx", "", "en");
    expect(result.map((a) => a.id)).toEqual(["a2"]);
  });

  it("searches the localized name, case-insensitively", () => {
    const result = filterArtifacts(artifacts, "all", "board deck", "en");
    expect(result.map((a) => a.id)).toEqual(["a3"]);
  });

  it("searches the Arabic name when locale is ar", () => {
    const result = filterArtifacts(artifacts, "all", "التقييم", "ar");
    expect(result.map((a) => a.id)).toEqual(["a2"]);
  });

  it("combines kind filter and search query", () => {
    const result = filterArtifacts(artifacts, "docx", "jahez", "en");
    expect(result.map((a) => a.id)).toEqual(["a1"]);
  });

  it("returns nothing when the query matches no name", () => {
    expect(filterArtifacts(artifacts, "all", "darb", "en")).toEqual([]);
  });
});
