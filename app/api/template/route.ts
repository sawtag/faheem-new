/**
 * POST /api/template — upload the firm's company IC-memo Word template
 * (multipart `file` field, single slot — replaces any existing template).
 * Validates size, ZIP magic bytes, `.docx` filename, and that docxtemplater
 * can actually parse it (inspectTemplateTags), each with a stable `error`
 * code string so the client can render the matching i18n message. On success:
 * saves (lib/company-template.ts), audits "template-uploaded", returns the
 * meta 201.
 *
 * DELETE /api/template — removes the template (no body); 404 when none
 * exists; audits "template-removed"; `{ ok: true }`.
 */
import {
  getCompanyTemplateMeta,
  removeCompanyTemplate,
  saveCompanyTemplate,
} from "@/lib/company-template";
import {
  inspectTemplateTags,
  TemplateParseError,
} from "@/lib/generate/template";
import { appendAudit } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_TEMPLATE_BYTES = 10 * 1024 * 1024;
const ZIP_MAGIC = [0x50, 0x4b, 0x03, 0x04]; // "PK\x03\x04"

function isZipBytes(bytes: Uint8Array): boolean {
  if (bytes.length < ZIP_MAGIC.length) return false;
  return ZIP_MAGIC.every((b, i) => bytes[i] === b);
}

export async function POST(request: Request): Promise<Response> {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: "type" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "type" }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  if (bytes.byteLength === 0) {
    return Response.json({ error: "type" }, { status: 400 });
  }
  if (bytes.byteLength > MAX_TEMPLATE_BYTES) {
    return Response.json({ error: "size" }, { status: 400 });
  }
  if (!file.name.toLowerCase().endsWith(".docx") || !isZipBytes(bytes)) {
    return Response.json({ error: "type" }, { status: 400 });
  }

  let inspection: { found: string[]; unknown: string[] };
  try {
    inspection = inspectTemplateTags(bytes);
  } catch (err) {
    if (err instanceof TemplateParseError) {
      return Response.json({ error: "unreadable" }, { status: 400 });
    }
    throw err;
  }

  const meta = saveCompanyTemplate(file.name, bytes, inspection);
  appendAudit({
    ts: new Date().toISOString(),
    user: "Ali",
    context: "firm",
    action: "template-uploaded",
    question: file.name,
  });

  return Response.json({ meta }, { status: 201 });
}

export async function DELETE(): Promise<Response> {
  const before = getCompanyTemplateMeta();
  if (!before || !removeCompanyTemplate()) {
    return Response.json({ error: "Template not found" }, { status: 404 });
  }

  appendAudit({
    ts: new Date().toISOString(),
    user: "Ali",
    context: "firm",
    action: "template-removed",
    question: before.fileName,
  });

  return Response.json({ ok: true });
}
