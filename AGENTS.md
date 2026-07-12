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

Next.js 15 (App Router, TS strict) · Tailwind v4 (theme lives ONLY in `app/globals.css` `@theme`) · radix-ui primitives (headless) · motion (animations) · lucide-react (icons) · next-intl (en default, ar) · @anthropic-ai/sdk · react-pdf · exceljs / pptxgenjs / docx · zod. Tests: vitest + @testing-library/react + Playwright. Fonts via next/font (no runtime CDN): Inter + Lora (EN), IBM Plex Sans Arabic + Amiri (AR).

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
- Motion: 200–300ms ease-in-out; streaming text, stage-timeline reveals, hover lifts on cards, skeleton shimmers. Subtle > flashy. Every interactive element has hover/focus/active states.
- Empty states, loading states, and micro-copy are part of the task, not extras.
- Arabic must look as designed as English — check both before calling a screen done.

## Sensitive facts (do not violate)

- Never mention "Rogo" in any user-visible string, code comment, or commit message (internal docs only).
- The demo client is **Lunar Investments** (no "CMA-licensed"/"Shariah-compliant" labels); analyst persona **Arwa**; companies: Jahez (real), Masar / Thara Pay / Aqar Development (fictional).
- `ANTHROPIC_API_KEY` lives in `.env` (gitignored). Never log it, never commit it.
