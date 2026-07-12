import { describe, expect, it } from "vitest";
import type { FaheemClient, StreamEvent } from "@/lib/ai/client";
import { chatEventStream } from "@/lib/ai/sse";
import type { ChatRequest, SSEEvent } from "@/lib/types";

type StageEvent = Extract<SSEEvent, { type: "stage" }>;

/**
 * Stream with three text blocks; the middle block carries a page_location
 * citation into document_index 2 (→ lunar-ic-charter in firm context order).
 */
const citedStream = (): AsyncIterable<StreamEvent> => ({
  async *[Symbol.asyncIterator]() {
    yield { type: "content_block_start", index: 0 };
    yield {
      type: "content_block_delta",
      index: 0,
      delta: { type: "text_delta", text: "The FY2025 release shows " },
    };
    yield { type: "content_block_stop", index: 0 };

    yield { type: "content_block_start", index: 1 };
    yield {
      type: "content_block_delta",
      index: 1,
      delta: { type: "text_delta", text: "net income compressed 61%" },
    };
    yield {
      type: "content_block_delta",
      index: 1,
      delta: {
        type: "citations_delta",
        citation: {
          type: "page_location",
          cited_text: "  Net income decreased 61%.  ",
          document_index: 2,
          document_title: "Lunar IC Charter",
          start_page_number: 3,
          end_page_number: 4,
        },
      },
    };
    yield { type: "content_block_stop", index: 1 };

    yield { type: "content_block_start", index: 2 };
    yield {
      type: "content_block_delta",
      index: 2,
      delta: { type: "text_delta", text: " year over year." },
    };
    yield { type: "content_block_stop", index: 2 };
    yield { type: "message_stop" };
  },
});

describe("live SSE transform", () => {
  it("emits stages → deltas with [[n]] markers → citations → done", async () => {
    const client: FaheemClient = {
      beta: { messages: { stream: () => citedStream() } },
      messages: { create: async () => ({ content: [] }) },
    };
    const req: ChatRequest = {
      question: "why did net income fall?",
      lang: "en",
      context: { kind: "firm" },
    };

    const out: SSEEvent[] = [];
    for await (const e of chatEventStream(req, {
      client,
      configOverride: { mode: "live", stageStepMs: 0 },
      readFileBytes: () => Buffer.from("x"),
    })) {
      out.push(e);
    }

    // The leading run is entirely stage events.
    const firstNonStage = out.findIndex((e) => e.type !== "stage");
    expect(firstNonStage).toBeGreaterThan(0);
    expect(out.slice(0, firstNonStage).every((e) => e.type === "stage")).toBe(
      true,
    );

    // Firm choreography: orchestrator → research → doc-intel → compliance,
    // each start then done.
    const stages = out.filter((e): e is StageEvent => e.type === "stage");
    expect(stages.map((s) => `${s.agent}:${s.status}`)).toEqual([
      "orchestrator:start",
      "orchestrator:done",
      "research:start",
      "research:done",
      "doc-intel:start",
      "doc-intel:done",
      "compliance:start",
      "compliance:done",
    ]);

    // Exact answer sequence: marker n aligns with the citation n; docId resolved
    // via document_index=2 → lunar-ic-charter; page from start_page_number.
    const answer = out.filter((e) => e.type !== "stage");
    expect(answer).toEqual([
      { type: "delta", text: "The FY2025 release shows " },
      { type: "delta", text: "net income compressed 61%" },
      { type: "delta", text: "[[1]]" },
      {
        type: "citation",
        n: 1,
        docId: "lunar-ic-charter",
        page: 3,
        quote: "Net income decreased 61%.",
      },
      { type: "delta", text: " year over year." },
      { type: "done", cached: false },
    ]);
  });
});
