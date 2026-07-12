# AGENTS.md — Faheem build conventions

Read this before touching anything. It is the contract for every agent working in this repo.

## What this is

**Faheem** — a Rogo-style agentic AI platform for Saudi investment firms, built as a **hackathon demo** (Amad 2026, July 16–18). One Next.js app, localhost, Claude API, static verified data. The demo story, screens, and data pack are specified in `docs/superpowers/specs/2026-07-12-faheem-demo-design.md` (THE spec). The build plan with task ownership is `docs/superpowers/plans/2026-07-12-implementation-plan.md` (THE plan). Design reference: `context/rogo-screens/CATALOG.md` (layouts) + `context/branding/figma-exports/` (brand). **Goal: win. The frontend must be beautiful; the numbers must be real.**

## Commands

```bash
npm install              # deps (npm + Node — deliberately boring; no bun anywhere)
npm run dev              # next dev
npm run check            # tsc --noEmit && eslint . && prettier --check .
npm run test             # vitest run (unit + integration)
npm run test:e2e         # playwright (starts app with FAHEEM_MODE=cached)
npm run validate:data    # zod-validate corpus manifest, deals.json, model-inputs.json
npm run verify           # check + test + validate:data (the pre-commit gate)
```

## Demo tech stack (locked — no new dependencies without fable's approval)

| Layer | Choice | Notes |
|---|---|---|
| Framework / runtime | **Next.js 16** (latest stable — 16.2.x verified on npm 2026-07-12; App Router, TS strict) on **Node 26 + npm** | Single process on localhost. No bun anywhere. next-intl peer-supports ^16. |
| Styling | **Tailwind v4** (latest 4.3.x) — ONE theme via `@theme` in `app/globals.css` | `cva` + `clsx`/`tailwind-merge` for component variants; `tabular-nums` utility for financial figures. Never a hex/shadow inline. v5 beta considered and REJECTED for the demo (user + fable agree 2026-07-12): beta tooling risk, zero judge-visible upside. |
| UI components | **radix-ui** (headless primitives) wrapped in our own `components/ui/*` | Deliberately NO component kit (HeroUI/AntD/MUI rejected: recognizable house looks + their theming engines fight the single-`@theme` rule). Every pixel is ours. |
| Animation | **motion** | One library, one easing personality — see Motion language below. No GSAP/Three.js. |
| Icons | **lucide-react** | Consistent stroke grid; `simple-icons` glyphs allowed for international connector logos. |
| i18n | **next-intl** (en default, ar, cookie locale, `dir` switch) | |
| AI | **@anthropic-ai/sdk** — server-only, via `lib/ai/client.ts` exclusively | Citations + prompt caching + Files API per plan §3 contracts. |
| Documents / artifacts | **react-pdf** (pdfjs worker vendored locally) · **exceljs** · **pptxgenjs** · **docx** | |
| Validation | **zod** (data schemas: manifest, deals, model-inputs, cache entries) | |
| **Data layer** | **NO database — deliberate.** Git-versioned JSON (`data/deals.json`, `model-inputs.json`, `manifest.json`, `seed-chats.json`, append-only `audit-log.json`) + localStorage for runtime-created chats | Read-mostly verified demo data; JSON diffs are human-reviewable (enforces "no invented numbers"), a fresh clone is demo-ready, zero migrations/services. If a real relational need ever emerges: `better-sqlite3` (embedded, sync) — NEVER a second server process (no Mongo/Postgres for the demo). |
| Testing | **vitest** + @testing-library/react (unit/integration/component) · **Playwright** (sole browser harness) | node:test rejected (no TSX/jsdom/`vi.mock` comfort); second browser harness rejected. |

**Fonts (locked, via next/font — no runtime CDN):** UI/body = **Inter** (EN) + **IBM Plex Sans Arabic** (AR; chosen over Tajawal — enterprise register, harmonizes with Inter). Hero serif (omnibox greeting ONLY) = **Lora** (EN) + **Amiri** (AR). Financial tables/figures always render digits in Inter with `font-variant-numeric: tabular-nums` (token/utility in globals.css).

**Assets policy:** vendor-first (`public/` or inline SVG) — it's nearly free and, with cached mode, makes the demo survive total network loss (venue will have wifi/hotspots, so a CDN is *acceptable* when vendoring is genuinely awkward — but don't reach for one out of laziness; the only thing that should truly need the network is a live Anthropic call). Faheem logo = clean inline SVG recreated/enhanced from the Figma logo system (bars+arrow glyph is animatable — use it). Real-company logos (Jahez) may be fetched once and vendored; fictional companies and Saudi connectors without clean SVGs (Argaam, SAHMK, Tadawul, Alinma) get consistent monogram tiles (initial + tint from the theme); international connectors may use `simple-icons` glyphs. People: no photos — initials-avatar tiles (Arwa "A" navy tile; leadership grid = initials + name + role + source link).

## Hard rules

1. **No dark mode.** Light only. Never write `dark:` variants.
2. **Every string is bilingual.** All copy goes through next-intl (`messages/en.json` + `messages/ar.json`). Never hardcode UI text. Financial figures use Western digits in both languages.
3. **RTL is not optional.** Use logical properties only (`ms-`/`me-`/`ps-`/`pe-`/`start-`/`end-`, never `ml-`/`mr-`/`pl-`/`pr-`/`left-`/`right-` unless direction-independent). Icons that imply direction flip with `rtl:` variants.
4. **Theme tokens only — lint-enforced.** Colors, radii, shadows, spacing, motion come from `@theme` variables in `app/globals.css`. Never hardcode a hex value or ad-hoc shadow anywhere in `app/` or `components/` (ESLint bans hex literals there; inline SVGs use `currentColor` / `var(--color-*)`). **Single carve-out:** `lib/generate/**` — Office file formats (xlsx/pptx/docx) have no CSS variables, so Lunar brand hexes live in ONE exported constants object (`lib/generate/shared.ts` → `lunarBrand`), nowhere else. Extending the theme = edit globals.css, nothing else.
5. **Never invent a financial number.** Displayed figures come from `data/model-inputs.json` or `data/deals.json` (each carries `{value, sourceDoc, page}`). AI answers are grounded by API-enforced citations. If a number has no source, it does not ship.
6. **Less LoC of good code.** No abstractions for single call sites, no config for things that don't vary, no error handling for impossible states, no `utils.ts` graveyards. Prefer deleting to wrapping. Server components by default; `"use client"` only where interaction demands it.
7. **Stay in your lane.** Each task card lists the files you own. Do not edit shared files (`lib/types.ts`, `app/globals.css`, primitives in `components/ui/`) — request changes through fable instead.
8. **Tests land with the code.** A task is done when `npm run verify` is green and your task's acceptance tests pass. Component tests for logic (not snapshots); e2e specs live in `e2e/`.
9. **Commits**: conventional (`feat:`, `fix:`, `test:`, `chore:`), small, after each task's acceptance passes.
10. **Mock boundaries**: auth is fake (any username/password logs in — cookie `faheem_session`, no real security), connectors are fake (UI-only OAuth modals), Anthropic API is REAL (via `lib/ai/client.ts` only — injectable for tests; never instantiate the SDK elsewhere; never call it in unit tests).

## Design bar (the FE must impress)

- **Use and EXTEND the Figma branding — explicitly licensed.** The Faheem UI Kit (`context/branding/figma-exports/`) is the floor, not the ceiling: enhance and edit as you see fit — tint ramps, elevation scale, refined logo geometry, motion, new component styles the kit never defined. Two constraints only: every extension lands as a token in `app/globals.css` (rule 4), and the result must still read as the same brand (navy + emerald, quiet finance-terminal confidence).

- **Layouts: Rogo is a reference, not a constraint** (user call 2026-07-12). Keep the demo-load-bearing patterns — sidebar + centered omnibox hero, split chat + artifact panel, inline citation chips + Sources accordion (CATALOG.md §2–§4) — and design everything else on your own judgment when your idea beats the reference. Skin = Faheem UI Kit (navy `--color-navy` #061F52, emerald `--color-accent` #07966F, bg #FBFCFE, border #E3E9F1; radius 8/12/20; shadow `0 10px 24px rgba(8,33,82,0.03)`).
- Serif display (Lora / Amiri) is reserved for hero greetings only. Everything else Inter / IBM Plex Sans Arabic, weights 400–800.
- **Motion language (one system, all agents follow it):** durations/easings from theme tokens only. Page enter = fade + 4px rise (250ms). Lists/grids = staggered reveal (30–40ms/item, cap ~8). Cards = hover lift (shadow token + 1px translate). Numbers on stat/IC/scorecard surfaces = count-up on first reveal (400ms, tabular-nums so nothing shifts). Agent Activity = choreographed stage reveals (shimmer → check morph). Streaming text appends smoothly (no jump-scroll). Logo bars = staggered rise (login + thinking states). Dialogs/popovers = scale 0.98→1 + fade (150ms). Nothing bounces, nothing spins, nothing exceeds 400ms. Subtle > flashy; `prefers-reduced-motion` respected free via motion.
- Empty states, loading states, and micro-copy are part of the task, not extras.
- Arabic must look as designed as English — check both before calling a screen done. Arabic financial/agent terminology must match the pitch-deck vocabulary in `context/pitch-deck-notes.md` (one register across slides and product).
- **Desktop-first**: the demo runs in a laptop browser (~1366×768–1920×1080). Content text ≥15–16px. Mobile is NOT a target — don't break it gratuitously, but spend zero effort on it.

## Sensitive facts (do not violate)

- Never mention "Rogo" in any user-visible string, code comment, or commit message (internal docs only).
- The demo client is **Lunar Investments** (no "CMA-licensed"/"Shariah-compliant" labels); analyst persona **Arwa**; companies: Jahez (real), Darb / Thara Pay / Aqar Development (fictional).
- `ANTHROPIC_API_KEY` lives in `.env` (gitignored). Never log it, never commit it, and it must never reach the client bundle — the SDK is imported ONLY in server code (`lib/ai/client.ts`, API routes). No `NEXT_PUBLIC_` secrets, ever.
- Demo privacy posture (product claims shown in UI copy are fine; don't over-claim): "client data is never used for model training", per-workspace isolation, full audit trail. Do NOT claim SOC2/ISO/encryption certifications anywhere — say "enterprise controls on the MVP roadmap" instead.
