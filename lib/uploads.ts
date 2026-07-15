/**
 * Runtime PDF-upload registry, the storage layer behind "upload any PDF and
 * ask about it". Uploaded files live under data/uploads/ (gitignored, runtime
 * only): one `<id>.pdf` per upload plus a `registry.json` manifest of metadata.
 * Nothing here ever enters git and the 14-doc verified corpus is untouched.
 *
 * These docs are LIVE-MODE ONLY: their ids make a chat request uncacheable by
 * design (cacheKey folds in docIds), so they never collide with the golden
 * cache. FAHEEM_UPLOAD_DIR overrides the storage root (used by tests).
 */
import { randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import type { CorpusDoc } from "@/lib/types";

/** Upload ids are `upload-` + 8 lowercase hex, the shape is the traversal guard. */
export const UPLOAD_ID_RE = /^upload-[0-9a-f]{8}$/;

/** PDF magic bytes: `%PDF-`. */
const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46, 0x2d];

/** 32 MB, the same ceiling the client pre-checks against. */
export const MAX_UPLOAD_BYTES = 32 * 1024 * 1024;

export const UploadDocSchema = z.object({
  id: z.string().regex(UPLOAD_ID_RE),
  /** derived from the original filename */
  title: z.string(),
  sizeMB: z.number().positive(),
  /** deal-workspace scoping, e.g. "jahez", absent for firm/ic uploads */
  workspace: z.string().optional(),
  /** Anthropic Files API id; absent when uploaded with no API key (offline demo) */
  fileId: z.string().optional(),
  uploadedAt: z.string(),
});
export type UploadDoc = z.infer<typeof UploadDocSchema>;

export function isUploadId(id: string): boolean {
  return UPLOAD_ID_RE.test(id);
}

export function newUploadId(): string {
  return `upload-${randomBytes(4).toString("hex")}`;
}

/** True when the first bytes are the `%PDF-` signature. */
export function isPdfBytes(bytes: Uint8Array): boolean {
  if (bytes.length < PDF_MAGIC.length) return false;
  return PDF_MAGIC.every((b, i) => bytes[i] === b);
}

function uploadsDir(): string {
  return (
    process.env.FAHEEM_UPLOAD_DIR || path.join(process.cwd(), "data/uploads")
  );
}

function registryPath(): string {
  return path.join(uploadsDir(), "registry.json");
}

/** Absolute path to an upload's PDF, or null when the id is not a safe upload id. */
export function uploadFilePath(id: string): string | null {
  if (!isUploadId(id)) return null;
  return path.join(uploadsDir(), `${id}.pdf`);
}

/** All registered uploads; `[]` when the registry is missing or corrupt. */
export function listUploads(): UploadDoc[] {
  const file = registryPath();
  if (!fs.existsSync(file)) return [];
  try {
    const parsed = UploadDocSchema.array().safeParse(
      JSON.parse(fs.readFileSync(file, "utf-8")),
    );
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

export function getUpload(id: string): UploadDoc | null {
  if (!isUploadId(id)) return null;
  return listUploads().find((u) => u.id === id) ?? null;
}

export function saveUploadFile(id: string, bytes: Buffer): void {
  const abs = uploadFilePath(id);
  if (!abs) throw new Error(`unsafe upload id: ${id}`);
  fs.mkdirSync(uploadsDir(), { recursive: true });
  fs.writeFileSync(abs, bytes);
}

/** Append-or-replace a registry entry. Atomic: write-temp → rename. */
export function registerUpload(doc: UploadDoc): void {
  const dir = uploadsDir();
  fs.mkdirSync(dir, { recursive: true });
  const entries = listUploads().filter((u) => u.id !== doc.id);
  entries.push(doc);
  const file = registryPath();
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(entries, null, 2) + "\n");
  fs.renameSync(tmp, file);
}

/**
 * CorpusDoc-shaped view of an upload for the chat engine, the session doc
 * blocks + citation index mapping speak CorpusDoc. `path` is never read (session
 * blocks always reference the Files API `file_id`); `pages` is a placeholder
 * (the viewer paginates from the real PDF).
 */
export function uploadToCorpusDoc(u: UploadDoc): CorpusDoc {
  return {
    id: u.id,
    title: { en: u.title, ar: u.title },
    path: "",
    pages: 1,
    sizeMB: u.sizeMB,
    type: "deal",
    ...(u.workspace ? { workspace: u.workspace } : {}),
    ...(u.fileId ? { fileId: u.fileId } : {}),
  };
}
