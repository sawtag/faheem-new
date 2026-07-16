import { afterEach, describe, expect, it } from "vitest";
import { POST } from "@/app/api/agents/enhance/route";
import { setClientForTests, type FaheemClient } from "@/lib/ai/client";

afterEach(() => setClientForTests(null));

describe("POST /api/agents/enhance", () => {
  it("returns the enhanced brief from the mocked improver", async () => {
    const enhanced =
      "You are a sector-focused screening specialist. You review inbound retail and e-commerce deals against the mandate criteria, flag disqualifying red flags, and summarize fit in a short, evidence-led note.";
    const mock: FaheemClient = {
      beta: {
        messages: {
          stream: () => {
            throw new Error("not used by enhance");
          },
        },
      },
      messages: {
        create: async () => ({
          content: [{ type: "text", text: JSON.stringify({ enhanced }) }],
        }),
      },
    };
    setClientForTests(mock);

    const res = await POST(
      new Request("http://localhost/api/agents/enhance", {
        method: "POST",
        // The enhancer always calls Haiku, in every mode (cached/auto/live);
        // declare cached explicitly to prove it isn't skipped there.
        headers: {
          "content-type": "application/json",
          cookie: "faheem_mode=cached",
        },
        body: JSON.stringify({
          description: "screens retail deals",
          name: "Sector Screener",
          role: "Retail specialist",
          lang: "en",
        }),
      }),
    );
    const json = (await res.json()) as { enhanced: string };
    expect(json.enhanced).toBe(enhanced);
    expect(json.enhanced).toContain("screening specialist");
  });

  it("falls back to the original description when the enhancer call fails", async () => {
    const mock: FaheemClient = {
      beta: {
        messages: {
          stream: () => {
            throw new Error("not used by enhance");
          },
        },
      },
      messages: {
        create: async () => {
          throw new Error("simulated enhancer failure");
        },
      },
    };
    setClientForTests(mock);

    const res = await POST(
      new Request("http://localhost/api/agents/enhance", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          description: "screens retail deals",
          lang: "en",
        }),
      }),
    );
    const json = (await res.json()) as { enhanced: string };
    expect(json.enhanced).toBe("screens retail deals");
  });

  it("rejects an empty description with 400", async () => {
    const res = await POST(
      new Request("http://localhost/api/agents/enhance", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ description: "", lang: "en" }),
      }),
    );
    expect(res.status).toBe(400);
  });

  it("rejects an invalid lang with 400", async () => {
    const res = await POST(
      new Request("http://localhost/api/agents/enhance", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          description: "screens retail deals",
          lang: "fr",
        }),
      }),
    );
    expect(res.status).toBe(400);
  });
});
