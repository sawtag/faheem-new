/**
 * GET /api/documents/[id], streams a PDF by id, feeding the react-pdf viewer's
 * deep-links. Two sources, checked in order:
 *   1. the verified corpus manifest → data/corpus/<file>
 *   2. the runtime upload registry → data/uploads/<upload-id>.pdf
 * 404 for anything else. Path-traversal-safe on both paths (the corpus file must
 * resolve under data/corpus; the upload id is hex-shape validated).
 */
import fs from "node:fs";
import path from "node:path";
import { loadManifest } from "@/lib/ai/corpus";
import { getUpload, uploadFilePath } from "@/lib/uploads";

export const runtime = "nodejs";

function pdfResponse(data: Buffer, id: string): Response {
  const body = new Uint8Array(data);
  return new Response(body, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(body.byteLength),
      "Cache-Control": "public, max-age=3600, immutable",
      "Content-Disposition": `inline; filename="${id}.pdf"`,
    },
  });
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;

  // 1. Verified corpus doc.
  const doc = loadManifest().find((d) => d.id === id);
  if (doc) {
    const corpusDir = path.join(process.cwd(), "data/corpus");
    const absolute = path.join(process.cwd(), doc.path);
    if (absolute.startsWith(corpusDir + path.sep)) {
      try {
        return pdfResponse(await fs.promises.readFile(absolute), id);
      } catch {
        return new Response("Not found", { status: 404 });
      }
    }
    return new Response("Not found", { status: 404 });
  }

  // 2. Runtime uploaded doc (registry + hex-validated path).
  if (getUpload(id)) {
    const absolute = uploadFilePath(id);
    if (absolute) {
      try {
        return pdfResponse(await fs.promises.readFile(absolute), id);
      } catch {
        return new Response("Not found", { status: 404 });
      }
    }
  }

  return new Response("Not found", { status: 404 });
}
