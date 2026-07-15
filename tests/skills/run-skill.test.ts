import { describe, expect, it } from "vitest";
import { resolveSkillRun } from "@/app/(app)/skills/run-skill";
import { goldenQuestionById } from "@/lib/demo/golden-questions";
import { SKILLS } from "@/lib/skills";

function skill(id: string) {
  const found = SKILLS.find((s) => s.id === id);
  if (!found) throw new Error(`fixture skill "${id}" not found`);
  return found;
}

describe("resolveSkillRun", () => {
  it("returns null for a roadmap-only (run: null) skill", () => {
    expect(resolveSkillRun(skill("covenant-sweep"), "en")).toBeNull();
  });

  it("goldenId skills reproduce the exact recorded ChatRequest and land on its workspace context", () => {
    const target = resolveSkillRun(skill("risk-scorecard"), "en");
    const entry = goldenQuestionById("qa2")!;
    expect(target).not.toBeNull();
    expect(target!.text).toBe(entry.request.question);
    expect(target!.context).toEqual(entry.request.context);
    expect(target!.agent).toBe(entry.request.agent);
    expect(target!.href).toBe("/chat/new?context=workspace%3Ajahez");
    expect(target!.lang).toBe("en");
    expect(target!.fixedLang).toBe(true);
  });

  it("shariah-screen resolves to the Arabic golden entry regardless of the active UI locale", () => {
    const target = resolveSkillRun(skill("shariah-screen"), "en");
    const entry = goldenQuestionById("shariah-ar")!;
    expect(target!.text).toBe(entry.request.question);
    expect(target!.lang).toBe("ar");
    expect(target!.fixedLang).toBe(true);
  });

  it("ic-memo maps to the deliverables golden entry with no agent/docIds", () => {
    const target = resolveSkillRun(skill("ic-memo"), "en");
    expect(target!.text).toBe(
      "Prepare the IC memo, DCF model, and committee deck.",
    );
    expect(target!.agent).toBeUndefined();
    expect(target!.docIds).toBeUndefined();
  });

  it("prefill skills carry the locale-matched text, firm context, and the /chat/new firm href", () => {
    const en = resolveSkillRun(skill("dcf-fcff"), "en")!;
    expect(en.context).toEqual({ kind: "firm" });
    expect(en.href).toBe("/chat/new?context=firm");
    expect(en.lang).toBe("en");
    expect(en.text).toContain("Jahez");

    const ar = resolveSkillRun(skill("dcf-fcff"), "ar")!;
    expect(ar.text).toContain("جاهز");
    expect(ar.lang).toBe("ar");
  });

  it("a prefill skill is never fixedLang, even when the active UI locale is ar, regression guard for the 'Runs in Arabic' hint, which must only ever appear for a goldenId skill with a truly fixed (locale-independent) language, never merely because the UI itself is in Arabic", () => {
    for (const s of SKILLS) {
      if (!s.run || "goldenId" in s.run) continue;
      const target = resolveSkillRun(s, "ar")!;
      expect(target.lang, s.id).toBe("ar");
      expect(target.fixedLang, s.id).toBe(false);
    }
  });

  it("every mapped skill resolves to a non-null target (no dangling goldenId)", () => {
    for (const s of SKILLS) {
      if (s.run === null) continue;
      expect(resolveSkillRun(s, "en"), s.id).not.toBeNull();
    }
  });
});
