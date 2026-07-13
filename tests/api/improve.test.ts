import { afterEach, describe, expect, it } from "vitest";
import { POST } from "@/app/api/improve/route";
import { setClientForTests, type FaheemClient } from "@/lib/ai/client";

afterEach(() => setClientForTests(null));

describe("POST /api/improve", () => {
  it("returns the rewritten prompt from the mocked improver", async () => {
    const improved =
      "Analyze Jahez's FY2025 unit economics — GMV growth, take rate, AOV, and contribution margin — and explain the ~61% net-income compression.";
    const mock: FaheemClient = {
      beta: {
        messages: {
          stream: () => {
            throw new Error("not used by improve");
          },
        },
      },
      messages: {
        create: async () => ({
          content: [{ type: "text", text: JSON.stringify({ improved }) }],
        }),
      },
    };
    setClientForTests(mock);

    const res = await POST(
      new Request("http://localhost/api/improve", {
        method: "POST",
        // Improve is a live-only feature — it no-ops in cached mode (defense in
        // depth against rewriting a golden question). Declare live explicitly.
        headers: {
          "content-type": "application/json",
          cookie: "faheem_mode=live",
        },
        body: JSON.stringify({ question: "jahez good?", lang: "en" }),
      }),
    );
    const json = (await res.json()) as { improved: string };
    expect(json.improved).toBe(improved);
    expect(json.improved).toContain("contribution margin");
  });

  it("rejects an empty question with 400", async () => {
    const res = await POST(
      new Request("http://localhost/api/improve", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: "", lang: "en" }),
      }),
    );
    expect(res.status).toBe(400);
  });
});
