import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  addCustomSkill,
  CustomSkillSchema,
  listCustomSkills,
  removeCustomSkill,
  updateCustomSkill,
} from "@/lib/custom-skills";

let storeFile: string;

function useTempStore(): void {
  storeFile = path.join(
    fs.mkdtempSync(path.join(os.tmpdir(), "faheem-custom-skills-")),
    "custom-skills.json",
  );
  process.env.FAHEEM_CUSTOM_SKILLS_PATH = storeFile;
}

afterEach(() => {
  delete process.env.FAHEEM_CUSTOM_SKILLS_PATH;
  if (storeFile && fs.existsSync(storeFile)) fs.rmSync(storeFile);
});

describe("lib/custom-skills", () => {
  it("list on a missing file returns []", () => {
    useTempStore();
    expect(listCustomSkills()).toEqual([]);
  });

  it("add + list roundtrip validates against CustomSkillSchema", () => {
    useTempStore();
    const skill = addCustomSkill({
      name: "Working-Capital Sweep",
      category: "diligence",
      description: "Flags unusual swings in working-capital line items.",
      prefill: "Walk through the working-capital movements for this deal.",
    });

    expect(CustomSkillSchema.safeParse(skill).success).toBe(true);
    expect(skill.id).toBe("custom-working-capital-sweep");

    const listed = listCustomSkills();
    expect(listed).toHaveLength(1);
    expect(listed[0]).toEqual(skill);
    expect(CustomSkillSchema.array().safeParse(listed).success).toBe(true);
  });

  it("slugifies an ASCII name into the id", () => {
    useTempStore();
    const skill = addCustomSkill({
      name: "Deal Flow Screen 2000!",
      category: "valuation",
      description: "Screens inbound deal flow against mandate criteria.",
      prefill: "Screen the inbound pipeline against our mandate criteria.",
    });
    expect(skill.id).toBe("custom-deal-flow-screen-2000");
  });

  it("an Arabic (non-ASCII) name falls back to custom-skill", () => {
    useTempStore();
    const skill = addCustomSkill({
      name: "فرز الصفقات",
      category: "valuation",
      description: "يفرز الصفقات القطاعية مقابل معايير التفويض المحددة.",
      prefill: "افرز الصفقات القطاعية مقابل معايير التفويض المحددة للشركة.",
    });
    expect(skill.id).toBe("custom-skill");
  });

  it("a name collision suffixes -2, then -3", () => {
    useTempStore();
    const s1 = addCustomSkill({
      name: "Screen",
      category: "valuation",
      description: "First skill with this exact slugified name collision.",
      prefill: "First skill's run prefill text of sufficient length here.",
    });
    const s2 = addCustomSkill({
      name: "Screen",
      category: "valuation",
      description: "Second skill with this exact slugified name collision.",
      prefill: "Second skill's run prefill text of sufficient length here.",
    });
    const s3 = addCustomSkill({
      name: "Screen",
      category: "valuation",
      description: "Third skill with this exact slugified name collision.",
      prefill: "Third skill's run prefill text of sufficient length here.",
    });
    expect(s1.id).toBe("custom-screen");
    expect(s2.id).toBe("custom-screen-2");
    expect(s3.id).toBe("custom-screen-3");
  });

  it("remove returns true for an existing id and false otherwise", () => {
    useTempStore();
    const skill = addCustomSkill({
      name: "Temp Skill",
      category: "output",
      description: "A skill created only to be removed by this test.",
      prefill: "Draft the standard output this temp skill would prefill.",
    });
    expect(removeCustomSkill("custom-does-not-exist")).toBe(false);
    expect(removeCustomSkill(skill.id)).toBe(true);
    expect(listCustomSkills()).toEqual([]);
    expect(removeCustomSkill(skill.id)).toBe(false);
  });

  it("a corrupt/invalid file behaves as an empty list", () => {
    useTempStore();
    fs.mkdirSync(path.dirname(storeFile), { recursive: true });
    fs.writeFileSync(storeFile, "{ not json");
    expect(listCustomSkills()).toEqual([]);

    fs.writeFileSync(storeFile, JSON.stringify([{ nope: true }]));
    expect(listCustomSkills()).toEqual([]);
  });

  it("a legacy entry without author/enabled parses with defaults (user, true)", () => {
    useTempStore();
    fs.mkdirSync(path.dirname(storeFile), { recursive: true });
    fs.writeFileSync(
      storeFile,
      JSON.stringify([
        {
          id: "custom-legacy",
          name: "Legacy Skill",
          category: "valuation",
          description: "Written before author/enabled existed on the schema.",
          prefill: "A prefill that is definitely long enough to pass here.",
          createdAt: "2026-07-15T00:00:00.000Z",
        },
      ]),
    );
    const listed = listCustomSkills();
    expect(listed).toHaveLength(1);
    expect(listed[0]?.author).toBe("user");
    expect(listed[0]?.enabled).toBe(true);
  });

  it("updateCustomSkill patches fields in place and preserves the rest", () => {
    useTempStore();
    const skill = addCustomSkill({
      name: "Patch Target",
      category: "valuation",
      description: "A skill created to be edited by this unit test.",
      prefill: "A prefill that is definitely long enough to pass here.",
    });
    const updated = updateCustomSkill(skill.id, {
      description: "A freshly edited description of sufficient length.",
      enabled: false,
    });
    expect(updated?.description).toBe(
      "A freshly edited description of sufficient length.",
    );
    expect(updated?.enabled).toBe(false);
    expect(updated?.name).toBe("Patch Target");
    expect(updated?.author).toBe("user");
    expect(listCustomSkills()[0]).toEqual(updated);
  });

  it("updateCustomSkill returns null for an unknown id", () => {
    useTempStore();
    expect(updateCustomSkill("custom-nope", { enabled: false })).toBeNull();
  });

  it("schema rejects a bad category", () => {
    const parsed = CustomSkillSchema.safeParse({
      id: "custom-bad",
      name: "Bad Skill",
      category: "not-a-real-category",
      description: "A description that is definitely long enough.",
      prefill: "A prefill that is definitely long enough to pass.",
      createdAt: new Date().toISOString(),
    });
    expect(parsed.success).toBe(false);
  });
});
