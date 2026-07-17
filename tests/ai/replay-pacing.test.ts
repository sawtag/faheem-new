import { describe, expect, it } from "vitest";
import { paceReplay } from "@/lib/ai/replay-pacing";
import type { SSEEvent } from "@/lib/types";

const delta = (text: string): SSEEvent => ({ type: "delta", text });
const stage = (status: "start" | "done"): SSEEvent => ({
  type: "stage",
  agent: "research",
  status,
});

describe("paceReplay", () => {
  it("returns an all-zero schedule when disabled (the e2e bypass)", () => {
    const events: SSEEvent[] = [
      stage("start"),
      delta("a long streamed answer chunk"),
      { type: "citation", n: 1, docId: "d", page: 1, quote: "q" },
      { type: "done", cached: true },
    ];
    expect(paceReplay(events, false)).toEqual([0, 0, 0, 0]);
  });

  it("gives every stage event a visible beat, ~500-900ms per start+done pair", () => {
    // Four specialist stages = four start/done pairs of choreography.
    const events: SSEEvent[] = Array.from({ length: 4 }).flatMap(() => [
      stage("start"),
      stage("done"),
    ]);
    const delays = paceReplay(events, true);

    expect(delays.every((d) => d > 0)).toBe(true);
    for (let i = 0; i < delays.length; i += 2) {
      const pair = delays[i]! + delays[i + 1]!;
      expect(pair).toBeGreaterThanOrEqual(500);
      expect(pair).toBeLessThanOrEqual(900);
    }
  });

  it("caps the pre-text choreography around 3-4 seconds even for many stages", () => {
    const events: SSEEvent[] = Array.from({ length: 24 }).map((_, i) =>
      stage(i % 2 === 0 ? "start" : "done"),
    );
    const total = paceReplay(events, true).reduce((a, b) => a + b, 0);
    expect(total).toBeLessThanOrEqual(4000);
  });

  it("throttles text deltas in proportion to their char count", () => {
    const short = paceReplay([delta("x".repeat(20))], true)[0]!;
    const long = paceReplay([delta("x".repeat(200))], true)[0]!;

    // ~18ms per 10 chars: a 200-char delta waits far longer than a 20-char one,
    // and both land near the proportional rate (with a per-chunk ceiling).
    expect(long).toBeGreaterThan(short);
    expect(short).toBeGreaterThanOrEqual(20 * 1.5);
    expect(short).toBeLessThanOrEqual(20 * 2.5);
    expect(long).toBeGreaterThan(200);
  });

  it("scales a full answer's streaming time with total text length", () => {
    const answer = (chunks: number): SSEEvent[] =>
      Array.from({ length: chunks }).map(() =>
        delta("a modest sentence chunk"),
      );
    const shortTotal = paceReplay(answer(20), true).reduce((a, b) => a + b, 0);
    const longTotal = paceReplay(answer(60), true).reduce((a, b) => a + b, 0);
    expect(longTotal).toBeGreaterThan(shortTotal * 2.5);
  });

  it("gives citations and terminal events a small fixed beat, never zero", () => {
    const events: SSEEvent[] = [
      { type: "citation", n: 1, docId: "d", page: 1, quote: "q" },
      { type: "done", cached: true },
      { type: "error", message: "e" },
    ];
    const [cite, done, err] = paceReplay(events, true);
    for (const d of [cite!, done!, err!]) {
      expect(d).toBeGreaterThan(0);
      expect(d).toBeLessThanOrEqual(200);
    }
  });
});
