/**
 * Append-only audit trail (data/audit-log.json) — feeds the Audit Trail panel.
 * FAHEEM_AUDIT_PATH overrides the target (used by tests). Writes are atomic:
 * read → append → write-temp → rename.
 */
import fs from "node:fs";
import path from "node:path";
import { AuditEntrySchema, type AuditEntry } from "@/lib/types";

function auditPath(): string {
  return (
    process.env.FAHEEM_AUDIT_PATH ||
    path.join(process.cwd(), "data/audit-log.json")
  );
}

export function appendAudit(entry: AuditEntry): void {
  const file = auditPath();
  let entries: AuditEntry[] = [];
  if (fs.existsSync(file)) {
    try {
      const parsed = AuditEntrySchema.array().safeParse(
        JSON.parse(fs.readFileSync(file, "utf-8")),
      );
      if (parsed.success) entries = parsed.data;
    } catch {
      entries = [];
    }
  }
  entries.push(entry);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(entries, null, 2) + "\n");
  fs.renameSync(tmp, file);
}
