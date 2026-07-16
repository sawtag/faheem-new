# Settings page + cache-first auto mode (design)

Date: 2026-07-16. Status: approved direction (sosi picked all four recommendations); pending spec review.

## Goal

Give Faheem a judge-visible, polished `/settings` page whose centerpiece is the answer-engine mode switch (cached / auto / live), and fix `auto` so it matches the intended demo behavior: recorded golden answers replay instantly and deterministically, anything unrecorded (follow-up questions from Ali or judges) streams live with the same choreography and citation polish.

## What already exists (reused, not rebuilt)

- Mode resolution and per-request cookie override: `lib/ai/mode.ts` (`resolveMode`: cookie `faheem_mode` > `FAHEEM_MODE` env > smart default). The chat route re-reads the cookie per request, so switching needs no reload.
- The full mode engine: `lib/ai/sse.ts` (cached replay, live stream, auto with fallback).
- The stage-only panic switch: `components/demo/mode-overlay.tsx` (Ctrl+. overlay), which stays exactly as is, but gets synced (below).
- The client mode bus: `lib/demo/mode-bus.ts` (last-response cached/live indicator).
- Sidebar already has a Settings group (`SETTINGS_NAV` in `lib/nav.ts`: Connections, Audit).

## Behavior change: auto becomes cache-first

Current `auto` tries live first for every question and falls back to the cache only on a 10s first-token timeout or an error. New semantics, in `chatEventStream` (`lib/ai/sse.ts`):

- If an exact-key recording exists (`readCacheEntry(cacheKey(req))`), replay it immediately (terminal `done` carries `cached: true`, as today). Palette-selected golden questions always hit this path by construction (byte-identical requests).
- If no recording exists, run the live path. The existing no-cache reassurance behavior is kept: if the first token outruns the timeout, emit the orchestrator "still working" stage and keep waiting. A live failure with no recording yields the existing graceful error message.
- `live` mode is unchanged (truly live, used for rehearsal and re-recording). `cached` mode is unchanged (replay or graceful "pick from the palette" error). `scripts/record-goldens.ts` records via the live path and is unaffected.
- Consequence to document in code: in auto, a recorded question can never produce a fresh live answer; that is what live mode is for.

Implementation note: with cache-first auto, `runAuto`'s cache-fallback branches never see a non-null cache. The plan may merge `runLive`/`runAuto` if that nets less code (rule 6); behavior above is the contract, structure is the implementer's call.

## The /settings page

Route: `app/(app)/settings/page.tsx` (server component). Nav: add `{ key: "general", href: "/settings", icon: "settings-2" }` to `SETTINGS_NAV`, so the sidebar Settings group reads General, Connections, Audit. Sidebar label via `shell.nav.general` ("General" / "عام").

The server component resolves, per request:

- Effective mode via `resolveMode(cookie)` plus its source: cookie override vs environment default.
- Environment facts: API key configured (boolean only, from `ANTHROPIC_API_KEY` or `FAHEEM_ANTHROPIC_KEY`; the value never leaves the server), recorded-answer count (count of `data/demo-cache/*.json`), corpus document count (from the manifest).

### Section 1: Answer engine (centerpiece)

Three selectable cards (radio semantics), product-honest framing, no apologetics:

- Cached, "Demo pack": replays the verified, pre-recorded answer set; fully offline, deterministic, every figure cited.
- Auto, "Hybrid (recommended)": verified recordings when available, live analysis for anything new.
- Live: every question streams from the analysis engine in real time.

Details: selected card gets the navy/emerald selected treatment; selecting writes the `faheem_mode` cookie (same helper the overlay uses) and publishes on the mode bus. Below the cards: an effective-mode badge with its source ("your override" vs "environment default"), a "reset to environment default" action that clears the cookie, and the existing last-response cached/live indicator. When no API key is configured, the auto and live cards show an inline hint ("live analysis requires an API key") rather than failing later.

### Section 2: Environment

Stat tiles (count-up on first reveal, tabular-nums): recorded answers, corpus documents, API key status (configured / not configured). These are system facts, not financial figures; no source chips needed.

### Section 3: Preferences

Language toggle (reuse `components/shell/locale-toggle.tsx` behavior).

### Section 4: Governance

Short copy using only the approved privacy claims (client data is never used for model training, per-workspace isolation, full audit trail; "enterprise controls on the MVP roadmap" phrasing, no certification claims), with links to Audit and Connections.

## Keeping surfaces in sync

Extend `lib/demo/mode-bus.ts` into the small client-side mode state module: it keeps the last-response channel and gains (a) a mode-changed channel and (b) the shared `setModeCookie` helper (moved out of `mode-overlay.tsx`). Both the Ctrl+. overlay and the settings page publish on change and subscribe for updates, so they never disagree within a session.

## House rules applied

- All strings in `messages/en.json` + `messages/ar.json` (new `settings.*` namespace; reuse `demo.mode.*` where sensible). Western digits, no em-dashes.
- RTL: logical properties only; check the page in Arabic before calling it done.
- Theme tokens only; light only. Page title in Inter (serif display is not sanctioned here).
- Motion: page fade + 4px rise (250ms), staggered card reveal, count-up stats, nothing over 400ms.
- Desktop-first (1366 to 1920 wide).

## Files touched

- `lib/ai/sse.ts` (auto cache-first) and the doc comment in `lib/ai/mode.ts`.
- `app/(app)/settings/page.tsx` (new), `components/settings/*.tsx` (new: mode section client component; the rest server-rendered).
- `lib/nav.ts` (one nav item), `lib/demo/mode-bus.ts` (extension), `components/demo/mode-overlay.tsx` (sync + import the shared cookie helper).
- `messages/en.json`, `messages/ar.json`.
- Tests below.

## Testing

- Engine: auto with a recording replays it (`done.cached: true`, no client call); auto without a recording runs live; live failure without a recording yields the graceful error. Update `tests/ai/mode.test.ts` / sse tests accordingly.
- Component: mode section renders the effective mode, click writes the cookie and publishes on the bus; keyless render shows the API-key hint.
- E2E: from `/settings`, switch to cached, ask a golden question, assert the cached indicator; switch back. Extend `e2e/demo-controls.spec.ts` or add `e2e/settings.spec.ts`.
- Gate: `npm run verify` green.

## Out of scope

Recording controls (env-only workflow), replay pacing controls, any dark mode, mobile layout effort, changes to golden recordings themselves.
