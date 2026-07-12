/**
 * Pure reduction of a GenerateEvent stream into per-artifact row view-models.
 * React-free so it's trivially unit-testable (driven indirectly via
 * tests/generate/panel.test.tsx) and reusable if the panel ever needs to
 * replay a fixture (mirrors components/chat/reduce.ts's shape).
 */
import type { ArtifactMeta } from "@/lib/types";
import type {
  ArtifactKind,
  GenerateEvent,
  Phase,
} from "@/components/generate/protocol";

export interface ArtifactRow {
  kind: ArtifactKind;
  status: "pending" | "active" | "done" | "error";
  phase: Phase | null;
  meta: ArtifactMeta | null;
  sizeBytes: number | null;
  error: string | null;
}

export interface GenerateView {
  rows: ArtifactRow[];
  done: boolean;
}

function initialRows(kinds: readonly ArtifactKind[]): ArtifactRow[] {
  return kinds.map((kind) => ({
    kind,
    status: "pending",
    phase: null,
    meta: null,
    sizeBytes: null,
    error: null,
  }));
}

export function reduceGenerateEvents(
  kinds: readonly ArtifactKind[],
  events: GenerateEvent[],
): GenerateView {
  const rows = initialRows(kinds);
  const byKind = new Map(rows.map((r) => [r.kind, r]));
  let done = false;

  for (const event of events) {
    switch (event.type) {
      case "stage": {
        const row = byKind.get(event.artifact);
        if (!row) break;
        row.status = "active";
        row.phase = event.phase;
        break;
      }
      case "artifact": {
        const row = byKind.get(event.artifact);
        if (!row) break;
        row.status = "done";
        row.phase = null;
        row.meta = event.meta;
        row.sizeBytes = event.sizeBytes;
        break;
      }
      case "error": {
        if (!event.artifact) break;
        const row = byKind.get(event.artifact);
        if (!row) break;
        row.status = "error";
        row.error = event.message;
        break;
      }
      case "done":
        done = true;
        break;
    }
  }

  return { rows, done };
}
