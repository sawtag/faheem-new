import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { POST } from "@/app/api/agents/toggle/route";
import type { AuditEntry } from "@/lib/types";

let auditFile: string;

function useTempAudit(): void {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "faheem-agent-toggle-"));
  auditFile = path.join(dir, "audit-log.json");
  process.env.FAHEEM_AUDIT_PATH = auditFile;
}

function readAudit(): AuditEntry[] {
  if (!fs.existsSync(auditFile)) return [];
  return JSON.parse(fs.readFileSync(auditFile, "utf-8")) as AuditEntry[];
}

afterEach(() => {
  delete process.env.FAHEEM_AUDIT_PATH;
});

function toggleRequest(body: unknown): Request {
  return new Request("http://localhost/api/agents/toggle", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/agents/toggle", () => {
  it("audits a disable with the agent's name and the new state", async () => {
    useTempAudit();
    const res = await POST(toggleRequest({ id: "valuation", enabled: false }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });

    const audit = readAudit();
    expect(audit).toHaveLength(1);
    expect(audit[0]?.action).toBe("agent-toggled");
    expect(audit[0]?.question).toBe("Valuation & Modeling · disabled");
  });

  it("audits a re-enable as enabled", async () => {
    useTempAudit();
    await POST(toggleRequest({ id: "valuation", enabled: true }));
    expect(readAudit()[0]?.question).toBe("Valuation & Modeling · enabled");
  });

  it("rejects an unknown agent id with 400 and writes no audit entry", async () => {
    useTempAudit();
    const res = await POST(
      toggleRequest({ id: "not-an-agent", enabled: false }),
    );
    expect(res.status).toBe(400);
    expect(readAudit()).toEqual([]);
  });

  it("rejects malformed JSON with 400", async () => {
    useTempAudit();
    const res = await POST(
      new Request("http://localhost/api/agents/toggle", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{ not json",
      }),
    );
    expect(res.status).toBe(400);
  });
});
