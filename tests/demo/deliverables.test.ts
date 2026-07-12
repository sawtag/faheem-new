import { describe, expect, it } from "vitest";
import { isDeliverablesQuestion } from "@/lib/demo/deliverables";

describe("isDeliverablesQuestion — deliverables-beat exact-match detector", () => {
  it("matches the exact recorded golden text", () => {
    expect(
      isDeliverablesQuestion(
        "Prepare the IC memo, DCF model, and committee deck.",
      ),
    ).toBe(true);
  });

  it("matches with surrounding whitespace trimmed", () => {
    expect(
      isDeliverablesQuestion(
        "  Prepare the IC memo, DCF model, and committee deck.  ",
      ),
    ).toBe(true);
  });

  it("does not match a close-but-different question", () => {
    expect(
      isDeliverablesQuestion("Prepare the IC memo and committee deck."),
    ).toBe(false);
  });

  it("does not match a different case", () => {
    expect(
      isDeliverablesQuestion(
        "prepare the ic memo, dcf model, and committee deck.",
      ),
    ).toBe(false);
  });

  it("does not match an unrelated question", () => {
    expect(isDeliverablesQuestion("What is Jahez's take rate?")).toBe(false);
  });
});
