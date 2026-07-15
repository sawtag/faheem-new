/**
 * Deliverables-beat detector (P5a), a cheap exact-text match against the
 * "deliverables" golden-questions.json entry. ChatView's submit path checks
 * this BEFORE hitting /api/chat: an exact match renders GenerationPanel
 * inline instead of streaming an answer (task 4). Matching is exact/trimmed,
 * same guarantee the cache-key spec relies on, the demo palette always
 * inserts this precise string, so a real presenter never free-types it.
 */
import { goldenQuestionById } from "@/lib/demo/golden-questions";

export function isDeliverablesQuestion(question: string): boolean {
  const entry = goldenQuestionById("deliverables");
  return entry != null && question.trim() === entry.request.question.trim();
}
