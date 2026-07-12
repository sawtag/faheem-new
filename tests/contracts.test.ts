import { describe, expect, it } from "vitest";
import { DealSchema } from "@/lib/types";

const validDeal = {
  id: "darb",
  name: { en: "Darb", ar: "درب" },
  sector: { en: "Logistics SaaS", ar: "برمجيات لوجستية" },
  origin: "inbound",
  stage: "screening",
  statusLine: {
    en: "Awaiting mandate-fit review",
    ar: "بانتظار مراجعة الملاءمة",
  },
};

describe("DealSchema", () => {
  it("accepts a minimal valid deal", () => {
    const result = DealSchema.safeParse(validDeal);
    expect(result.success).toBe(true);
  });

  it("rejects a deal with a missing localized field and a bad enum", () => {
    const invalidDeal = {
      ...validDeal,
      name: undefined,
      stage: "won", // not a valid Deal["stage"]
    };
    const result = DealSchema.safeParse(invalidDeal);
    expect(result.success).toBe(false);
  });
});
