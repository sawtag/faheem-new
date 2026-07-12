/**
 * Client-side PDF-upload helper shared by the composer paperclip and the
 * Documents-tab drop-zone. Pure fetch + pre-check; all UI strings stay in the
 * components (next-intl), so this returns error CODES for the client pre-check
 * and the server's already-localized message for a failed POST.
 */
import type { CorpusDoc, Lang } from "@/lib/types";

export const MAX_UPLOAD_MB = 32;
const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;

/** Client-side gate before hitting the network. null → looks fine to send. */
export function precheckPdf(file: File): "onlyPdf" | "tooLarge" | null {
  const isPdf = /pdf/i.test(file.type) || /\.pdf$/i.test(file.name);
  if (!isPdf) return "onlyPdf";
  if (file.size > MAX_UPLOAD_BYTES) return "tooLarge";
  return null;
}

export type UploadResult =
  { ok: true; doc: CorpusDoc } | { ok: false; error: string | null };

/** POSTs one PDF to /api/upload; `error` is the server's localized message (or null on a network drop). */
export async function postUpload(
  file: File,
  opts: { lang: Lang; workspace?: string },
): Promise<UploadResult> {
  const qs = new URLSearchParams({ lang: opts.lang });
  if (opts.workspace) qs.set("workspace", opts.workspace);
  const body = new FormData();
  body.append("file", file);
  try {
    const res = await fetch(`/api/upload?${qs.toString()}`, {
      method: "POST",
      body,
    });
    const data = (await res.json().catch(() => ({}))) as {
      doc?: CorpusDoc;
      error?: string;
    };
    if (!res.ok || !data.doc) return { ok: false, error: data.error ?? null };
    return { ok: true, doc: data.doc };
  } catch {
    return { ok: false, error: null };
  }
}
