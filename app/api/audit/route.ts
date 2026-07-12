/**
 * GET /api/audit — data/audit-log.json contents (server-only fs read), polled
 * by the Audit Trail panel every 5s. FAHEEM_AUDIT_PATH overrides the target
 * (mirrors lib/audit.ts's append side, and the override tests already use).
 */
import fs from "node:fs";
import path from "node:path";
import { AuditEntrySchema } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function auditPath(): string {
  return (
    process.env.FAHEEM_AUDIT_PATH ||
    path.join(process.cwd(), "data/audit-log.json")
  );
}

export async function GET(): Promise<Response> {
  const file = auditPath();
  if (!fs.existsSync(file)) return Response.json([]);

  let raw: unknown;
  try {
    raw = JSON.parse(fs.readFileSync(file, "utf-8"));
  } catch {
    return Response.json({ error: "audit log unreadable" }, { status: 500 });
  }

  const parsed = AuditEntrySchema.array().safeParse(raw);
  if (!parsed.success) {
    return Response.json({ error: "audit log invalid" }, { status: 500 });
  }

  return Response.json(parsed.data);
}
