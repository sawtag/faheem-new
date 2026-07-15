/**
 * SSE chat engine: choreographed agent-stage events + the live-stream transform
 * (SDK stream → delta/citation SSEEvents) + the live/cached/auto mode logic.
 *
 * Live wire mapping: text deltas stream as `delta` events; at each cited text
 * block's end we append a `[[n]]` marker delta (n sequential) and emit the
 * matching `citation` event, docId resolved via `document_index` into the exact
 * doc order from corpus.ts, page from `start_page_number` (1-indexed), quote =
 * trimmed `cited_text` (≤200 chars). `done` carries `cached:false` for live.
 */
import { getAgent } from "@/lib/ai/agents";
import {
  getClient,
  getEffort,
  getModel,
  type FaheemClient,
  type MessageStreamParams,
  type PageLocationCitation,
  type StreamEvent,
} from "@/lib/ai/client";
import {
  buildCorpusContext,
  type CorpusContext,
  type FileReader,
} from "@/lib/ai/corpus";
import { cacheKey, readCacheEntry, writeCacheEntry } from "@/lib/ai/cache";
import { readModeConfig, replay, sleep, type ModeConfig } from "@/lib/ai/mode";
import { buildSystemPrompt, choreographyPlan } from "@/lib/ai/prompts";
import type {
  CacheEntry,
  ChatRequest,
  CorpusDoc,
  Lang,
  SSEEvent,
} from "@/lib/types";

export function serializeEvent(event: SSEEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

// ─────────────────────────── live model stream ───────────────────────────

function startModel(
  req: ChatRequest,
  ctx: CorpusContext,
  client: FaheemClient,
): AsyncIterable<StreamEvent> {
  const effort = getEffort();
  const params: MessageStreamParams = {
    model: getModel(),
    max_tokens: 16000,
    thinking: { type: "adaptive" },
    ...(effort ? { output_config: { effort } } : {}),
    system: [{ type: "text", text: buildSystemPrompt(req) }],
    messages: [
      {
        role: "user",
        content: [...ctx.blocks, { type: "text", text: req.question }],
      },
    ],
    betas: ["files-api-2025-04-14"],
  };
  return client.beta.messages.stream(params);
}

/** SDK stream → delta/citation SSEEvents, with [[n]] markers at cited block ends. */
async function* transform(
  stream: AsyncIterable<StreamEvent>,
  docs: CorpusDoc[],
): AsyncGenerator<SSEEvent> {
  let n = 0;
  let blockCitations: PageLocationCitation[] = [];
  for await (const ev of stream) {
    if (ev.type === "content_block_start") {
      blockCitations = [];
    } else if (ev.type === "content_block_delta") {
      const delta = ev.delta;
      if (delta.type === "text_delta") {
        yield { type: "delta", text: delta.text };
      } else if (
        delta.type === "citations_delta" &&
        delta.citation.type === "page_location"
      ) {
        blockCitations.push(delta.citation);
      }
    } else if (ev.type === "content_block_stop") {
      for (const c of blockCitations) {
        n += 1;
        yield { type: "delta", text: `[[${n}]]` };
        yield {
          type: "citation",
          n,
          docId: docs[c.document_index]?.id ?? "",
          page: c.start_page_number,
          quote: c.cited_text.trim().slice(0, 200),
        };
      }
      blockCitations = [];
    }
  }
}

// ─────────────────────────── choreographed stages ───────────────────────────

async function* stages(
  req: ChatRequest,
  config: ModeConfig,
  docs: CorpusDoc[],
): AsyncGenerator<SSEEvent> {
  const available = new Set(docs.map((d) => d.id));
  for (const agentId of choreographyPlan(req)) {
    const docIds = getAgent(agentId).defaultDocIds.filter((id) =>
      available.has(id),
    );
    yield { type: "stage", agent: agentId, status: "start", docIds };
    if (config.stageStepMs > 0) await sleep(config.stageStepMs);
    yield { type: "stage", agent: agentId, status: "done", docIds };
    if (config.stageStepMs > 0) await sleep(config.stageStepMs);
  }
}

// ─────────────────────────────── fallbacks ───────────────────────────────

function gracefulCachedError(lang: Lang): string {
  return lang === "ar"
    ? "هذا السؤال غير مُسجّل في مجموعة العرض بعد. في وضع العرض المُسجّل، اختر سؤالاً من لوحة الأوامر (⌘K)، فتلك هي مجموعة أسئلة العرض المُسجّلة والموثّقة."
    : "This question isn't in the recorded demo set. In cached mode, pick one from the ⌘K palette, those are the pre-recorded, verified demo questions.";
}

function liveFailNoCache(lang: Lang): string {
  return lang === "ar"
    ? "حدثت مشكلة في الاتصال بمحرك التحليل، ولا تتوفر إجابة مُسجّلة موثّقة لهذا السؤال. يُرجى المحاولة مرة أخرى."
    : "Connection issue reaching the analysis engine, and no verified cached answer is available for this question. Please try again.";
}

function midStreamError(lang: Lang): string {
  return lang === "ar"
    ? "انقطع الاتصال أثناء الإجابة، يتم الرجوع إلى الإجابة الموثّقة من الذاكرة المؤقتة."
    : "Connection issue, answering from the verified cache.";
}

/**
 * Surface the real exception in the server log before the graceful SSE path
 * swallows it, the UI only ever sees a calm fallback message, so without this
 * a rehearsal failure (bad API key, corpus read, model error) leaves no trace
 * of the root cause.
 */
function logLiveFailure(err: unknown): void {
  console.error("[faheem] live stream failed:", err);
}

/** Live failure → replay cache (with a smoothing stage) when present, else error. */
async function* fallback(
  cached: CacheEntry | null,
  config: ModeConfig,
  lang: Lang,
): AsyncGenerator<SSEEvent> {
  if (cached) {
    yield { type: "stage", agent: "orchestrator", status: "start" };
    yield* replay(cached, config.replayDelayMs);
  } else {
    yield { type: "error", message: liveFailNoCache(lang) };
  }
}

const TIMEOUT: unique symbol = Symbol("timeout");

async function raceTimeout<T>(
  promise: Promise<T>,
  ms: number,
): Promise<T | typeof TIMEOUT> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<typeof TIMEOUT>((resolve) => {
    timer = setTimeout(() => resolve(TIMEOUT), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

function persist(req: ChatRequest, events: SSEEvent[]): void {
  writeCacheEntry({
    key: cacheKey(req),
    request: req,
    events,
    recordedAt: new Date().toISOString(),
  });
}

// ───────────────────────────── mode runners ─────────────────────────────

async function* runLive(
  req: ChatRequest,
  config: ModeConfig,
  cached: CacheEntry | null,
  client: FaheemClient,
  readFileBytes?: FileReader,
): AsyncGenerator<SSEEvent> {
  const recorded: SSEEvent[] = [];
  const keep = (event: SSEEvent): SSEEvent => {
    recorded.push(event);
    return event;
  };
  let emittedAnswer = false;
  let ctx: CorpusContext;
  let iter: AsyncIterator<SSEEvent>;
  try {
    ctx = buildCorpusContext(req, readFileBytes);
    iter = transform(startModel(req, ctx, client), ctx.docs)[
      Symbol.asyncIterator
    ]();
  } catch (err) {
    logLiveFailure(err);
    yield* fallback(cached, config, req.lang);
    return;
  }

  try {
    for await (const stage of stages(req, config, ctx.docs)) yield keep(stage);
    let cur = await iter.next();
    while (!cur.done) {
      emittedAnswer = true;
      yield keep(cur.value);
      cur = await iter.next();
    }
    yield keep({ type: "done", cached: false });
  } catch (err) {
    logLiveFailure(err);
    if (emittedAnswer) {
      yield { type: "error", message: midStreamError(req.lang) };
      return;
    }
    yield* fallback(cached, config, req.lang);
    return;
  }
  if (config.record) persist(req, recorded);
}

async function* runAuto(
  req: ChatRequest,
  config: ModeConfig,
  cached: CacheEntry | null,
  client: FaheemClient,
  readFileBytes?: FileReader,
): AsyncGenerator<SSEEvent> {
  const recorded: SSEEvent[] = [];
  const keep = (event: SSEEvent): SSEEvent => {
    recorded.push(event);
    return event;
  };
  let emittedAnswer = false;
  let ctx: CorpusContext;
  let iter: AsyncIterator<SSEEvent>;
  try {
    ctx = buildCorpusContext(req, readFileBytes);
    iter = transform(startModel(req, ctx, client), ctx.docs)[
      Symbol.asyncIterator
    ]();
  } catch (err) {
    logLiveFailure(err);
    yield* fallback(cached, config, req.lang);
    return;
  }

  // Race the model's first event against the auto-mode first-token timeout.
  const firstPromise = iter.next();
  let firstResult: IteratorResult<SSEEvent>;
  try {
    const raced = await raceTimeout(firstPromise, config.timeoutMs);
    if (raced === TIMEOUT) {
      if (cached) {
        void iter.return?.(); // stop the abandoned live stream
        yield* replay(cached, config.replayDelayMs);
        return;
      }
      // No cache: reassure and keep waiting for the (still pending) first token.
      yield keep({ type: "stage", agent: "orchestrator", status: "start" });
      firstResult = await firstPromise;
    } else {
      firstResult = raced;
    }
  } catch (err) {
    logLiveFailure(err);
    yield* fallback(cached, config, req.lang);
    return;
  }

  try {
    for await (const stage of stages(req, config, ctx.docs)) yield keep(stage);
    let cur = firstResult;
    while (!cur.done) {
      emittedAnswer = true;
      yield keep(cur.value);
      cur = await iter.next();
    }
    yield keep({ type: "done", cached: false });
  } catch (err) {
    logLiveFailure(err);
    if (emittedAnswer) {
      yield { type: "error", message: midStreamError(req.lang) };
      return;
    }
    yield* fallback(cached, config, req.lang);
    return;
  }
  if (config.record) persist(req, recorded);
}

// ───────────────────────────── entry point ─────────────────────────────

export interface ChatStreamOptions {
  cookieMode?: string;
  client?: FaheemClient;
  configOverride?: Partial<ModeConfig>;
  readFileBytes?: FileReader;
}

/** The chat engine: yields the SSEEvent stream for a request under the resolved mode. */
export async function* chatEventStream(
  req: ChatRequest,
  opts: ChatStreamOptions = {},
): AsyncGenerator<SSEEvent> {
  const config: ModeConfig = {
    ...readModeConfig(opts.cookieMode),
    ...opts.configOverride,
  };
  const cached = readCacheEntry(cacheKey(req));

  if (config.mode === "cached") {
    if (cached) {
      yield* replay(cached, config.replayDelayMs);
    } else {
      yield { type: "error", message: gracefulCachedError(req.lang) };
    }
    return;
  }

  const client = opts.client ?? getClient();
  if (config.mode === "live") {
    yield* runLive(req, config, cached, client, opts.readFileBytes);
    return;
  }
  yield* runAuto(req, config, cached, client, opts.readFileBytes);
}
