# AGENTS.md — Faheem build conventions

Read this before touching anything. It is the contract for every agent working in this repo.

## What this is

**Faheem** — a Rogo-style agentic AI platform for Saudi investment firms, built as a **hackathon demo** (Amad 2026, July 16–18). One Next.js app, localhost, Claude API, static verified data. The demo story, screens, and data pack are specified in `docs/superpowers/specs/2026-07-12-faheem-demo-design.md` (THE spec). The build plan with task ownership is `docs/superpowers/plans/2026-07-12-implementation-plan.md` (THE plan). Design reference: `context/rogo-screens/CATALOG.md` (layouts) + `context/branding/figma-exports/` (brand). **Goal: win. The frontend must be beautiful; the numbers must be real.**

## Commands

```bash
bun install              # deps (bun for installs; node runs everything)
bun run dev              # next dev
bun run check            # tsc --noEmit && eslint . && prettier --check .
bun run test             # vitest run (unit + integration)
bun run test:e2e         # playwright (starts app with FAHEEM_MODE=cached)
bun run validate:data    # zod-validate corpus manifest, deals.json, model-inputs.json
bun run verify           # check + test + validate:data (the pre-commit gate)
```

## Stack (locked — no new dependencies without fable's approval)

Next.js 15 (App Router, TS strict) · Tailwind v4 (theme lives ONLY in `app/globals.css` `@theme`) · radix-ui primitives (headless) · motion (animations) · lucide-react (icons) · next-intl (en default, ar) · @anthropic-ai/sdk · react-pdf · exceljs / pptxgenjs / docx · zod. Tests: vitest + @testing-library/react + Playwright.

**Fonts (locked, via next/font — no runtime CDN):** UI/body = **Inter** (EN) + **IBM Plex Sans Arabic** (AR; chosen over Tajawal — enterprise register, harmonizes with Inter). Hero serif (omnibox greeting ONLY) = **Lora** (EN) + **Amiri** (AR). Financial tables/figures always render digits in Inter with `font-variant-numeric: tabular-nums` (token/utility in globals.css).

**Assets policy:** vendor-first (`public/` or inline SVG) — it's nearly free and, with cached mode, makes the demo survive total network loss (venue will have wifi/hotspots, so a CDN is *acceptable* when vendoring is genuinely awkward — but don't reach for one out of laziness; the only thing that should truly need the network is a live Anthropic call). Faheem logo = clean inline SVG recreated/enhanced from the Figma logo system (bars+arrow glyph is animatable — use it). Real-company logos (Jahez) may be fetched once and vendored; fictional companies and Saudi connectors without clean SVGs (Argaam, SAHMK, Tadawul, Alinma) get consistent monogram tiles (initial + tint from the theme); international connectors may use `simple-icons` glyphs. People: no photos — initials-avatar tiles (Arwa "A" navy tile; leadership grid = initials + name + role + source link).

## Hard rules

1. **No dark mode.** Light only. Never write `dark:` variants.
2. **Every string is bilingual.** All copy goes through next-intl (`messages/en.json` + `messages/ar.json`). Never hardcode UI text. Financial figures use Western digits in both languages.
3. **RTL is not optional.** Use logical properties only (`ms-`/`me-`/`ps-`/`pe-`/`start-`/`end-`, never `ml-`/`mr-`/`pl-`/`pr-`/`left-`/`right-` unless direction-independent). Icons that imply direction flip with `rtl:` variants.
4. **Theme tokens only.** Colors, radii, shadows, spacing, motion come from `@theme` variables in `app/globals.css`. Never hardcode a hex value or ad-hoc shadow in a component. Extending the theme = edit globals.css, nothing else.
5. **Never invent a financial number.** Displayed figures come from `data/model-inputs.json` or `data/deals.json` (each carries `{value, sourceDoc, page}`). AI answers are grounded by API-enforced citations. If a number has no source, it does not ship.
6. **Less LoC of good code.** No abstractions for single call sites, no config for things that don't vary, no error handling for impossible states, no `utils.ts` graveyards. Prefer deleting to wrapping. Server components by default; `"use client"` only where interaction demands it.
7. **Stay in your lane.** Each task card lists the files you own. Do not edit shared files (`lib/types.ts`, `app/globals.css`, primitives in `components/ui/`) — request changes through fable instead.
8. **Tests land with the code.** A task is done when `bun run verify` is green and your task's acceptance tests pass. Component tests for logic (not snapshots); e2e specs live in `e2e/`.
9. **Commits**: conventional (`feat:`, `fix:`, `test:`, `chore:`), small, after each task's acceptance passes.
10. **Mock boundaries**: auth is fake (any username/password logs in — cookie `faheem_session`, no real security), connectors are fake (UI-only OAuth modals), Anthropic API is REAL (via `lib/ai/client.ts` only — injectable for tests; never instantiate the SDK elsewhere; never call it in unit tests).

## Design bar (the FE must impress)

- Layout language = Rogo (see CATALOG.md §2–§4: sidebar, omnibox hero, split chat+artifact, citation chips, Sources accordion). Skin = Faheem UI Kit (navy `--color-navy` #061F52, emerald `--color-accent` #07966F, bg #FBFCFE, border #E3E9F1; radius 8/12/20; shadow `0 10px 24px rgba(8,33,82,0.03)`).
- Serif display (Lora / Amiri) is reserved for hero greetings only. Everything else Inter / IBM Plex Sans Arabic, weights 400–800.
- **Motion language (one system, all agents follow it):** durations/easings from theme tokens only. Page enter = fade + 4px rise (250ms). Lists/grids = staggered reveal (30–40ms/item, cap ~8). Cards = hover lift (shadow token + 1px translate). Numbers on stat/IC/scorecard surfaces = count-up on first reveal (400ms, tabular-nums so nothing shifts). Agent Activity = choreographed stage reveals (shimmer → check morph). Streaming text appends smoothly (no jump-scroll). Logo bars = staggered rise (login + thinking states). Dialogs/popovers = scale 0.98→1 + fade (150ms). Nothing bounces, nothing spins, nothing exceeds 400ms. Subtle > flashy; `prefers-reduced-motion` respected free via motion.
- Empty states, loading states, and micro-copy are part of the task, not extras.
- Arabic must look as designed as English — check both before calling a screen done. Arabic financial/agent terminology must match the pitch-deck vocabulary in `context/pitch-deck-notes.md` (one register across slides and product).
- **Built for a projector**: demo renders on a screen/projector at 1366×768–1080p. Content text ≥15–16px, no information carried by faint grays alone, layouts intact at both viewports. When in doubt, one tint darker.

## Sensitive facts (do not violate)

- Never mention "Rogo" in any user-visible string, code comment, or commit message (internal docs only).
- The demo client is **Lunar Investments** (no "CMA-licensed"/"Shariah-compliant" labels); analyst persona **Arwa**; companies: Jahez (real), Masar / Thara Pay / Aqar Development (fictional).
- `ANTHROPIC_API_KEY` lives in `.env` (gitignored). Never log it, never commit it, and it must never reach the client bundle — the SDK is imported ONLY in server code (`lib/ai/client.ts`, API routes). No `NEXT_PUBLIC_` secrets, ever.
- Demo privacy posture (product claims shown in UI copy are fine; don't over-claim): "client data is never used for model training", per-workspace isolation, full audit trail. Do NOT claim SOC2/ISO/encryption certifications anywhere — say "enterprise controls on the MVP roadmap" instead.
