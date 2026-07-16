/**
 * Client SSE reader for POST /api/generate/[artifact]. Mirrors
 * components/chat/stream.ts's frame parsing exactly (blank-line separated
 * `data: <json>` frames) against the local GenerateEvent protocol.
 */
import type {
  ArtifactKind,
  GenerateEvent,
} from "@/components/generate/protocol";

export async function streamGenerate(
  artifact: ArtifactKind | "all",
  workspace: string,
  signal: AbortSignal,
  onEvent: (event: GenerateEvent) => void,
): Promise<void> {
  const res = await fetch(
    `/api/generate/${artifact}?workspace=${encodeURIComponent(workspace)}`,
    { method: "POST", signal },
  );
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
        onEvent(JSON.parse(json) as GenerateEvent);
      } catch {
        /* skip a malformed frame */
      }
    }
  }
}
