import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { DELETE, POST } from "@/app/api/skills/route";
import type { AuditEntry } from "@/lib/types";
import type { CustomSkill } from "@/lib/custom-skills";

let skillsFile: string;
let auditFile: string;

function useTempStores(): void {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "faheem-skills-api-"));
  skillsFile = path.join(dir, "custom-skills.json");
  auditFile = path.join(dir, "audit-log.json");
  process.env.FAHEEM_CUSTOM_SKILLS_PATH = skillsFile;
  process.env.FAHEEM_AUDIT_PATH = auditFile;
}

function readAudit(): AuditEntry[] {
  if (!fs.existsSync(auditFile)) return [];
  return JSON.parse(fs.readFileSync(auditFile, "utf-8")) as AuditEntry[];
}

afterEach(() => {
  delete process.env.FAHEEM_CUSTOM_SKILLS_PATH;
  delete process.env.FAHEEM_AUDIT_PATH;
});

function postRequest(body: unknown): Request {
  return new Request("http://localhost/api/skills", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function deleteRequest(body: unknown): Request {
  return new Request("http://localhost/api/skills", {
    method: "DELETE",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/skills", () => {
  it("creates a skill, persists it, and appends an audit entry", async () => {
    useTempStores();
    const res = await POST(
      postRequest({
        name: "Working-Capital Sweep",
        category: "diligence",
        description: "Flags unusual swings in working-capital line items.",
        prefill: "Walk through the working-capital movements for this deal.",
      }),
    );
    expect(res.status).toBe(201);
    const json = (await res.json()) as { skill: CustomSkill };
    expect(json.skill.id).toBe("custom-working-capital-sweep");
    expect(json.skill.name).toBe("Working-Capital Sweep");
    expect(json.skill.category).toBe("diligence");

    const stored = JSON.parse(
      fs.readFileSync(skillsFile, "utf-8"),
    ) as CustomSkill[];
    expect(stored).toHaveLength(1);
    expect(stored[0]?.id).toBe(json.skill.id);

    const audit = readAudit();
    expect(audit).toHaveLength(1);
    expect(audit[0]?.action).toBe("skill-created");
    expect(audit[0]?.question).toBe("Working-Capital Sweep · diligence");
  });

  it("trims whitespace before validating/storing", async () => {
    useTempStores();
    const res = await POST(
      postRequest({
        name: "  Padded Name  ",
        category: "output",
        description: "  Padded description text of sufficient length.  ",
        prefill: "  Padded prefill text of sufficient length to pass.  ",
      }),
    );
    expect(res.status).toBe(201);
    const json = (await res.json()) as { skill: CustomSkill };
    expect(json.skill.name).toBe("Padded Name");
    expect(json.skill.description).toBe(
      "Padded description text of sufficient length.",
    );
    expect(json.skill.prefill).toBe(
      "Padded prefill text of sufficient length to pass.",
    );
  });

  it("rejects an invalid category with 400 and writes no audit entry", async () => {
    useTempStores();
    const res = await POST(
      postRequest({
        name: "A Skill",
        category: "not-a-real-category",
        description: "A description that is definitely long enough.",
        prefill: "A prefill that is definitely long enough to pass here.",
      }),
    );
    expect(res.status).toBe(400);
    expect(readAudit()).toEqual([]);
  });

  it("rejects an otherwise invalid body (too-short description) with 400", async () => {
    useTempStores();
    const res = await POST(
      postRequest({
        name: "A Skill",
        category: "valuation",
        description: "short",
        prefill: "A prefill that is definitely long enough to pass here.",
      }),
    );
    expect(res.status).toBe(400);
    expect(readAudit()).toEqual([]);
  });

  it("rejects malformed JSON with 400", async () => {
    useTempStores();
    const res = await POST(
      new Request("http://localhost/api/skills", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{ not json",
      }),
    );
    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/skills", () => {
  it("removes an existing custom skill and appends an audit entry", async () => {
    useTempStores();
    const created = (await (
      await POST(
        postRequest({
          name: "Temp Skill",
          category: "output",
          description: "A skill created only to be deleted in this test.",
          prefill: "A prefill that is definitely long enough to pass here.",
        }),
      )
    ).json()) as { skill: CustomSkill };

    const res = await DELETE(deleteRequest({ id: created.skill.id }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });

    const stored = JSON.parse(
      fs.readFileSync(skillsFile, "utf-8"),
    ) as CustomSkill[];
    expect(stored).toEqual([]);

    const audit = readAudit();
    expect(audit.some((e) => e.action === "skill-deleted")).toBe(true);
  });

  it("404s for an unknown (but well-formed) custom- id", async () => {
    useTempStores();
    const res = await DELETE(deleteRequest({ id: "custom-does-not-exist" }));
    expect(res.status).toBe(404);
  });

  it("rejects an id that doesn't start with custom-", async () => {
    useTempStores();
    const res = await DELETE(deleteRequest({ id: "dcf-fcff" }));
    expect(res.status).toBe(400);
  });

  it("rejects malformed JSON with 400", async () => {
    useTempStores();
    const res = await DELETE(
      new Request("http://localhost/api/skills", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: "{ not json",
      }),
    );
    expect(res.status).toBe(400);
  });
});
