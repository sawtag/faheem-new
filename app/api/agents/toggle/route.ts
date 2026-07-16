/**
 * POST /api/agents/toggle: audit-log an agent roster toggle. The toggle
 * state itself lives client-side (localStorage, agent-card.tsx) because the
 * orchestrator picks specialists per prompt; this endpoint exists ONLY so
 * the governance story holds: every roster change lands in the audit trail.
 * Body: { id, enabled } → { ok: true }; unknown agent ids 400.
 */
import { z } from "zod";
import { AGENTS } from "@/lib/ai/agents";
import { appendAudit } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ToggleSchema = z.object({
  id: z.string().min(1),
  enabled: z.boolean(),
});

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = ToggleSchema.safeParse(body);
  const agent = parsed.success
    ? AGENTS.find((a) => a.id === parsed.data.id)
    : undefined;
  if (!parsed.success || !agent) {
    return Response.json({ error: "Invalid toggle request" }, { status: 400 });
  }

  appendAudit({
    ts: new Date().toISOString(),
    user: "Ali",
    context: "firm",
    action: "agent-toggled",
    question: `${agent.name.en} · ${parsed.data.enabled ? "enabled" : "disabled"}`,
  });

  return Response.json({ ok: true });
}
