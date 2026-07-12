/**
 * GET /api/documents/[id] — streams a corpus PDF by manifest id. 404 for
 * unknown ids; path-traversal-safe (the id must resolve to a manifest doc whose
 * file lives under data/corpus). Feeds the react-pdf viewer's deep-links.
 */
import fs from "node:fs";
import path from "node:path";
import { loadManifest } from "@/lib/ai/corpus";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  const doc = loadManifest().find((d) => d.id === id);
  if (!doc) return new Response("Not found", { status: 404 });

  const corpusDir = path.join(process.cwd(), "data/corpus");
  const absolute = path.join(process.cwd(), doc.path);
  if (!absolute.startsWith(corpusDir + path.sep)) {
    return new Response("Not found", { status: 404 });
  }

  let data: Buffer;
  try {
    data = await fs.promises.readFile(absolute);
  } catch {
    return new Response("Not found", { status: 404 });
  }

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
