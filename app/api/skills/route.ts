/**
 * POST /api/skills: create a user-defined custom skill.
 * PATCH /api/skills: edit fields or flip `enabled`, by id (must be "custom-").
 * DELETE /api/skills: remove one, by id (must be a "custom-" id).
 * Body (POST): { name, category, description, prefill } → { skill } 201.
 * Body (PATCH): { id, name?, category?, description?, prefill?, enabled? } → { skill }.
 * Body (DELETE): { id } → { ok: true }.
 * All append an audit entry ("skill-created" / "skill-updated" /
 * "skill-toggled" for an enabled-only patch / "skill-deleted"),
 * reusing the `question` field to carry "<name> · <category>" (agent-created
 * / model-edit / ic-draft precedent).
 */
import { z } from "zod";
import {
  addCustomSkill,
  CustomSkillSchema,
  listCustomSkills,
  removeCustomSkill,
  updateCustomSkill,
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

const PatchSchema = z
  .object({
    id: z.string().min(1),
    name: CustomSkillSchema.shape.name.optional(),
    category: CustomSkillSchema.shape.category.optional(),
    description: CustomSkillSchema.shape.description.optional(),
    prefill: CustomSkillSchema.shape.prefill.optional(),
    enabled: z.boolean().optional(),
  })
  .strict();

/** Trims every string field the client may send (POST and PATCH bodies alike). */
function trimStrings(raw: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(raw).map(([k, v]) => [
      k,
      typeof v === "string" && k !== "id" ? v.trim() : v,
    ]),
  );
}

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const raw = (body ?? {}) as Record<string, unknown>;
  const parsed = CreateSchema.safeParse(trimStrings(raw));
  if (!parsed.success) {
    return Response.json({ error: "Invalid skill request" }, { status: 400 });
  }

  const skill = addCustomSkill(parsed.data);
  appendAudit({
    ts: new Date().toISOString(),
    user: "Ali",
    context: "firm",
    action: "skill-created",
    question: `${skill.name} · ${skill.category}`,
  });

  return Response.json({ skill }, { status: 201 });
}

export async function PATCH(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const raw = (body ?? {}) as Record<string, unknown>;
  const parsed = PatchSchema.safeParse(trimStrings(raw));
  if (!parsed.success || !parsed.data.id.startsWith("custom-")) {
    return Response.json({ error: "Invalid skill request" }, { status: 400 });
  }
  const { id, ...patch } = parsed.data;
  const fields = Object.fromEntries(
    Object.entries(patch).filter(([, v]) => v !== undefined),
  );
  if (Object.keys(fields).length === 0) {
    return Response.json({ error: "Empty patch" }, { status: 400 });
  }

  const skill = updateCustomSkill(id, fields);
  if (!skill) {
    return Response.json({ error: "Skill not found" }, { status: 404 });
  }

  const toggleOnly = Object.keys(fields).length === 1 && "enabled" in fields;
  appendAudit({
    ts: new Date().toISOString(),
    user: "Ali",
    context: "firm",
    action: toggleOnly ? "skill-toggled" : "skill-updated",
    question: toggleOnly
      ? `${skill.name} · ${skill.enabled ? "enabled" : "disabled"}`
      : `${skill.name} · ${skill.category}`,
  });

  return Response.json({ skill });
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
    question: `${before.name} · ${before.category}`,
  });

  return Response.json({ ok: true });
}
