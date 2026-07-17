/**
 * Runtime mode resolution + cached-replay pacing.
 *
 * Precedence: cookie `faheem_mode` > FAHEEM_MODE env > smart default. The
 * smart default is `auto` when an API key is present and `cached` when it's
 * absent (a keyless fresh clone / backup laptop still runs fully offline, no
 * live-call error). Auto is cache-first: a recorded question replays
 * instantly and deterministically; only unrecorded questions stream live.
 * The cookie is the on-stage panic switch and always wins. Cached replays are
 * paced (see replay-pacing.ts) so an offline golden feels like a live run; the
 * pacing is on by default and bypassed by FAHEEM_REPLAY_PACE=0 (the e2e path).
 * The full orchestration (live / auto / fallback) lives in sse.ts.
 */
import { paceReplay } from "@/lib/ai/replay-pacing";
import type { CacheEntry, FaheemMode, SSEEvent } from "@/lib/types";

export interface ModeConfig {
  mode: FaheemMode;
  timeoutMs: number;
  /** Cached-replay pacing on (default) vs. bypassed for a fast e2e suite. */
  pace: boolean;
  stageStepMs: number;
  record: boolean;
}

export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

function normalizeMode(value?: string): FaheemMode | null {
  return value === "live" || value === "cached" || value === "auto"
    ? value
    : null;
}

export function resolveMode(cookieMode?: string): FaheemMode {
  return (
    normalizeMode(cookieMode) ??
    normalizeMode(process.env.FAHEEM_MODE) ??
    // FAHEEM_ANTHROPIC_KEY: alias for managed sandboxes (claude.ai cloud
    // sessions) that may reserve the canonical name; see lib/ai/client.ts.
    (process.env.ANTHROPIC_API_KEY || process.env.FAHEEM_ANTHROPIC_KEY
      ? "auto"
      : "cached")
  );
}

function intEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const value = Number.parseInt(raw, 10);
  return Number.isFinite(value) ? value : fallback;
}

export function readModeConfig(cookieMode?: string): ModeConfig {
  return {
    mode: resolveMode(cookieMode),
    timeoutMs: intEnv("FAHEEM_TIMEOUT_MS", 10000),
    pace: process.env.FAHEEM_REPLAY_PACE !== "0",
    stageStepMs: intEnv("FAHEEM_STAGE_STEP_MS", 500),
    record: process.env.FAHEEM_RECORD === "1",
  };
}

/**
 * Replays a recorded entry in-order under the pacing schedule (paceReplay):
 * when `paced`, each event waits its computed beat so the choreography and
 * streamed answer feel live; when not (the e2e bypass), all delays are zero.
 * Recordings capture `done.cached:false` from the live run that produced them;
 * a replay IS served from cache (cached mode or an auto/live fallback), so the
 * terminal `done` is rewritten to `cached:true`, that flag drives the ⌘. mode
 * overlay ("served from cache") and must be truthful.
 */
export async function* replay(
  entry: CacheEntry,
  paced: boolean,
): AsyncGenerator<SSEEvent> {
  const delays = paceReplay(entry.events, paced);
  for (let i = 0; i < entry.events.length; i += 1) {
    if (delays[i]! > 0) await sleep(delays[i]!);
    const event = entry.events[i]!;
    yield event.type === "done" ? { ...event, cached: true } : event;
  }
}
