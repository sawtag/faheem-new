/**
 * POST /api/chat, validates a ChatRequest and streams the SSE engine output.
 * Counts real citation events and appends one audit entry after the stream
 * completes (feeds the Audit Trail panel). Mode is resolved from the
 * `faheem_mode` cookie (the on-stage panic switch) inside the engine.
 */
import { chatEventStream, serializeEvent } from "@/lib/ai/sse";
import { contextKey } from "@/lib/ai/cache";
import { resolveMode } from "@/lib/ai/mode";
import { isUploadId } from "@/lib/uploads";
import { appendAudit } from "@/lib/audit";
import { ChatRequestSchema, type Lang } from "@/lib/types";

const EVENT_STREAM_HEADERS = {
  "Content-Type": "text/event-stream; charset=utf-8",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
} as const;

/** Uploaded docs are live-mode only, cached mode can never have a recording. */
function uploadInCachedMessage(lang: Lang): string {
  return lang === "ar"
    ? "المستندات المرفوعة متاحة في الوضع المباشر فقط. بدّل إلى الوضع المباشر (⌘.) للسؤال عن مستند مرفوع."
    : "Uploaded documents work in live mode only. Switch to live mode (⌘.) to ask about an uploaded document.";
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function readCookie(request: Request, name: string): string | undefined {
  const header = request.headers.get("cookie");
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === name) {
      return decodeURIComponent(part.slice(eq + 1).trim());
    }
  }
  return undefined;
}

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = ChatRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid chat request", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const req = parsed.data;
  const cookieMode = readCookie(request, "faheem_mode");

  // Cached mode must never attempt an uploaded doc: its id makes the request
  // uncacheable, so no recording can exist. Surface a calm, bilingual
  // "switch to live (⌘.)" instead of the generic ⌘K-palette hint, and never
  // reach the engine (no API call, no audit).
  if (
    resolveMode(cookieMode) === "cached" &&
    (req.docIds ?? []).some(isUploadId)
  ) {
    return new Response(
      serializeEvent({
        type: "error",
        message: uploadInCachedMessage(req.lang),
      }),
      { headers: EVENT_STREAM_HEADERS },
    );
  }

  const encoder = new TextEncoder();
  let citationCount = 0;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of chatEventStream(req, { cookieMode })) {
          if (event.type === "citation") citationCount += 1;
          controller.enqueue(encoder.encode(serializeEvent(event)));
        }
      } catch {
        controller.enqueue(
          encoder.encode(
            serializeEvent({
              type: "error",
              message: "Unexpected engine error.",
            }),
          ),
        );
      } finally {
        appendAudit({
          ts: new Date().toISOString(),
          user: "Ali",
          context: contextKey(req.context),
          action: "question",
          question: req.question,
          citationCount,
        });
        controller.close();
      }
    },
  });

  return new Response(stream, { headers: EVENT_STREAM_HEADERS });
}
