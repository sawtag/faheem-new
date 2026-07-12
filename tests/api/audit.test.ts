import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { GET } from "@/app/api/audit/route";
import type { AuditEntry } from "@/lib/types";

let auditFile: string;

afterEach(() => {
  delete process.env.FAHEEM_AUDIT_PATH;
  if (auditFile && fs.existsSync(auditFile)) fs.rmSync(auditFile);
});

describe("GET /api/audit", () => {
  it("returns [] when the audit log file doesn't exist yet", async () => {
    auditFile = path.join(
      fs.mkdtempSync(path.join(os.tmpdir(), "faheem-audit-")),
      "missing.json",
    );
    process.env.FAHEEM_AUDIT_PATH = auditFile;

    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  it("returns the parsed entries when the file is valid", async () => {
    auditFile = path.join(
      fs.mkdtempSync(path.join(os.tmpdir(), "faheem-audit-")),
      "audit.json",
    );
    const entries: AuditEntry[] = [
      {
        ts: "2026-07-12T09:00:00Z",
        user: "Ali",
        context: "workspace:jahez",
        action: "question",
        question: "q",
        citationCount: 5,
      },
    ];
    fs.writeFileSync(auditFile, JSON.stringify(entries));
    process.env.FAHEEM_AUDIT_PATH = auditFile;

    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(entries);
  });

  it("500s on a schema-invalid file rather than silently dropping data", async () => {
    auditFile = path.join(
      fs.mkdtempSync(path.join(os.tmpdir(), "faheem-audit-")),
      "invalid.json",
    );
    fs.writeFileSync(auditFile, JSON.stringify([{ nope: true }]));
    process.env.FAHEEM_AUDIT_PATH = auditFile;

    const res = await GET();
    expect(res.status).toBe(500);
  });
});
