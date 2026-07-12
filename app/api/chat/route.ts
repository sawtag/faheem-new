/**
 * POST /api/chat — validates a ChatRequest and streams the SSE engine output.
 * Counts real citation events and appends one audit entry after the stream
 * completes (feeds the Audit Trail panel). Mode is resolved from the
 * `faheem_mode` cookie (the on-stage panic switch) inside the engine.
 */
import { chatEventStream, serializeEvent } from "@/lib/ai/sse";
import { contextKey } from "@/lib/ai/cache";
import { appendAudit } from "@/lib/audit";
import { ChatRequestSchema } from "@/lib/types";

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

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
