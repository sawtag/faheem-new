#!/usr/bin/env -S npx tsx
/**
 * Prompt-cache prewarm (P5a task 7) — one real `beta.messages.stream` call
 * that sends the workspace:jahez system prompt + the full jahez-context doc
 * block set (built with the exact same helpers the live chat engine uses:
 * lib/ai/prompts.ts's `buildSystemPrompt` + lib/ai/corpus.ts's
 * `buildCorpusContext`), so Anthropic's server-side prompt cache is warm
 * BEFORE the demo's first real question.
 *
 * Why workspace:jahez specifically: `filterDocs()` returns the identical
 * 12-doc set (every Jahez filing + all Lunar docs + both firm packs) for
 * EVERY golden question in that context that doesn't narrow via `docIds`
 * (qa2, deliverables, followup-bull, followup-keeta — see
 * data/golden-questions.json) — cache_control sits on the LAST doc block, and
 * the question text that follows it is outside the cached prefix, so this one
 * prewarm call benefits all four. qa1 (`docIds: ["fy25-er"]`) narrows to a
 * different, smaller block set and is not covered — that's inherent to how
 * doc-scoped questions work, not a gap in this script.
 *
 * `max_tokens: 1` — the API's documented minimum is 1 (max_tokens: 0 is
 * rejected); re-verify against the live SDK/docs if this ever starts
 * erroring, since post-training API changes are exactly the failure mode
 * AGENTS.md's "never guess post-training APIs" rule exists for.
 *
 * Refuses to run without ANTHROPIC_API_KEY. NEVER run this from an agent
 * session that hasn't been explicitly told to — it is a real, billed API
 * call (small: 1 output token, but the ~12 cached PDFs still count as input
 * tokens on this first, uncached write).
 *
 * Usage: ANTHROPIC_API_KEY=... npx tsx scripts/prewarm.ts
 */
import { getClient, getModel } from "@/lib/ai/client";
import { buildCorpusContext } from "@/lib/ai/corpus";
import { buildSystemPrompt } from "@/lib/ai/prompts";
import type { ChatRequest } from "@/lib/types";

const PREWARM_REQUEST: ChatRequest = {
  question: "Prewarm the prompt cache.",
  lang: "en",
  context: { kind: "workspace", companyId: "jahez" },
};

async function main(): Promise<void> {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error(
      "ANTHROPIC_API_KEY is not set — refusing to run. This script makes a REAL, billed API call.",
    );
    process.exit(1);
  }

  console.log(
    "This will make ONE real Anthropic API call (max_tokens: 1, but the full\n" +
      "jahez-context doc set — ~12 PDFs — is sent as input on this first,\n" +
      "uncached write). Cost-aware, not free. Ctrl+C now to abort.\n",
  );

  const ctx = buildCorpusContext(PREWARM_REQUEST);
  console.log(
    `Prewarming ${ctx.docs.length} docs for workspace:jahez: ${ctx.docs.map((d) => d.id).join(", ")}`,
  );

  const client = getClient();
  const start = Date.now();
  const stream = client.beta.messages.stream({
    model: getModel(),
    max_tokens: 1,
    system: [{ type: "text", text: buildSystemPrompt(PREWARM_REQUEST) }],
    messages: [
      {
        role: "user",
        content: [
          ...ctx.blocks,
          { type: "text", text: PREWARM_REQUEST.question },
        ],
      },
    ],
    betas: ["files-api-2025-04-14"],
  });

  // Drain fully — the whole point is the server-side write, not the (1-token) output.
  for await (const event of stream) void event;

  console.log(`Prewarm call complete in ${Date.now() - start}ms.`);
  console.log(
    "Cache TTL is 1h (cache_control.ttl in lib/ai/corpus.ts) — record the goldens soon after.",
  );
}

main().catch((err) => {
  console.error("Prewarm failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
