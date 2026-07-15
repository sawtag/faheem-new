/**
 * Client SSE reader for POST /api/chat. Parses `data: <json>` frames (blank-line
 * separated per the SSE contract) into SSEEvents and hands each to `onEvent`.
 * Cancellation is the caller's AbortController (the composer's stop button).
 *
 * P5a: also publishes a `done` event's `cached` flag onto the mode-bus, the
 * one place every chat surface (ChatView, IcChatPanel) funnels through, so
 * the stage-only ⌘. mode overlay can show "last response: cached/live"
 * without either surface wiring it by hand.
 */
import { SSEEventSchema, type ChatRequest, type SSEEvent } from "@/lib/types";
import { publishLastResponseCached } from "@/lib/demo/mode-bus";

export async function streamChat(
  req: ChatRequest,
  signal: AbortSignal,
  onEvent: (event: SSEEvent) => void,
): Promise<void> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(req),
    signal,
  });
  if (!res.body) return;

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = buffer.indexOf("\n\n")) !== -1) {
      const frame = buffer.slice(0, idx).trim();
      buffer = buffer.slice(idx + 2);
      if (!frame.startsWith("data:")) continue;
      const json = frame.slice(frame.indexOf(":") + 1).trim();
      try {
        const parsed = SSEEventSchema.safeParse(JSON.parse(json));
        if (parsed.success) {
          if (parsed.data.type === "done") {
            publishLastResponseCached(parsed.data.cached);
          }
          onEvent(parsed.data);
        }
      } catch {
        /* skip a malformed frame */
      }
    }
  }
}
