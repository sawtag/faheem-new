/**
 * POST /api/agents — create a user-defined custom agent.
 * DELETE /api/agents — remove one, by id (must be a "custom-" id).
 * Body (POST): { name, role, description } → { agent } 201.
 * Body (DELETE): { id } → { ok: true }.
 * Both append an audit entry (action "agent-created" / "agent-deleted"),
 * reusing the `question` field to carry "<name> — <role>" (model-edit /
 * ic-draft precedent).
 */
import { z } from "zod";
import {
  addCustomAgent,
  listCustomAgents,
  removeCustomAgent,
} from "@/lib/custom-agents";
import { appendAudit } from "@/lib/audit";
import { CustomAgentSchema } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CreateSchema = z.object({
  name: CustomAgentSchema.shape.name,
  role: CustomAgentSchema.shape.role,
  description: CustomAgentSchema.shape.description,
});

const DeleteSchema = z.object({ id: z.string().min(1) });

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const raw = (body ?? {}) as Record<string, unknown>;
  const trimmed = {
    name: typeof raw.name === "string" ? raw.name.trim() : raw.name,
    role: typeof raw.role === "string" ? raw.role.trim() : raw.role,
    description:
      typeof raw.description === "string"
        ? raw.description.trim()
        : raw.description,
  };
  const parsed = CreateSchema.safeParse(trimmed);
  if (!parsed.success) {
    return Response.json({ error: "Invalid agent request" }, { status: 400 });
  }

  const agent = addCustomAgent(parsed.data);
  appendAudit({
    ts: new Date().toISOString(),
    user: "Ali",
    context: "firm",
    action: "agent-created",
    question: `${agent.name} — ${agent.role}`,
  });

  return Response.json({ agent }, { status: 201 });
}

export async function DELETE(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = DeleteSchema.safeParse(body);
  if (!parsed.success || !parsed.data.id.startsWith("custom-")) {
    return Response.json({ error: "Invalid agent id" }, { status: 400 });
  }
  const { id } = parsed.data;

  const before = listCustomAgents().find((a) => a.id === id);
  if (!before || !removeCustomAgent(id)) {
    return Response.json({ error: "Agent not found" }, { status: 404 });
  }

  appendAudit({
    ts: new Date().toISOString(),
    user: "Ali",
    context: "firm",
    action: "agent-deleted",
    question: `${before.name} — ${before.role}`,
  });

  return Response.json({ ok: true });
}
