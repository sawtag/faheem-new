/**
 * Chat resolution (T2.2). No database: `data/seed-chats.json` is the durable,
 * git-versioned history layer; localStorage (`faheem_chats`) overlays chats the
 * user creates at runtime. Runtime chats reuse the SeedChat shape verbatim, so
 * one code path renders both. `contextKey`-style (de)serialization matches the
 * `/chat/new?q=…&context=…` deep-link the omnibox uses.
 */
import seed from "@/data/seed-chats.json";
import {
  SeedChatSchema,
  type ChatContext,
  type SeedChat,
  type SSEEvent,
} from "@/lib/types";

/** Seeded history, validated once at module load. */
export const SEED_CHATS: SeedChat[] = SeedChatSchema.array().parse(seed);

const RUNTIME_KEY = "faheem_chats";

// ─────────────────────────── context ⇄ url string ───────────────────────────

/** Serialize a ChatContext for a URL/query param, e.g. "workspace:jahez" | "ic". */
export function serializeContext(ctx: ChatContext): string {
  return ctx.kind === "workspace" ? `workspace:${ctx.companyId}` : ctx.kind;
}

/** Parse a context string back to a ChatContext (defaults to firm). */
export function parseContext(value: string | null | undefined): ChatContext {
  if (value?.startsWith("workspace:")) {
    return { kind: "workspace", companyId: value.slice("workspace:".length) };
  }
  return value === "ic" ? { kind: "ic" } : { kind: "firm" };
}

// ─────────────────────────── runtime store (client) ───────────────────────────

function loadRuntimeChats(): SeedChat[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RUNTIME_KEY);
    if (!raw) return [];
    const parsed = SeedChatSchema.array().safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

function saveRuntimeChats(chats: SeedChat[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(RUNTIME_KEY, JSON.stringify(chats));
}

/**
 * Resolve a chat by id. The runtime overlay wins over the seed: once a seeded
 * chat gains a new turn (see `mutateChat`) an augmented clone lives in the
 * overlay under the same id, and that augmented copy, seed history + new
 * turns, is what must resolve. Un-augmented seed chats fall through to the
 * pristine seed. This is what lets a just-asked turn survive the locale-toggle
 * remount (AppShell keys `motion.main` by locale → full ChatView remount →
 * `liveTurns` useState resets): the turn was persisted, so it replays as
 * history here.
 */
export function resolveChat(id: string): SeedChat | undefined {
  return (
    loadRuntimeChats().find((c) => c.id === id) ??
    SEED_CHATS.find((c) => c.id === id)
  );
}

/** First ~9 words / 52 chars of the question, the runtime chat's title. */
function deriveTitle(question: string): string {
  const clean = question.trim().replace(/\s+/g, " ");
  const short = clean.split(" ").slice(0, 9).join(" ");
  const title = short.length < clean.length ? `${short}…` : clean;
  return title.length > 52 ? `${title.slice(0, 51)}…` : title;
}

/**
 * Create a runtime chat seeded with the opening user turn and persist it. The
 * chat page auto-streams the trailing user message, so this drives the
 * "compose anywhere → /chat/[id]" flow.
 */
export function createRuntimeChat(
  context: ChatContext,
  question: string,
): SeedChat {
  const title = deriveTitle(question);
  const chat: SeedChat = {
    id: crypto.randomUUID(),
    title: { en: title, ar: title },
    context,
    createdAt: new Date().toISOString(),
    messages: [{ role: "user", text: question }],
  };
  saveRuntimeChats([chat, ...loadRuntimeChats()]);
  return chat;
}

/**
 * Apply a mutation to the overlay copy of a chat, persisting the result. If the
 * id belongs to a seed chat with no overlay yet, a clone of the seed is
 * promoted into the overlay first, the sacred `data/seed-chats.json` is never
 * mutated (only the localStorage clone grows). This is why a new turn on a
 * SEEDED chat now survives a reload / the locale-toggle remount, not just turns
 * on runtime-created chats.
 */
function mutateChat(id: string, mutate: (chat: SeedChat) => void): void {
  const chats = loadRuntimeChats();
  const existing = chats.find((c) => c.id === id);
  if (existing) {
    mutate(existing);
    saveRuntimeChats(chats);
    return;
  }
  const seed = SEED_CHATS.find((c) => c.id === id);
  if (!seed) return;
  const clone = structuredClone(seed);
  mutate(clone);
  saveRuntimeChats([clone, ...chats]);
}

/** Append a user turn (seed chats promote to the overlay on first new turn). */
export function appendUserTurn(id: string, question: string): void {
  mutateChat(id, (chat) => {
    chat.messages.push({ role: "user", text: question });
  });
}

/**
 * Persist a completed assistant turn (text + replayable events) so a reload or
 * the locale-toggle remount keeps the history. Works for both runtime and
 * seeded chats via the overlay (see `mutateChat`).
 */
export function appendAssistantTurn(
  id: string,
  text: string,
  events: SSEEvent[],
): void {
  mutateChat(id, (chat) => {
    chat.messages.push({ role: "assistant", text, events });
  });
}
