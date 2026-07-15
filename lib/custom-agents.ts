/**
 * Store for user-created custom agents (data/custom-agents.json). Mirrors
 * lib/audit.ts's atomic-write pattern exactly: read → validate → mutate →
 * write-temp → rename. FAHEEM_CUSTOM_AGENTS_PATH overrides the target (tests).
 */
import fs from "node:fs";
import path from "node:path";
import { CustomAgentSchema, type CustomAgent } from "@/lib/types";

function storePath(): string {
  return (
    process.env.FAHEEM_CUSTOM_AGENTS_PATH ||
    path.join(process.cwd(), "data/custom-agents.json")
  );
}

function readAll(): CustomAgent[] {
  const file = storePath();
  if (!fs.existsSync(file)) return [];
  try {
    const parsed = CustomAgentSchema.array().safeParse(
      JSON.parse(fs.readFileSync(file, "utf-8")),
    );
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

function writeAll(agents: CustomAgent[]): void {
  const file = storePath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(agents, null, 2) + "\n");
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
  const base = (slugify(name) || "agent").slice(0, 40);
  let candidate = `custom-${base}`;
  let n = 2;
  while (existing.has(candidate)) {
    const suffix = `-${n}`;
    candidate = `custom-${base.slice(0, 40 - suffix.length)}${suffix}`;
    n += 1;
  }
  return candidate;
}

export function listCustomAgents(): CustomAgent[] {
  return readAll();
}

export function addCustomAgent(input: {
  name: string;
  role: string;
  description: string;
}): CustomAgent {
  const agents = readAll();
  const id = nextId(input.name, new Set(agents.map((a) => a.id)));
  const agent: CustomAgent = {
    id,
    name: input.name,
    role: input.role,
    description: input.description,
    createdAt: new Date().toISOString(),
  };
  writeAll([...agents, agent]);
  return agent;
}

/** Removes a custom agent by id; returns false when the id doesn't exist. */
export function removeCustomAgent(id: string): boolean {
  const agents = readAll();
  const next = agents.filter((a) => a.id !== id);
  if (next.length === agents.length) return false;
  writeAll(next);
  return true;
}
