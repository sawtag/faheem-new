import { describe, expect, it } from "vitest";
import { matchGenerationTrigger } from "@/lib/demo/generation-triggers";
import { goldenQuestionById } from "@/lib/demo/golden-questions";

const question = (id: string): string => {
  const entry = goldenQuestionById(id);
  if (!entry) throw new Error(`golden question ${id} missing`);
  return entry.request.question;
};

describe("matchGenerationTrigger (golden text → generation turn)", () => {
  it.each([
    ["deliverables", "jahez", "all"],
    ["darb-memo", "darb", "docx"],
    ["dcf-scenarios", "jahez", "xlsx"],
    ["committee-deck", "jahez", "pptx"],
  ] as const)("%s → %s/%s", (id, workspace, artifact) => {
    expect(matchGenerationTrigger(question(id))).toEqual({
      workspace,
      artifact,
    });
  });

  it("matches on trimmed text (palette insert with stray whitespace still hits)", () => {
    expect(matchGenerationTrigger(`  ${question("darb-memo")}\n`)).toEqual({
      workspace: "darb",
      artifact: "docx",
    });
  });

  it("free-typed questions stream normally (null, no generation turn)", () => {
    expect(matchGenerationTrigger("What is Jahez's take rate?")).toBeNull();
    expect(matchGenerationTrigger("")).toBeNull();
  });

  it("chat golden questions never trigger generation", () => {
    for (const id of ["portfolio-top3", "ic-macro-thara", "qa1"]) {
      expect(matchGenerationTrigger(question(id))).toBeNull();
    }
  });
});
