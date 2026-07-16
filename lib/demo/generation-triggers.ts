/**
 * Generation-trigger registry (P5a, extended), the cheap exact-text map that
 * tells ChatView's submit path to render a choreographed GenerationPanel turn
 * instead of streaming a /api/chat answer. Each entry maps a golden-question
 * id to the {workspace, artifact} the panel should generate; matching is
 * exact/trimmed against the golden entry's `request.question` (same guarantee
 * the old isDeliverablesQuestion had, so the demo palette's precise insert
 * always hits and a presenter never free-types a miss).
 */
import { goldenQuestionById } from "@/lib/demo/golden-questions";
import type { ArtifactKind } from "@/components/generate/protocol";

export interface GenerationTrigger {
  workspace: string;
  /** "all" runs the three Jahez deliverables; a single kind runs just that one. */
  artifact: "all" | ArtifactKind;
}

/** golden-question id → what the generation turn builds. */
const TRIGGERS: Record<string, GenerationTrigger> = {
  deliverables: { workspace: "jahez", artifact: "all" },
  "darb-memo": { workspace: "darb", artifact: "docx" },
  "dcf-scenarios": { workspace: "jahez", artifact: "xlsx" },
  "committee-deck": { workspace: "jahez", artifact: "pptx" },
};

/** Exact-trimmed match against the registered golden entries' recorded text. */
export function matchGenerationTrigger(
  question: string,
): GenerationTrigger | null {
  const q = question.trim();
  for (const [id, trigger] of Object.entries(TRIGGERS)) {
    const entry = goldenQuestionById(id);
    if (entry && entry.request.question.trim() === q) return trigger;
  }
  return null;
}
