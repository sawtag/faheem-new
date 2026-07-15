/**
 * Generation SSE protocol, shared between the route (app/api/generate/[artifact])
 * and the client panel. Deliberately NOT part of lib/types.ts's SSEEvent union
 * (that's the chat contract, fable-owned): deliverable generation has a
 * different shape (per-artifact phase choreography + a final file payload), so
 * it gets its own small local protocol, loosely modeled on the chat one
 * (stage/done shapes) per T4.3's brief.
 */
import type { ArtifactMeta } from "@/lib/types";

/** Route order also drives the panel's three-row layout. */
export const ARTIFACT_KINDS = ["xlsx", "docx", "pptx"] as const;
export type ArtifactKind = (typeof ARTIFACT_KINDS)[number];

/** assembling model inputs → building the workbook/memo/deck → writing file. */
export type Phase = "assembling" | "building" | "writing";

export type GenerateEvent =
  | {
      type: "stage";
      artifact: ArtifactKind;
      phase: Phase;
      status: "start" | "done";
    }
  | {
      type: "artifact";
      artifact: ArtifactKind;
      meta: ArtifactMeta;
      sizeBytes: number;
    }
  | { type: "error"; artifact?: ArtifactKind; message: string }
  | { type: "done" };

export function serializeGenerateEvent(event: GenerateEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}
