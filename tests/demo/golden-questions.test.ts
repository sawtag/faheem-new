import { describe, expect, it } from "vitest";
import { ChatRequestSchema } from "@/lib/types";
import {
  GOLDEN_QUESTIONS,
  filterGoldenQuestions,
  goldenQuestionById,
  groupGoldenQuestions,
} from "@/lib/demo/golden-questions";

describe("GOLDEN_QUESTIONS, data/golden-questions.json", () => {
  it("has 11 entries with unique ids", () => {
    expect(GOLDEN_QUESTIONS).toHaveLength(11);
    const ids = GOLDEN_QUESTIONS.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every entry's request is a valid ChatRequest (zod)", () => {
    for (const entry of GOLDEN_QUESTIONS) {
      const parsed = ChatRequestSchema.safeParse(entry.request);
      expect(
        parsed.success,
        `${entry.id}: ${JSON.stringify(parsed.success ? null : parsed.error.issues)}`,
      ).toBe(true);
    }
  });

  it("the ic-rank entry matches the IC room's first suggested pill verbatim (messages/en.json ic.chat.suggest1)", () => {
    const entry = goldenQuestionById("ic-rank");
    expect(entry?.request.question).toBe(
      "Rank these deals: strongest risk-adjusted case?",
    );
  });

  it("the deliverables entry has no agent/docIds (deliverables-beat detector matches on text alone)", () => {
    const entry = goldenQuestionById("deliverables");
    expect(entry?.request.question).toBe(
      "Prepare the IC memo, DCF model, and committee deck.",
    );
    expect(entry?.request.agent).toBeUndefined();
    expect(entry?.request.docIds).toBeUndefined();
  });

  it("qa1 carries docIds and qa2 carries an agent, matching their literal @/# text", () => {
    const qa1 = goldenQuestionById("qa1");
    expect(qa1?.request.docIds).toEqual(["fy25-er"]);
    expect(qa1?.request.question).toContain("#FY2025-Earnings-Release");

    const qa2 = goldenQuestionById("qa2");
    expect(qa2?.request.agent).toBe("risk");
    expect(qa2?.request.question).toContain("@Risk & Portfolio Monitoring");
  });

  it("compliance-ar is the only ar-language entry", () => {
    const arEntries = GOLDEN_QUESTIONS.filter((q) => q.request.lang === "ar");
    expect(arEntries.map((q) => q.id)).toEqual(["compliance-ar"]);
  });
});

describe("filterGoldenQuestions, palette filter logic", () => {
  it("shows nothing when the current locale doesn't match an entry's recorded lang", () => {
    const ic = filterGoldenQuestions(GOLDEN_QUESTIONS, { kind: "ic" }, "ar");
    expect(ic).toEqual([]);
  });

  it("a workspace page shows only that workspace's entries (+ firm entries), in the current lang", () => {
    const jahezEn = filterGoldenQuestions(
      GOLDEN_QUESTIONS,
      { kind: "workspace", companyId: "jahez" },
      "en",
    );
    expect(jahezEn.map((q) => q.id).sort()).toEqual(
      [
        "qa1",
        "qa2",
        "deliverables",
        "followup-bull",
        "followup-keeta",
        "wacc-build",
        "comps-gap",
        "oneoff-check",
        "compliance-en",
      ].sort(),
    );

    const darbEn = filterGoldenQuestions(
      GOLDEN_QUESTIONS,
      { kind: "workspace", companyId: "darb" },
      "en",
    );
    expect(darbEn).toEqual([]); // no darb or firm-scoped entries in the set
  });

  it("the jahez workspace page shows the Arabic compliance entry only once the UI is already in ar", () => {
    const jahezAr = filterGoldenQuestions(
      GOLDEN_QUESTIONS,
      { kind: "workspace", companyId: "jahez" },
      "ar",
    );
    expect(jahezAr.map((q) => q.id)).toEqual(["compliance-ar"]);
  });

  it("the IC room shows only ic-context entries", () => {
    const ic = filterGoldenQuestions(GOLDEN_QUESTIONS, { kind: "ic" }, "en");
    expect(ic.map((q) => q.id)).toEqual(["ic-rank"]);
  });

  it("a null context (no chat surface on screen, Home, Deals, Agents…) shows every entry in that language", () => {
    const all = filterGoldenQuestions(GOLDEN_QUESTIONS, null, "en");
    expect(all).toHaveLength(10); // every en entry
  });
});

describe("groupGoldenQuestions", () => {
  it("groups by context key, preserving encounter order", () => {
    const groups = groupGoldenQuestions(
      filterGoldenQuestions(GOLDEN_QUESTIONS, null, "en"),
    );
    expect([...groups.keys()]).toEqual(["workspace:jahez", "ic"]);
    expect(groups.get("workspace:jahez")).toHaveLength(9);
    expect(groups.get("ic")).toHaveLength(1);
  });
});
