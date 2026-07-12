import fs from "node:fs";
import path from "node:path";
import { DealSchema, type Localized } from "@/lib/types";
import { AuditTrail } from "./audit-trail";

/** Deal.id -> localized display name, feeding the context filter pills + chip. */
function loadWorkspaceNames(): Record<string, Localized> {
  const file = path.join(process.cwd(), "data/deals.json");
  if (!fs.existsSync(file)) return {};
  const parsed = DealSchema.array().safeParse(
    JSON.parse(fs.readFileSync(file, "utf-8")),
  );
  if (!parsed.success) return {};
  return Object.fromEntries(parsed.data.map((d) => [d.id, d.name]));
}

export default function AuditPage() {
  const workspaceNames = loadWorkspaceNames();

  return (
    <main className="mx-auto max-w-[960px] px-8 pt-10 pb-16">
      <AuditTrail workspaceNames={workspaceNames} />
    </main>
  );
}
