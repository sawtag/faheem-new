#!/usr/bin/env -S npx tsx
/**
 * Prompt-cache prewarm (P5a task 7, extended for the IC beat) — one real
 * `beta.messages.stream` call PER DEMO CONTEXT, sending that context's system
 * prompt + full doc block set (built with the exact same helpers the live
 * chat engine uses: lib/ai/prompts.ts `buildSystemPrompt` + lib/ai/corpus.ts
 * `buildCorpusContext`), so Anthropic's server-side prompt cache is warm
 * BEFORE the demo's first real question in each room.
 *
 * Two contexts are warmed:
 *  - workspace:jahez — `filterDocs()` returns the identical doc set for every
 *    jahez golden that doesn't narrow via `docIds` (qa2, deliverables,
 *    followups, wacc-build, comps-gap, oneoff-check, shariah-en). qa1
 *    (`docIds: ["fy25-er"]`) narrows to a smaller block set and is not
 *    covered — inherent to doc-scoped questions, not a gap here.
 *  - ic — the IC room has a DIFFERENT doc-block sequence (its own cache
 *    prefix). The run of show invites judges to grill Faheem IC live; without
 *    this warm, their first IC question pays the cold full-corpus write
 *    (~60–90s on stage).
 *
 * `max_tokens: 1` — the API's documented minimum is 1 (max_tokens: 0 is
 * rejected); re-verify against the live SDK/docs if this ever errors.
 *
 * Refuses to run without ANTHROPIC_API_KEY. NEVER run from an agent session
 * that hasn't been explicitly told to — these are real, billed API calls
 * (1 output token each, but each context's PDFs count as input on the first,
 * uncached write).
 *
 * Usage: ANTHROPIC_API_KEY=... npx tsx scripts/prewarm.ts
 */
import { getClient, getModel } from "@/lib/ai/client";
import { buildCorpusContext } from "@/lib/ai/corpus";
import { buildSystemPrompt } from "@/lib/ai/prompts";
import type { ChatRequest } from "@/lib/types";

const PREWARM_REQUESTS: ChatRequest[] = [
  {
    question: "Prewarm the prompt cache.",
    lang: "en",
    context: { kind: "workspace", companyId: "jahez" },
  },
  {
    question: "Prewarm the prompt cache.",
    lang: "en",
    context: { kind: "ic" },
  },
];

function contextLabel(req: ChatRequest): string {
  return req.context.kind === "workspace"
    ? `workspace:${req.context.companyId}`
    : req.context.kind;
}

async function warm(req: ChatRequest): Promise<void> {
  const ctx = buildCorpusContext(req);
  console.log(
    `Prewarming ${ctx.docs.length} docs for ${contextLabel(req)}: ${ctx.docs
      .map((d) => d.id)
      .join(", ")}`,
  );

  const client = getClient();
  const start = Date.now();
  const stream = client.beta.messages.stream({
    model: getModel(),
    max_tokens: 1,
    system: [{ type: "text", text: buildSystemPrompt(req) }],
    messages: [
      {
        role: "user",
        content: [...ctx.blocks, { type: "text", text: req.question }],
      },
    ],
    betas: ["files-api-2025-04-14"],
  });

  // Drain fully — the point is the server-side cache write, not the output.
  for await (const event of stream) void event;

  console.log(`  ${contextLabel(req)} warm in ${Date.now() - start}ms.`);
}

async function main(): Promise<void> {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error(
      "ANTHROPIC_API_KEY is not set — refusing to run. This script makes REAL, billed API calls.",
    );
    process.exit(1);
  }

  console.log(
    "This will make TWO real Anthropic API calls (max_tokens: 1 each, but each\n" +
      "context's full doc set is sent as input on its first, uncached write).\n" +
      "Cost-aware, not free. Ctrl+C now to abort.\n",
  );

  for (const req of PREWARM_REQUESTS) await warm(req);

  console.log(
    "\nBoth demo contexts warm. Cache TTL is 1h (cache_control.ttl in lib/ai/corpus.ts) — go on stage within the hour.",
  );
}

main().catch((err) => {
  console.error("Prewarm failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
