import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  SEED_CHATS,
  appendAssistantTurn,
  appendUserTurn,
  resolveChat,
} from "@/lib/chats";

/**
 * Regression for the locale-toggle chat wipe (P6 item 1). AppShell keys
 * `motion.main` by locale, so a language toggle fully remounts ChatView and its
 * `liveTurns` useState resets to []. The only turns that survive are those the
 * remount can re-read via `resolveChat`. Pre-fix, a new turn on a SEEDED chat
 * was never persisted (append was a runtime-only no-op), so it vanished on
 * toggle. These tests pin the persistence that makes the turn survive — and
 * guard that the sacred seed JSON is never mutated.
 *
 * This jsdom build ships no Storage, so we polyfill an in-memory localStorage
 * (that is exactly what lib/chats writes through to).
 */
function installMemoryLocalStorage(): void {
  const store = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => void store.set(k, String(v)),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
    key: (i: number) => [...store.keys()][i] ?? null,
    get length() {
      return store.size;
    },
  });
}

describe("seed-chat turn persistence (locale-toggle remount survival)", () => {
  beforeEach(installMemoryLocalStorage);
  afterEach(() => vi.unstubAllGlobals());

  it("a live Q&A on a SEEDED chat survives a remount (re-resolve)", () => {
    const seed = SEED_CHATS[0]!;
    const before = seed.messages.length;
    const events = [
      { type: "delta" as const, text: "Revenue grew 64.9% YoY" },
      { type: "done" as const, cached: true },
    ];

    // The demo's Q&A beat: user asks, assistant answers, on a seeded chat.
    appendUserTurn(seed.id, "How did FY2025 revenue quality hold up?");
    appendAssistantTurn(seed.id, "Revenue grew 64.9% YoY", events);

    // Remount = resolveChat runs fresh; liveTurns starts empty. The just-asked
    // turn must now be replayable from persisted history.
    const remounted = resolveChat(seed.id)!;
    expect(remounted.messages).toHaveLength(before + 2);
    expect(remounted.messages.at(-2)).toMatchObject({ role: "user" });
    expect(remounted.messages.at(-1)).toMatchObject({
      role: "assistant",
      text: "Revenue grew 64.9% YoY",
      events,
    });
  });

  it("never mutates the sacred seed-chats.json (only the overlay grows)", () => {
    const seed = SEED_CHATS[0]!;
    const before = seed.messages.length;

    appendUserTurn(seed.id, "q");
    appendAssistantTurn(seed.id, "a", [{ type: "done", cached: true }]);

    // The in-memory seed (parsed from data/seed-chats.json) is untouched.
    expect(SEED_CHATS.find((c) => c.id === seed.id)!.messages).toHaveLength(
      before,
    );
    // A fresh, un-augmented seed chat still resolves to pristine seed history.
    const other = SEED_CHATS[1];
    if (other) {
      expect(resolveChat(other.id)!.messages).toHaveLength(
        other.messages.length,
      );
    }
  });
});
