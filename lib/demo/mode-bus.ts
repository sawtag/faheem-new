/**
 * Tiny client-side mode state module (P5a, extended by the settings page).
 * Two channels plus the shared cookie helper:
 *
 * 1. last-response: broadcasts the `cached` flag of the most recent chat
 *    `done` event so the ⌘. overlay and /settings can show "last response:
 *    cached / live" without threading a prop through every chat surface.
 *    Publish side lives in components/chat/stream.ts (the one shared SSE
 *    reader), flagged there as a touched shared file.
 * 2. mode-changed: keeps the ⌘. overlay and the /settings mode cards in
 *    agreement within a session; both publish on change and subscribe.
 *
 * setModeCookie / clearModeCookie own the `faheem_mode` cookie the chat
 * route re-reads per request (lib/ai/mode.ts precedence: cookie > env).
 */
import type { FaheemMode } from "@/lib/types";

const MODE_COOKIE = "faheem_mode";

export function setModeCookie(mode: FaheemMode): void {
  document.cookie = `${MODE_COOKIE}=${mode}; path=/; max-age=${60 * 60 * 24}; samesite=lax`;
}

/** Clears the override so the environment default applies again. */
export function clearModeCookie(): void {
  document.cookie = `${MODE_COOKIE}=; path=/; max-age=0; samesite=lax`;
}

type CachedListener = (cached: boolean) => void;

const cachedListeners = new Set<CachedListener>();
let last: boolean | null = null;

export function publishLastResponseCached(cached: boolean): void {
  last = cached;
  for (const listener of cachedListeners) listener(cached);
}

/** Current value, if any response has completed yet this session. */
export function currentLastResponseCached(): boolean | null {
  return last;
}

export function subscribeLastResponseCached(
  listener: CachedListener,
): () => void {
  cachedListeners.add(listener);
  return () => cachedListeners.delete(listener);
}

type ModeListener = (mode: FaheemMode) => void;

const modeListeners = new Set<ModeListener>();

export function publishMode(mode: FaheemMode): void {
  for (const listener of modeListeners) listener(mode);
}

export function subscribeMode(listener: ModeListener): () => void {
  modeListeners.add(listener);
  return () => modeListeners.delete(listener);
}
