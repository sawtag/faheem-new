/**
 * User-created custom skills (Skills Library). Schema lives HERE, not in
 * lib/types.ts, because it needs SkillCategorySchema from lib/skills.ts and
 * lib/types.ts must not import lib/skills (mirrors lib/custom-agents.ts's
 * store pattern exactly: atomic writes, FAHEEM_CUSTOM_SKILLS_PATH override,
 * custom- slug ids with collision suffixes).
 */
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { SkillCategorySchema } from "@/lib/skills";

export const CustomSkillSchema = z
  .object({
    id: z.string().regex(/^custom-[a-z0-9-]{1,40}$/),
    name: z.string().min(2).max(60),
    category: SkillCategorySchema,
    /** one-liner shown on the card */
    description: z.string().min(10).max(200),
    /** what Run drops into the chat composer */
    prefill: z.string().min(10).max(2000),
    createdAt: z.string(),
  })
  .strict();
export type CustomSkill = z.infer<typeof CustomSkillSchema>;

function storePath(): string {
  return (
    process.env.FAHEEM_CUSTOM_SKILLS_PATH ||
    path.join(process.cwd(), "data/custom-skills.json")
  );
}

function readAll(): CustomSkill[] {
  const file = storePath();
  if (!fs.existsSync(file)) return [];
  try {
    const parsed = CustomSkillSchema.array().safeParse(
      JSON.parse(fs.readFileSync(file, "utf-8")),
    );
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

function writeAll(skills: CustomSkill[]): void {
  const file = storePath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(skills, null, 2) + "\n");
  fs.renameSync(tmp, file);
}

/** ASCII-slugifies a name for the id suffix; non-ASCII input (e.g. Arabic) slugifies empty. */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function nextId(name: string, existing: Set<string>): string {
  const base = (slugify(name) || "skill").slice(0, 40);
  let candidate = `custom-${base}`;
  let n = 2;
  while (existing.has(candidate)) {
    const suffix = `-${n}`;
    candidate = `custom-${base.slice(0, 40 - suffix.length)}${suffix}`;
    n += 1;
  }
  return candidate;
}

export function listCustomSkills(): CustomSkill[] {
  return readAll();
}

export function addCustomSkill(input: {
  name: string;
  category: CustomSkill["category"];
  description: string;
  prefill: string;
}): CustomSkill {
  const skills = readAll();
  const id = nextId(input.name, new Set(skills.map((s) => s.id)));
  const skill: CustomSkill = {
    id,
    name: input.name,
    category: input.category,
    description: input.description,
    prefill: input.prefill,
    createdAt: new Date().toISOString(),
  };
  writeAll([...skills, skill]);
  return skill;
}

/** Removes a custom skill by id; returns false when the id doesn't exist. */
export function removeCustomSkill(id: string): boolean {
  const skills = readAll();
  const next = skills.filter((s) => s.id !== id);
  if (next.length === skills.length) return false;
  writeAll(next);
  return true;
}
