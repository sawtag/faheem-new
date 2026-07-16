/**
 * POST /api/agents/enhance: rewrites a rough custom-agent description into a
 * richer working brief with the Haiku improver (non-streaming, structured
 * JSON output). Mirrors app/api/improve/route.ts verbatim in structure.
 * Body: { description, name?, role?, lang } → { enhanced }.
 */
import { z } from "zod";
import { getClient, getImproveModel } from "@/lib/ai/client";
import { enhanceAgentSystemPrompt } from "@/lib/ai/prompts";
import { LangSchema } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EnhanceRequestSchema = z.object({
  description: z.string().min(1),
  name: z.string().optional(),
  role: z.string().optional(),
  lang: LangSchema,
});

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = EnhanceRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid enhance request" }, { status: 400 });
  }
  const { description, name, role, lang } = parsed.data;

  // Context lines (name/role), when present, are woven into the user message
  // content rather than the system prompt; the system prompt stays generic
  // and reusable across agents.
  const context = [name && `Agent name: ${name}`, role && `Agent role: ${role}`]
    .filter(Boolean)
    .join("\n");
  const userContent = context ? `${context}\n\n${description}` : description;

  // The agent-brief enhancer always calls the real Haiku model, in every mode
  // (cached/auto/live), it's a cheap, fast call and the demo ships a working
  // key. A failure (no key, network, malformed output) falls back to the
  // original description rather than breaking the dialog.
  let enhanced = description;
  try {
    const response = await getClient().messages.create({
      model: getImproveModel(),
      max_tokens: 1024,
      system: enhanceAgentSystemPrompt(lang),
      messages: [{ role: "user", content: userContent }],
      output_config: {
        format: {
          type: "json_schema",
          schema: {
            type: "object",
            properties: { enhanced: { type: "string" } },
            required: ["enhanced"],
            additionalProperties: false,
          },
        },
      },
    });

    const text = response.content.find((b) => b.type === "text")?.text ?? "{}";
    const obj = JSON.parse(text) as { enhanced?: unknown };
    if (typeof obj.enhanced === "string" && obj.enhanced.trim()) {
      enhanced = obj.enhanced;
    }
  } catch (err) {
    console.error("[faheem] agent-brief enhancer failed:", err);
  }

  return Response.json({ enhanced });
}
