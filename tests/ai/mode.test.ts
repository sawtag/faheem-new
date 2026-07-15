import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { cacheKey } from "@/lib/ai/cache";
import type {
  FaheemClient,
  MessageStreamParams,
  StreamEvent,
} from "@/lib/ai/client";
import { replay, resolveMode } from "@/lib/ai/mode";
import { chatEventStream } from "@/lib/ai/sse";
import type { CacheEntry, ChatRequest, SSEEvent } from "@/lib/types";

async function collect(gen: AsyncGenerator<SSEEvent>): Promise<SSEEvent[]> {
  const out: SSEEvent[] = [];
  for await (const e of gen) out.push(e);
  return out;
}

afterEach(() => {
  delete process.env.FAHEEM_CACHE_DIR;
});

describe("mode resolution", () => {
  it("smart default honors FAHEEM_ANTHROPIC_KEY as a key alias; cookie still wins", () => {
    const saved = {
      mode: process.env.FAHEEM_MODE,
      key: process.env.ANTHROPIC_API_KEY,
      alias: process.env.FAHEEM_ANTHROPIC_KEY,
    };
    delete process.env.FAHEEM_MODE;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.FAHEEM_ANTHROPIC_KEY;
    try {
      expect(resolveMode(undefined)).toBe("cached");
      process.env.FAHEEM_ANTHROPIC_KEY = "sk-test";
      expect(resolveMode(undefined)).toBe("auto");
      expect(resolveMode("cached")).toBe("cached");
    } finally {
      if (saved.mode !== undefined) process.env.FAHEEM_MODE = saved.mode;
      if (saved.key !== undefined) process.env.ANTHROPIC_API_KEY = saved.key;
      if (saved.alias !== undefined)
        process.env.FAHEEM_ANTHROPIC_KEY = saved.alias;
      else delete process.env.FAHEEM_ANTHROPIC_KEY;
    }
  });
});

describe("cached replay", () => {
  it("preserves event order but rewrites the terminal done to cached:true", async () => {
    // Real recordings store `done.cached:false` (captured live); a replay is
    // served from cache, so the terminal done must surface cached:true.
    const entry: CacheEntry = {
      key: "k",
      request: { question: "q", lang: "en", context: { kind: "firm" } },
      events: [
        { type: "stage", agent: "research", status: "start" },
        { type: "delta", text: "Net income " },
        { type: "delta", text: "compressed 61%" },
        { type: "delta", text: "[[1]]" },
        { type: "citation", n: 1, docId: "fy25-er", page: 3, quote: "..." },
        { type: "done", cached: false },
      ],
      recordedAt: new Date().toISOString(),
    };
    const out = await collect(replay(entry, 0));
    // every event but the last passes through byte-for-byte, in order
    expect(out.slice(0, -1)).toEqual(entry.events.slice(0, -1));
    expect(out.at(-1)).toEqual({ type: "done", cached: true });
  });
});

describe("auto mode", () => {
  it("falls back to cache on a first-token timeout", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "faheem-cache-"));
    process.env.FAHEEM_CACHE_DIR = dir;
    try {
      const req: ChatRequest = {
        question: "slow one",
        lang: "en",
        context: { kind: "firm" },
      };
      const entry: CacheEntry = {
        key: cacheKey(req),
        request: req,
        events: [
          { type: "delta", text: "cached answer" },
          { type: "done", cached: true },
        ],
        recordedAt: new Date().toISOString(),
      };
      fs.writeFileSync(
        path.join(dir, `${entry.key}.json`),
        JSON.stringify(entry),
      );

      const neverStream: FaheemClient = {
        beta: {
          messages: {
            stream: () => ({
              [Symbol.asyncIterator](): AsyncIterator<StreamEvent> {
                return {
                  next: () =>
                    new Promise<IteratorResult<StreamEvent>>(() => {}),
                };
              },
            }),
          },
        },
        messages: { create: async () => ({ content: [] }) },
      };

      const out = await collect(
        chatEventStream(req, {
          client: neverStream,
          configOverride: {
            mode: "auto",
            timeoutMs: 20,
            replayDelayMs: 0,
            stageStepMs: 0,
          },
          readFileBytes: () => Buffer.from("x"),
        }),
      );
      expect(out).toEqual(entry.events);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("live path", () => {
  it("passes correct doc blocks to the SDK (order, cache_control, citations, betas)", async () => {
    let captured: MessageStreamParams | undefined;
    const textStream = (): AsyncIterable<StreamEvent> => ({
      async *[Symbol.asyncIterator]() {
        yield { type: "content_block_start", index: 0 };
        yield {
          type: "content_block_delta",
          index: 0,
          delta: { type: "text_delta", text: "The hurdle is 15%." },
        };
        yield { type: "content_block_stop", index: 0 };
        yield { type: "message_stop" };
      },
    });
    const capturing: FaheemClient = {
      beta: {
        messages: {
          stream: (p) => {
            captured = p;
            return textStream();
          },
        },
      },
      messages: { create: async () => ({ content: [] }) },
    };

    const req: ChatRequest = {
      question: "What is Lunar's IRR hurdle?",
      lang: "en",
      context: { kind: "firm" },
    };
    await collect(
      chatEventStream(req, {
        client: capturing,
        configOverride: { mode: "live", stageStepMs: 0 },
        readFileBytes: () => Buffer.from("%PDF fake"),
      }),
    );

    expect(captured).toBeDefined();
    const p = captured!;
    expect(p.model).toBe("claude-opus-4-8");
    expect(p.betas).toContain("files-api-2025-04-14");
    expect(p.thinking).toEqual({ type: "adaptive" });

    const content = (p.messages[0] as { content: unknown[] }).content;
    expect(content[content.length - 1]).toEqual({
      type: "text",
      text: req.question,
    });

    const docBlocks = content.slice(0, -1) as Record<string, unknown>[];
    // firm context = 5 docs (lunar + packs)
    expect(docBlocks).toHaveLength(5);
    docBlocks.forEach((block, i) => {
      expect(block.type).toBe("document");
      expect(block.citations).toEqual({ enabled: true });
      // The corpus is uploaded (manifest carries fileIds), so blocks reference
      // the Files API; base64 is only the no-fileId fallback.
      const source = block.source as { type: string; file_id?: string };
      expect(source.type).toBe("file");
      expect(source.file_id).toBeTruthy();
      if (i < docBlocks.length - 1) {
        expect(block.cache_control).toBeUndefined();
      } else {
        expect(block.cache_control).toEqual({ type: "ephemeral", ttl: "1h" });
      }
    });
  });
});
