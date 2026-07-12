# HANDOVER — Faheem build session

You are a fresh Claude Code session about to implement the **Faheem** hackathon demo end-to-end. Planning is 100% complete and locked — your job is execution, not redesign. **The goal is to WIN Amad 2026** (Track 1: GenAI for Fintech, judged on innovation, technical implementation, data analysis, UX, feasibility; demo day July 16–18, Riyadh).

## Read in this order (before any code)

1. `AGENTS.md` — the conventions contract for every agent you spawn. Non-negotiable rules.
2. `docs/superpowers/plans/2026-07-12-implementation-plan.md` — **THE plan**: task cards T0–T6 with owner model + effort, contracts (§3), phase gates A–G, testing strategy, kickoff sequence (§7). Execute it in order.
3. `docs/superpowers/specs/2026-07-12-faheem-demo-design.md` — the product spec: demo narrative (§3 run of show), screens (§4), architecture (§5), data pack (§6), brand tokens (§7), finance content (§11 — includes the founder glossary; keep it updated if finance copy changes).
4. `context/rogo-screens/CATALOG.md` — layout reference (what to build), `context/pitch-deck-notes.md` — narrative/terminology reference, `context/branding/figma-exports/` — visual brand reference.

## Operating model (how to spend tokens — this was explicitly designed by the user)

You (the main loop — fable, or opus if fable unavailable) are **orchestrator / architect / reviewer / master**. You write ONLY: `lib/types.ts` contracts, the `app/globals.css` theme, and surgical integration fixes. Everything else is delegated (Agent tool for one-offs, Workflow tool for fan-outs — the user has authorized subagent/workflow use for this build; the `fable-chief-agent` skill, if available, is the reference for this mode):

| Work | Model / effort |
|---|---|
| Chat engine, flagship chat UI, home, pipeline+workspaces, IC room, theme+primitives, xlsx model, figure extraction, final polish pass | **opus / high** |
| UI design briefs for the sonnet screens (T0.3) | **opus / high** |
| Supporting screens (login, connections+onboarding, agents+library — from the briefs, zero visual freestyling), docx/pptx, data authoring, market packs, e2e suite | **sonnet / medium** (high where the card says) |
| Corpus download/compress, leadership pack, fixtures, checklist sweeps | **haiku / low — never UI** |

Escalate one notch only after two failed acceptance rounds. Review every diff; run the design-QA gates yourself; spot-check the 12 stage-critical financial figures against the PDFs personally (gate B). Sub-agents return summaries + test output, never file dumps.

## Environment facts (verified 2026-07-12)

- Node 26 + npm installed; network fine; all 6 Jahez corpus URLs return 200 (sizes in spec §6).
- `.env` has `ANTHROPIC_API_KEY` — **but the org is on the free Evaluation plan.** Zero live API calls until needed; the automated test suite makes none by design. **Before P5 (Files-API upload, pre-warm, golden recording) the user MUST upgrade billing** (Console → Settings → Billing, ~$25–50 credits). If not upgraded when you reach P5, finish everything else and tell the user exactly what's blocked.
- **Verify before T1.1**: `gs` (ghostscript), `pdfinfo`/`pdftotext` (poppler), and `soffice` (LibreOffice, for artifact open-tests) exist on PATH — if missing, ask the user to install (Arch: `pacman -S ghostscript poppler libreoffice-fresh`).
- Repo is docs-only right now (no app code). Build at repo root. Commit early and often (conventional commits, `Co-Authored-By: Claude` per your defaults).
- **Git model**: remote `github.com/sawtag/faheem-new` (public — mind landmine #1 doubly: nothing Rogo-named in code/commits). `master` = demo-stable, `dev` = integration (you start here). Work each phase/task on a feature branch off `dev` (`feat/t2-engine`, `feat/t3-screens`…), PR into `dev` (use `gh`), and merge `dev → master` only at phase gates when `npm run verify` + e2e are green. `demo-rc1` tag lands on master.
- Figma MCP connector is authenticated if you need re-exports (file `ZHECLOgl3D76BXygcx5Nyf`); tokens are already extracted into the spec — don't re-derive them.
- **Playwright is the ONLY automated browser harness** (e2e, viewports, screenshots, offline, RTL sweep). If your session has browser/preview/devtools MCP tools, use them interactively for design-QA gates — but add no browser-automation dependency to the project.
- **Pre-installed tooling for you (user-level, 2026-07-12):** skills `tailwind-design-system` (Tailwind v4 tokens/design systems), `nextjs-app-router-patterns` (App Router/RSC), `vercel-react-best-practices` (React/Next perf), plus the environment's `frontend-design` and `dataviz` skills — load them for the matching tasks and pass their guidance into subagent briefs. MCP `context7` (live library docs) is connected — use it whenever an API detail for Next 16.2 / Tailwind 4.3 / radix-ui 1.6 / motion 12 might postdate your training; do NOT guess current APIs from memory.

## Landmines (each one has burned a demo before)

1. **Never render "Rogo"** in any user-visible string, comment, or commit message.
2. **Never invent a financial number** — everything displayed traces to `data/model-inputs.json` / `data/deals.json` with `{sourceDoc, page}`.
3. pdfjs worker must be **vendored locally** (react-pdf defaults to CDN) — offline e2e enforces this.
4. Golden cache keys hash the exact question text — the **demo palette (⌘K)** exists so nobody types on stage; record goldens THROUGH the same text the palette inserts.
5. Theme lives ONLY in `app/globals.css` `@theme`; physical direction classes (`ml-`/`pl-`…) are lint-banned — logical properties only.
6. Light mode only. Desktop laptop browser only (1366×768–1080p e2e viewports); mobile = zero effort.
7. Arabic register must match the pitch deck's vocabulary (`context/pitch-deck-notes.md`) — one terminology across product and slides.
8. The API key is server-only — SDK imports exist solely in `lib/ai/client.ts` + API routes.
9. Fictional names are FINAL: **Darb** (logistics SaaS, private inbound), **Thara Pay** (fintech, IC), **Aqar Development** (declined). Client firm: **Lunar Investments**; analyst: **Ali**. Jahez is real — treat its data with care.
10. No CodeRabbit. Use the built-in `/code-review` at P6.

## Definition of done

All plan checkboxes done; `npm run verify` + both e2e viewports green twice; goldens recorded for every scripted beat (EN + the Arabic Shariah beat) and fable-reviewed word-by-word; artifacts open in LibreOffice with source comments intact; audit trail grows during the golden path; full cached run survives a wifi kill; dress rehearsal (production build) timed against spec §3 with notes in `docs/rehearsal-notes.md`; tag `demo-rc1`.

## Open items owned by the user (do not block on them silently — remind when relevant)

1. Billing upgrade (blocks P5 only).
2. Review of the Darb synthetic data pack when authored (10 min, before demo day).
3. Demo-day logistics; optional Figma SVG logo exports (otherwise recreate per plan).

Good luck. Build it beautiful, keep every number sourced, and win.
