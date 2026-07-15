/**
 * POST /api/improve — rewrites a rough question into a structured equity-research
 * prompt with the Haiku improver (non-streaming, structured JSON output).
 * Body: { question, lang } → { improved }.
 */
import { z } from "zod";
import { getClient, getImproveModel } from "@/lib/ai/client";
import { improveSystemPrompt } from "@/lib/ai/prompts";
import { LangSchema } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ImproveRequestSchema = z.object({
  question: z.string().min(1),
  lang: LangSchema,
});

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = ImproveRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid improve request" }, { status: 400 });
  }
  const { question, lang } = parsed.data;

  // The prompt improver always calls the real Haiku model, in every mode
  // (cached/auto/live) — it's a cheap, fast call and the demo ships a working
  // key. A failure (no key, network, malformed output) falls back to the
  // original question rather than breaking the composer.
  let improved = question;
  try {
    const response = await getClient().messages.create({
      model: getImproveModel(),
      max_tokens: 1024,
      system: improveSystemPrompt(lang),
      messages: [{ role: "user", content: question }],
      output_config: {
        format: {
          type: "json_schema",
          schema: {
            type: "object",
            properties: { improved: { type: "string" } },
            required: ["improved"],
            additionalProperties: false,
          },
        },
      },
    });

    const text = response.content.find((b) => b.type === "text")?.text ?? "{}";
    const obj = JSON.parse(text) as { improved?: unknown };
    if (typeof obj.improved === "string" && obj.improved.trim()) {
      improved = obj.improved;
    }
  } catch (err) {
    console.error("[faheem] prompt improver failed:", err);
  }

  return Response.json({ improved });
}
