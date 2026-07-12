#!/usr/bin/env -S npx tsx
/**
 * Golden-path recorder (P5a task 7) — POSTs every entry in
 * data/golden-questions.json to a running local server's /api/chat, consumes
 * the SSE stream fully, and reports what landed. The server MUST be started
 * separately with `FAHEEM_MODE=live FAHEEM_RECORD=1 npm run dev` (or
 * `next start` against a production build) — this script is a plain HTTP
 * client, it never imports the Anthropic SDK or lib/ai/client.ts directly.
 *
 * Expected cache file per entry is computed with the SAME `cacheKey()`
 * formula the engine and the ⌘K demo palette use (lib/ai/cache.ts) — if a
 * recorded entry's file doesn't land at that exact path, the palette would
 * silently miss the cache on stage, so this is treated as a hard failure.
 *
 * Refuses to run without ANTHROPIC_API_KEY (the target server needs it to
 * record real, billed responses — this is a client-side guard against
 * running the whole set against a misconfigured environment by accident).
 *
 * Usage:
 *   ANTHROPIC_API_KEY=... npx tsx scripts/record-goldens.ts
 *   ANTHROPIC_API_KEY=... npx tsx scripts/record-goldens.ts --only qa1,shariah-ar
 *   ANTHROPIC_API_KEY=... npx tsx scripts/record-goldens.ts --base-url http://localhost:3000
 */
import {
  GOLDEN_QUESTIONS,
  type GoldenQuestion,
} from "@/lib/demo/golden-questions";
import { cacheKey, readCacheEntry } from "@/lib/ai/cache";
import { SSEEventSchema, type SSEEvent } from "@/lib/types";

interface Args {
  only: Set<string> | null;
  baseUrl: string;
}

function parseArgs(argv: string[]): Args {
  let only: Set<string> | null = null;
  let baseUrl = "http://localhost:3000";
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--only" && argv[i + 1]) {
      only = new Set(
        argv[++i]!.split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      );
    } else if (arg === "--base-url" && argv[i + 1]) {
      baseUrl = argv[++i]!.replace(/\/$/, "");
    }
  }
  return { only, baseUrl };
}

/** Mirrors components/chat/stream.ts's frame parsing (that module is a
 *  browser "use client" file — this is the Node-side twin for a CLI script). */
async function streamChat(
  baseUrl: string,
  entry: GoldenQuestion,
): Promise<SSEEvent[]> {
  const res = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      // auth middleware gates /api/chat; the browser has this cookie on stage
      cookie: "faheem_session=1",
    },
    body: JSON.stringify(entry.request),
  });
  if (!res.ok || !res.body) {
    throw new Error(`HTTP ${res.status} ${res.statusText}`);
  }

  const events: SSEEvent[] = [];
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = buffer.indexOf("\n\n")) !== -1) {
      const frame = buffer.slice(0, idx).trim();
      buffer = buffer.slice(idx + 2);
      if (!frame.startsWith("data:")) continue;
      const json = frame.slice(frame.indexOf(":") + 1).trim();
      const parsed = SSEEventSchema.safeParse(JSON.parse(json));
      if (parsed.success) events.push(parsed.data);
    }
  }
  return events;
}

async function recordOne(
  baseUrl: string,
  entry: GoldenQuestion,
): Promise<{ ok: boolean; lines: string[] }> {
  const lines: string[] = [];
  const expectedKey = cacheKey(entry.request);
  const startedAt = Date.now();

  let events: SSEEvent[];
  try {
    events = await streamChat(baseUrl, entry);
  } catch (err) {
    lines.push(
      `  FAIL  request error: ${err instanceof Error ? err.message : String(err)}`,
    );
    return { ok: false, lines };
  }

  const durationMs = Date.now() - startedAt;
  const errorEvent = events.find((e) => e.type === "error");
  if (errorEvent && errorEvent.type === "error") {
    lines.push(`  FAIL  engine error: ${errorEvent.message}`);
    return { ok: false, lines };
  }

  const text = events
    .filter((e) => e.type === "delta")
    .map((e) => (e.type === "delta" ? e.text : ""))
    .join("");
  const citationCount = events.filter((e) => e.type === "citation").length;
  const done = events.some((e) => e.type === "done");
  const entryFile = readCacheEntry(expectedKey);

  if (!done) lines.push("  FAIL  stream never reached a `done` event");
  if (!entryFile) {
    lines.push(
      `  FAIL  no cache file at data/demo-cache/${expectedKey}.json — the ⌘K palette would MISS this on stage`,
    );
  }

  const ok = Boolean(done) && Boolean(entryFile);
  lines.push(`  key:        ${expectedKey}`);
  lines.push(`  citations:  ${citationCount}`);
  lines.push(`  duration:   ${durationMs}ms`);
  lines.push(`  first 200:  ${JSON.stringify(text.slice(0, 200))}`);
  return { ok, lines };
}

async function main(): Promise<void> {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error(
      "ANTHROPIC_API_KEY is not set — refusing to run. The target server needs it to record real, billed responses.",
    );
    process.exit(1);
  }

  const { only, baseUrl } = parseArgs(process.argv.slice(2));
  const entries = only
    ? GOLDEN_QUESTIONS.filter((q) => only.has(q.id))
    : GOLDEN_QUESTIONS;

  if (entries.length === 0) {
    console.error(
      "No matching golden questions (check --only ids against data/golden-questions.json).",
    );
    process.exit(1);
  }

  console.log(
    `Recording ${entries.length} golden question(s) against ${baseUrl}/api/chat.\n` +
      "This makes REAL, billed Anthropic API calls IF the target server is running\n" +
      "with FAHEEM_MODE=live FAHEEM_RECORD=1 — cost-aware, not free.\n",
  );

  let failures = 0;
  for (const entry of entries) {
    console.log(`\n${entry.id} — ${entry.label.en}`);
    const { ok, lines } = await recordOne(baseUrl, entry);
    for (const line of lines) console.log(line);
    if (!ok) failures += 1;
  }

  console.log(
    `\n${entries.length - failures}/${entries.length} recorded successfully.`,
  );
  if (failures > 0) {
    console.error(
      `${failures} entr${failures === 1 ? "y" : "ies"} FAILED — see above.`,
    );
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(
    "record-goldens failed:",
    err instanceof Error ? err.message : err,
  );
  process.exit(1);
});
