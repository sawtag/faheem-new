// @vitest-environment node
// Exercises the server template route: multipart FormData + File must come
// from the same (undici) realm the route's `instanceof File` check uses —
// same caveat as tests/api/upload.test.ts.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { afterEach, describe, expect, it } from "vitest";
import { DELETE, POST } from "@/app/api/template/route";
import type { AuditEntry } from "@/lib/types";
import type { CompanyTemplateMeta } from "@/lib/company-template";

let dir: string;

function useTempStores(): void {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "faheem-template-api-"));
  process.env.FAHEEM_COMPANY_TEMPLATE_DIR = dir;
  process.env.FAHEEM_AUDIT_PATH = path.join(dir, "audit-log.json");
}

afterEach(() => {
  delete process.env.FAHEEM_COMPANY_TEMPLATE_DIR;
  delete process.env.FAHEEM_AUDIT_PATH;
  if (dir) fs.rmSync(dir, { recursive: true, force: true });
});

function readAudit(): AuditEntry[] {
  const file = process.env.FAHEEM_AUDIT_PATH!;
  if (!fs.existsSync(file)) return [];
  return JSON.parse(fs.readFileSync(file, "utf-8")) as AuditEntry[];
}

async function tinyTaggedDocx(): Promise<Buffer> {
  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            children: [new TextRun("Target: {{perShare}} — {{wacc}}")],
          }),
        ],
      },
    ],
  });
  return Packer.toBuffer(doc);
}

function uploadRequest(bytes: Buffer, filename: string): Request {
  const body = new FormData();
  body.append(
    "file",
    new File([new Uint8Array(bytes)], filename, {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    }),
  );
  return new Request("http://localhost/api/template", {
    method: "POST",
    body,
  });
}

describe("POST /api/template — validation", () => {
  it("rejects a missing file with 400 (type)", async () => {
    useTempStores();
    const res = await POST(
      new Request("http://localhost/api/template", {
        method: "POST",
        body: new FormData(),
      }),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("type");
  });

  it("rejects a non-zip file with 400 (type)", async () => {
    useTempStores();
    const res = await POST(
      uploadRequest(Buffer.from("not a zip at all"), "template.docx"),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("type");
  });

  it("rejects a non-.docx filename with 400 (type), even with zip magic bytes", async () => {
    useTempStores();
    const bytes = await tinyTaggedDocx();
    const res = await POST(uploadRequest(bytes, "template.pdf"));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("type");
  });

  it("rejects an oversized file with 400 (size)", async () => {
    useTempStores();
    const big = Buffer.concat([
      Buffer.from("PK\x03\x04"),
      Buffer.alloc(10 * 1024 * 1024 + 1, 0x20),
    ]);
    const res = await POST(uploadRequest(big, "big.docx"));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("size");
  });

  it("rejects a zip that isn't a parseable docx template with 400 (unreadable)", async () => {
    useTempStores();
    // valid zip magic + .docx name, but no word/document.xml docxtemplater can compile
    const bytes = Buffer.from("PK\x03\x04not a real docx payload");
    const res = await POST(uploadRequest(bytes, "template.docx"));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("unreadable");
  });
});

describe("POST /api/template — success", () => {
  it("saves the template, returns 201 + meta, and audits template-uploaded", async () => {
    useTempStores();
    const bytes = await tinyTaggedDocx();
    const res = await POST(uploadRequest(bytes, "Lunar-IC-Template.docx"));
    expect(res.status).toBe(201);

    const { meta } = (await res.json()) as { meta: CompanyTemplateMeta };
    expect(meta?.fileName).toBe("Lunar-IC-Template.docx");
    expect(meta?.found.sort()).toEqual(["perShare", "wacc"]);
    expect(meta?.unknown).toEqual([]);

    const audit = readAudit();
    expect(audit).toHaveLength(1);
    expect(audit[0]!.action).toBe("template-uploaded");
    expect(audit[0]!.question).toBe("Lunar-IC-Template.docx");
  });

  it("a second upload replaces the single slot", async () => {
    useTempStores();
    await POST(uploadRequest(await tinyTaggedDocx(), "first.docx"));
    const res = await POST(
      uploadRequest(await tinyTaggedDocx(), "second.docx"),
    );
    const { meta } = (await res.json()) as { meta: CompanyTemplateMeta };
    expect(meta?.fileName).toBe("second.docx");
    expect(readAudit()).toHaveLength(2);
  });
});

describe("DELETE /api/template", () => {
  it("404s when no template exists", async () => {
    useTempStores();
    const res = await DELETE();
    expect(res.status).toBe(404);
    expect(readAudit()).toEqual([]);
  });

  it("removes an existing template, audits template-removed, returns ok", async () => {
    useTempStores();
    await POST(uploadRequest(await tinyTaggedDocx(), "to-remove.docx"));

    const res = await DELETE();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });

    const audit = readAudit();
    expect(audit).toHaveLength(2);
    expect(audit[1]!.action).toBe("template-removed");
    expect(audit[1]!.question).toBe("to-remove.docx");

    // second delete is a 404 again — the slot is empty
    expect((await DELETE()).status).toBe(404);
  });
});
