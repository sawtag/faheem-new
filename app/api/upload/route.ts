/**
 * POST /api/upload — accepts a single PDF (multipart `file` field), validates
 * it (magic bytes + size), saves it under data/uploads/, uploads it to the
 * Anthropic Files API server-side (via lib/ai/client.ts — AGENTS.md rule 10),
 * and registers it in the runtime upload registry. Returns the doc descriptor.
 *
 * Live-mode only: an uploaded doc's id makes a chat request uncacheable by
 * design, so uploads never touch the golden cache. No audit entry — the
 * AuditEntry contract has no fitting action, so uploads stay out of it.
 *
 * Client-safe, bilingual errors for every rejection (type / size / API).
 * `?lang=ar` selects the error language; `?workspace=<id>` scopes the doc.
 */
import { uploadPdf } from "@/lib/ai/client";
import {
  MAX_UPLOAD_BYTES,
  isPdfBytes,
  newUploadId,
  registerUpload,
  saveUploadFile,
  uploadToCorpusDoc,
  type UploadDoc,
} from "@/lib/uploads";
import type { Lang } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function pick(lang: Lang, en: string, ar: string): string {
  return lang === "ar" ? ar : en;
}

const errors = {
  empty: (l: Lang) => pick(l, "No file received.", "لم يتم استلام أي ملف."),
  type: (l: Lang) =>
    pick(l, "Only PDF files are supported.", "يُدعم رفع ملفات PDF فقط."),
  size: (l: Lang) =>
    pick(
      l,
      "This PDF is too large — 32 MB max.",
      "حجم ملف PDF كبير جدًا — الحد الأقصى 32 ميجابايت.",
    ),
  api: (l: Lang) =>
    pick(
      l,
      "Couldn't process the document. Please try again.",
      "تعذّرت معالجة المستند. يُرجى المحاولة مرة أخرى.",
    ),
};

/** Filename → readable title: drop the extension, tidy separators, cap length. */
function titleFromFilename(name: string): string {
  const base = name
    .replace(/\.pdf$/i, "")
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return (base || "Uploaded document").slice(0, 120);
}

export async function POST(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const lang: Lang = url.searchParams.get("lang") === "ar" ? "ar" : "en";
  const workspace = url.searchParams.get("workspace") || undefined;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: errors.empty(lang) }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: errors.empty(lang) }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  if (bytes.byteLength === 0) {
    return Response.json({ error: errors.empty(lang) }, { status: 400 });
  }
  if (bytes.byteLength > MAX_UPLOAD_BYTES) {
    return Response.json({ error: errors.size(lang) }, { status: 413 });
  }
  if (!isPdfBytes(bytes)) {
    return Response.json({ error: errors.type(lang) }, { status: 415 });
  }

  const id = newUploadId();
  const sizeMB = Math.max(
    0.01,
    Math.round((bytes.byteLength / 1_048_576) * 100) / 100,
  );

  // Persist to disk first — the viewer serves from here even with no fileId.
  saveUploadFile(id, bytes);

  // Files API upload (server-only). null → no API key (offline demo): the doc is
  // still viewable + attachable, but grounded live chat needs a fileId.
  let fileId: string | null;
  try {
    fileId = await uploadPdf(bytes, `${id}.pdf`);
  } catch (err) {
    console.error("[faheem] Files API upload failed:", err);
    return Response.json({ error: errors.api(lang) }, { status: 502 });
  }

  const doc: UploadDoc = {
    id,
    title: titleFromFilename(file.name),
    sizeMB,
    ...(workspace ? { workspace } : {}),
    ...(fileId ? { fileId } : {}),
    uploadedAt: new Date().toISOString(),
  };
  registerUpload(doc);

  return Response.json({ doc: uploadToCorpusDoc(doc) }, { status: 201 });
}
