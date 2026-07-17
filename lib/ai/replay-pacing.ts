/**
 * Cached-replay pacing: maps a recorded SSE event sequence to a per-event delay
 * (ms to wait BEFORE emitting event i) so an offline golden replay FEELS like a
 * live agentic run on stage instead of dumping every event in one frame.
 *
 * Pure and deterministic: no Math.random and no wall-clock, so a given
 * recording always produces the same schedule. The only variation is
 * index-based (the stage cadence). Disabled (`enabled=false`, the e2e path via
 * FAHEEM_REPLAY_PACE=0) returns an all-zero schedule so the suite stays fast.
 */
import type { SSEEvent } from "@/lib/types";

// Pre-answer choreography: each specialist-stage event gets a visible beat, but
// the whole pre-text run is a hard cap so the answer never stalls too long. A
// stage is a start+done pair, so per-pair delay lands ~500-900ms. Real
// recordings carry 8-10 stage events (well under the cap); past it, extra
// stages get no beat rather than letting floors accumulate unbounded.
const STAGE_BASE_MS = 300;
const STAGE_STEP_MS = 70; // index variation → 300 / 370 / 440 per event
const STAGE_VARIANTS = 3;
const PRE_TEXT_CAP_MS = 3500; // ceiling on the choreography before text starts

// Text: delay proportional to each delta's length (~18ms per 10 chars), so a
// typical answer streams over ~6-12s and scales with total length.
const TEXT_MS_PER_CHAR = 1.8;
const TEXT_MIN_MS = 8; // markers ([[n]]) still register a beat
const TEXT_MAX_MS = 400; // no single chunk stalls the stream

// Citations (source/file cards) and terminal events: small fixed beats so cards
// do not all pop in the same frame.
const CITATION_MS = 140;
const TERMINAL_MS = 120;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Delay (ms) to wait before emitting each event; index-aligned with `events`. */
export function paceReplay(events: SSEEvent[], enabled: boolean): number[] {
  if (!enabled) return events.map(() => 0);

  let stageBudget = 0;
  let stageIndex = 0;

  return events.map((event) => {
    switch (event.type) {
      case "stage": {
        const proposed =
          STAGE_BASE_MS + (stageIndex % STAGE_VARIANTS) * STAGE_STEP_MS;
        stageIndex += 1;
        const remaining = PRE_TEXT_CAP_MS - stageBudget;
        if (remaining <= 0) return 0; // budget spent, remaining stages pop fast
        const delay = Math.min(proposed, remaining); // last beat fills to the cap
        stageBudget += delay;
        return delay;
      }
      case "delta":
        return clamp(
          Math.round(event.text.length * TEXT_MS_PER_CHAR),
          TEXT_MIN_MS,
          TEXT_MAX_MS,
        );
      case "citation":
        return CITATION_MS;
      case "done":
      case "error":
        return TERMINAL_MS;
    }
  });
}
