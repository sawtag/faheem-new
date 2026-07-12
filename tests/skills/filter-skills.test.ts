import { describe, expect, it } from "vitest";
import { filterSkills } from "@/app/(app)/skills/filter-skills";
import { SKILLS } from "@/lib/skills";

describe("filterSkills", () => {
  it("returns every skill for 'all'", () => {
    expect(filterSkills(SKILLS, "all")).toHaveLength(10);
  });

  it("filters by category", () => {
    expect(filterSkills(SKILLS, "valuation").map((s) => s.id)).toEqual([
      "dcf-fcff",
      "trading-comps",
      "football-field",
      "sensitivity",
    ]);
    expect(filterSkills(SKILLS, "output").map((s) => s.id)).toEqual([
      "ic-memo",
    ]);
  });

  it("diligence includes both mandate-fit and covenant-sweep", () => {
    expect(
      filterSkills(SKILLS, "diligence")
        .map((s) => s.id)
        .sort(),
    ).toEqual(["covenant-sweep", "mandate-fit"].sort());
  });
});
