import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { cacheKey, contextKey } from "@/lib/ai/cache";
import type { ChatRequest } from "@/lib/types";

describe("contextKey", () => {
  it("encodes each context kind per spec", () => {
    expect(contextKey({ kind: "firm" })).toBe("firm");
    expect(contextKey({ kind: "ic" })).toBe("ic");
    expect(contextKey({ kind: "workspace", companyId: "darb" })).toBe(
      "workspace:darb",
    );
  });
});

describe("cacheKey", () => {
  const req: ChatRequest = {
    question: "Break down Jahez FY2025 unit economics",
    lang: "en",
    context: { kind: "workspace", companyId: "jahez" },
    docIds: ["fy25-er"],
  };

  it("matches the documented sha1 formula", () => {
    const expected = createHash("sha1")
      .update(
        "Break down Jahez FY2025 unit economics|en|workspace:jahez||fy25-er",
      )
      .digest("hex");
    expect(cacheKey(req)).toBe(expected);
  });

  it("is a stable hand-computed vector (workspace, no agent)", () => {
    expect(cacheKey(req)).toBe("1b015419366d37e74ccdfdf5e763502e75b8d0a7");
  });

  it("places the agent + empty docIds correctly (arabic vector)", () => {
    const arReq: ChatRequest = {
      question: "هل يجتاز جاهز فحص الامتثال وفق منهجية AAOIFI؟",
      lang: "ar",
      context: { kind: "workspace", companyId: "jahez" },
      agent: "risk",
      docIds: [],
    };
    expect(cacheKey(arReq)).toBe("b8ecb886a10784d6615ccaabb9e9cbdb6d631e2b");
  });

  it("is deterministic and order-sensitive on docIds", () => {
    expect(cacheKey({ ...req })).toBe(cacheKey({ ...req }));
    expect(
      cacheKey({ ...req, docIds: ["fy25-er", "market-data-comps"] }),
    ).not.toBe(cacheKey({ ...req, docIds: ["market-data-comps", "fy25-er"] }));
  });

  it("omitted agent hashes the same as an empty-string agent slot", () => {
    const withUndef: ChatRequest = {
      question: "q",
      lang: "en",
      context: { kind: "firm" },
    };
    const expected = createHash("sha1").update("q|en|firm||").digest("hex");
    expect(cacheKey(withUndef)).toBe(expected);
  });
});
