/**
 * POST /api/skills — create a user-defined custom skill.
 * DELETE /api/skills — remove one, by id (must be a "custom-" id).
 * Body (POST): { name, category, description, prefill } → { skill } 201.
 * Body (DELETE): { id } → { ok: true }.
 * Both append an audit entry (action "skill-created" / "skill-deleted"),
 * reusing the `question` field to carry "<name> — <category>" (agent-created
 * / model-edit / ic-draft precedent).
 */
import { z } from "zod";
import {
  addCustomSkill,
  CustomSkillSchema,
  listCustomSkills,
  removeCustomSkill,
} from "@/lib/custom-skills";
import { appendAudit } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CreateSchema = z.object({
  name: CustomSkillSchema.shape.name,
  category: CustomSkillSchema.shape.category,
  description: CustomSkillSchema.shape.description,
  prefill: CustomSkillSchema.shape.prefill,
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
    category: raw.category,
    description:
      typeof raw.description === "string"
        ? raw.description.trim()
        : raw.description,
    prefill: typeof raw.prefill === "string" ? raw.prefill.trim() : raw.prefill,
  };
  const parsed = CreateSchema.safeParse(trimmed);
  if (!parsed.success) {
    return Response.json({ error: "Invalid skill request" }, { status: 400 });
  }

  const skill = addCustomSkill(parsed.data);
  appendAudit({
    ts: new Date().toISOString(),
    user: "Ali",
    context: "firm",
    action: "skill-created",
    question: `${skill.name} — ${skill.category}`,
  });

  return Response.json({ skill }, { status: 201 });
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
    return Response.json({ error: "Invalid skill id" }, { status: 400 });
  }
  const { id } = parsed.data;

  const before = listCustomSkills().find((s) => s.id === id);
  if (!before || !removeCustomSkill(id)) {
    return Response.json({ error: "Skill not found" }, { status: 404 });
  }

  appendAudit({
    ts: new Date().toISOString(),
    user: "Ali",
    context: "firm",
    action: "skill-deleted",
    question: `${before.name} — ${before.category}`,
  });

  return Response.json({ ok: true });
}
