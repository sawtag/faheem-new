import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { DELETE, POST } from "@/app/api/agents/route";
import type { AuditEntry, CustomAgent } from "@/lib/types";

let agentsFile: string;
let auditFile: string;

function useTempStores(): void {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "faheem-agents-api-"));
  agentsFile = path.join(dir, "custom-agents.json");
  auditFile = path.join(dir, "audit-log.json");
  process.env.FAHEEM_CUSTOM_AGENTS_PATH = agentsFile;
  process.env.FAHEEM_AUDIT_PATH = auditFile;
}

function readAudit(): AuditEntry[] {
  if (!fs.existsSync(auditFile)) return [];
  return JSON.parse(fs.readFileSync(auditFile, "utf-8")) as AuditEntry[];
}

afterEach(() => {
  delete process.env.FAHEEM_CUSTOM_AGENTS_PATH;
  delete process.env.FAHEEM_AUDIT_PATH;
});

function postRequest(body: unknown): Request {
  return new Request("http://localhost/api/agents", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function deleteRequest(body: unknown): Request {
  return new Request("http://localhost/api/agents", {
    method: "DELETE",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/agents", () => {
  it("creates an agent, persists it, and appends an audit entry", async () => {
    useTempStores();
    const res = await POST(
      postRequest({
        name: "Sector Screener",
        role: "Retail specialist",
        description: "Screens retail deals against the mandate criteria.",
      }),
    );
    expect(res.status).toBe(201);
    const json = (await res.json()) as { agent: CustomAgent };
    expect(json.agent.id).toBe("custom-sector-screener");
    expect(json.agent.name).toBe("Sector Screener");

    const stored = JSON.parse(
      fs.readFileSync(agentsFile, "utf-8"),
    ) as CustomAgent[];
    expect(stored).toHaveLength(1);
    expect(stored[0]?.id).toBe(json.agent.id);

    const audit = readAudit();
    expect(audit).toHaveLength(1);
    expect(audit[0]?.action).toBe("agent-created");
    expect(audit[0]?.question).toBe("Sector Screener · Retail specialist");
  });

  it("trims whitespace before validating/storing", async () => {
    useTempStores();
    const res = await POST(
      postRequest({
        name: "  Padded Name  ",
        role: "  Padded Role  ",
        description: "  Padded description text of sufficient length.  ",
      }),
    );
    expect(res.status).toBe(201);
    const json = (await res.json()) as { agent: CustomAgent };
    expect(json.agent.name).toBe("Padded Name");
    expect(json.agent.role).toBe("Padded Role");
    expect(json.agent.description).toBe(
      "Padded description text of sufficient length.",
    );
  });

  it("rejects an invalid body with 400 and writes no audit entry", async () => {
    useTempStores();
    const res = await POST(
      postRequest({ name: "A", role: "Role", description: "Too short desc" }),
    );
    expect(res.status).toBe(400);
    expect(readAudit()).toEqual([]);
  });

  it("rejects malformed JSON with 400", async () => {
    useTempStores();
    const res = await POST(
      new Request("http://localhost/api/agents", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{ not json",
      }),
    );
    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/agents", () => {
  it("removes an existing custom agent and appends an audit entry", async () => {
    useTempStores();
    const created = (await (
      await POST(
        postRequest({
          name: "Temp Agent",
          role: "Role",
          description: "An agent created only to be deleted in this test.",
        }),
      )
    ).json()) as { agent: CustomAgent };

    const res = await DELETE(deleteRequest({ id: created.agent.id }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });

    const stored = JSON.parse(
      fs.readFileSync(agentsFile, "utf-8"),
    ) as CustomAgent[];
    expect(stored).toEqual([]);

    const audit = readAudit();
    expect(audit.some((e) => e.action === "agent-deleted")).toBe(true);
  });

  it("404s for an unknown (but well-formed) custom- id", async () => {
    useTempStores();
    const res = await DELETE(deleteRequest({ id: "custom-does-not-exist" }));
    expect(res.status).toBe(404);
  });

  it("rejects an id that doesn't start with custom-", async () => {
    useTempStores();
    const res = await DELETE(deleteRequest({ id: "orchestrator" }));
    expect(res.status).toBe(400);
  });

  it("rejects malformed JSON with 400", async () => {
    useTempStores();
    const res = await DELETE(
      new Request("http://localhost/api/agents", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: "{ not json",
      }),
    );
    expect(res.status).toBe(400);
  });
});
