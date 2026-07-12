/**
 * POST /api/improve — rewrites a rough question into a structured equity-research
 * prompt with the Haiku improver (non-streaming, structured JSON output).
 * Body: { question, lang } → { improved }.
 */
import { z } from "zod";
import { getClient, getImproveModel } from "@/lib/ai/client";
import { resolveMode } from "@/lib/ai/mode";
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

  // Cached mode is the bulletproof stage mode: never fire a live improver
  // call there — echo the question back unchanged (the wand is also hidden
  // client-side for golden text; this is defense in depth).
  const cookieHeader = request.headers.get("cookie") ?? "";
  const modeCookie = /(?:^|;\s*)faheem_mode=([^;]+)/.exec(cookieHeader)?.[1];
  if (resolveMode(modeCookie) === "cached") {
    return Response.json({ improved: question });
  }

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
  let improved = question;
  try {
    const obj = JSON.parse(text) as { improved?: unknown };
    if (typeof obj.improved === "string" && obj.improved.trim()) {
      improved = obj.improved;
    }
  } catch {
    // malformed model output → fall back to the original question
  }

  return Response.json({ improved });
}
