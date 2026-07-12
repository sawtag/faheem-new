/**
 * Pure reduction of an SSEEvent stream into the chat answer view-model. One
 * path serves both live streaming (events accumulate, re-reduced per frame) and
 * seeded/cached history (a static events array). Kept React-free so it is unit-
 * testable in isolation (tests/chat/reduce.test.ts).
 */
import type { AgentId, SSEEvent } from "@/lib/types";

export interface CitationRef {
  n: number;
  docId: string;
  page: number;
  quote: string;
}

export interface StageRow {
  agent: AgentId;
  docIds: string[];
  done: boolean;
}

export interface AnswerView {
  stageRows: StageRow[];
  agentCount: number;
  /** accumulated answer text, still carrying `[[n]]` citation markers */
  text: string;
  citations: CitationRef[];
  done: boolean;
  cached: boolean;
  error?: string;
}

export function reduceEvents(events: SSEEvent[]): AnswerView {
  const order: AgentId[] = [];
  const stages = new Map<AgentId, StageRow>();
  const citations: CitationRef[] = [];
  let text = "";
  let done = false;
  let cached = false;
  let error: string | undefined;

  for (const e of events) {
    switch (e.type) {
      case "stage": {
        let row = stages.get(e.agent);
        if (!row) {
          row = { agent: e.agent, docIds: e.docIds ?? [], done: false };
          stages.set(e.agent, row);
          order.push(e.agent);
        }
        if (e.docIds && e.docIds.length > 0) row.docIds = e.docIds;
        if (e.status === "done") row.done = true;
        break;
      }
      case "delta":
        text += e.text;
        break;
      case "citation":
        citations.push({
          n: e.n,
          docId: e.docId,
          page: e.page,
          quote: e.quote,
        });
        break;
      case "done":
        done = true;
        cached = e.cached;
        break;
      case "error":
        error = e.message;
        break;
    }
  }

  const stageRows = order.map((a) => stages.get(a)!);
  return {
    stageRows,
    agentCount: stageRows.length,
    text,
    citations,
    done,
    cached,
    error,
  };
}

/** Marker-number → citation lookup for inline chip resolution. */
export function citationMap(cs: CitationRef[]): Map<number, CitationRef> {
  return new Map(cs.map((c) => [c.n, c]));
}
