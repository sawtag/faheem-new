# BUILD BRIEF — Faheem "Live Model + Auditable Computation + Agent Team" wave

You are a fresh AI session picking up an **additive feature wave** on top of a **complete, shipped, working demo**. The base product (Amad 2026 hackathon demo — an agentic AI platform for Saudi investment firms) is done and tagged `demo-rc2` on `master`. Your job is to build the next wave *without ever breaking that floor*. **The goal is to WIN the hackathon; the FE must be premium and the numbers must be real.**

## Read in this order (before any code)

1. **`docs/superpowers/plans/2026-07-13-live-model-provenance-plan.md`** — THE plan for this wave. Pillars, contracts, workstreams (with per-task model+effort), quality gates G1–G7, the full testing strategy, the AGENTS.md/README edits. Execute it.
2. **`AGENTS.md`** — the conventions contract for every agent. Non-negotiable. (You will *add* rules to it at G7 — see the plan §0 and §7.)
3. **`docs/superpowers/specs/2026-07-12-faheem-demo-design.md`** — the product spec. §11 has the finance content + founder glossary (reuse for the Methodology explainers). §3 is the run of show (you add one beat).
4. **`docs/rehearsal-notes.md`** + **`docs/judge-qa-pack.md`** — how the demo runs and the questions it must survive. Your new beat must slot into the run of show and the Q&A must stay true.

## What already exists (the floor — do not regress)

- **A complete demo**, `master` @ `demo-rc2`: login → onboarding → pipeline + Darb screening scorecard → Jahez chat with citations → Arabic/Shariah beat → deliverables (xlsx/docx/pptx + in-app preview) → IC room → dashboard (with an "Analysis Runs" panel) → audit trail → skills library → live PDF upload. Bilingual EN/AR, full RTL.
- **The suite is green** and must stay green: `npm run verify` (tsc + eslint + prettier + ~314 unit tests + `validate:data`) and `FAHEEM_E2E_PROD=1 npm run test:e2e` (190 e2e × 2 viewports, against a production build). Treat **green-twice at both viewports** as the gate, not a specific count.
- **Citation passage-highlighting already works** — `lib/highlight.ts` (the matcher, 120/120 recorded quotes match, with canvas-level recalibration) + `components/chat/highlight-bus.ts` + `components/chat/pdf-panel.tsx`. Your provenance work *reuses* this for sourced leaves; do not rebuild it.
- **`computeModel()` lives in `lib/generate/xlsx.ts:335`** (returns `ModelResult`, base case, no args) and is imported by `docx.ts`, `pptx.ts`, `shared.ts`. **WS-A extracts it to a pure `lib/model/`** shared by the xlsx builder *and* the new Live Model UI — this is the critical-path refactor; its outputs (per-share 14.36 / IRR 17.1% / weighted 16.8% / Shariah PASS / one-off 55.4M) must stay **byte-identical** (snapshot-gated, G3), or the Excel, the memo/deck, `deals.json` IC metrics, and the recorded goldens all drift.
- **Data layer** (git-versioned JSON, no DB): `data/corpus/manifest.json` (16 docs, Files-API `fileId`s set), `model-inputs.json` (91 sourced figures `{value, sourceDoc, page}`), `deals.json`, `golden-questions.json` (**11** entries), `data/demo-cache/*.json` (**11** recorded goldens — **SACRED, never edit; cache keys hash the exact question text**), `firm.json`, `runs.json`, `audit-log.json`, `seed-chats.json`, `sentiment`/`social-pack` are yours to add.
- **Stage-safety systems:** the ⌘K demo palette (`lib/demo/`, `components/demo/palette.tsx`) inserts exact recorded requests; ⌘. mode overlay; `scripts/prewarm.ts` (warms both jahez + ic contexts), `scripts/record-goldens.ts`, `scripts/preflight.ts` (one-command venue check — extend it for the new goldens).

## Operating model (how to spend effort)

You are the orchestrator/architect/reviewer (Opus main loop — the user has **no Fable tokens**, so anything the plan calls "fable" is you or an Opus subagent). Delegate the labor:

- **Contracts (`lib/model/types.ts`, the `Provenance`/`ValueNode`/`Assumptions` shapes, AGENTS.md rule additions): you write these** before workstreams start.
- **Workstreams in parallel git worktrees** (they touch overlapping model/UI files). Per-task tier × effort is pinned in the plan §3 (opus/high for the provenance engine, model extraction, Live Model UI, grid spike; sonnet/medium for the methodology-panel UI, roster, email, choreography; haiku/low for glossary content + screenshots). Use `Workflow` for fan-outs, `Agent` for one-offs. Escalate a notch only after two failed acceptance rounds.
- **Review every diff and run the gates yourself.** Sub-agents return summaries + verbatim test output, never file dumps. The provenance adversarial gate (G2) and the formula-correctness gate (G5) are where being the strongest reviewer matters most — do not rubber-stamp them.
- **Never touch `master` until G7.** Each workstream: branch off `dev` in a worktree → build → its acceptance + `npm run verify` green → you review the diff (and rendered screens for UI) → merge to `dev`. Promote `dev`→`master` and tag `demo-rc3` only when every gate is closed and prod e2e is green ×2.
- **Messages/i18n:** agents append **namespaced keys only** to `messages/{en,ar}.json` (deep-merge conflicts on the JSON — the prior wave hit this repeatedly; merge by union, never overwrite a sibling namespace).

## Landmines (each can lose the demo)

1. **Never name a competitor** in any user-visible string, comment, or commit — ChatGPT / Claude / Copilot / Gemini / Rogo. (New AGENTS.md Rule 0.) Answer comparisons by capability, only if asked.
2. **No orphan numbers.** Every rendered number resolves to a terminating provenance — sourced (PDF + highlight) or computed (formula + input chain bottoming out at a source/assumption). G2 walks *every* number and proves it. This is the thesis; it must be a *tested* guarantee.
3. **Sourced actuals are immutable; only assumptions are editable.** The model-edit parser whitelists assumption keys; editing an actual → graceful "source-locked". Never let the AI write a number into a sourced cell.
4. **Do not drift `computeModel` outputs.** Snapshot-gate the extraction (G3). The goldens, IC metrics, and Office files all depend on those exact numbers.
5. **The 11 recorded goldens + their cache files are sacred.** Don't edit them; don't change `golden-questions.json` question text for existing entries. New scripted edits get *new* goldens, recorded live and reviewed word-by-word.
6. **Sentiment never emits a sourced number** — label + one-line rationale, "signal only," reads a **clearly-labeled illustrative** synthetic social pack (never presented as real scraped data). Real feeds are a roadmap connector.
7. **Formulas shown to finance judges must be textbook-correct AND match what `computeModel` actually does** (G5). A wrong formula in front of bankers is worse than no feature.
8. **The grid is the one real UI unknown** — WS-B0 is a spike with a kill-switch (G1). If neither an own-built grid nor a library reaches flagship polish, cut Live Model and ship rc2. The model grid body is numeric/LTR by finance convention (Western digits even in Arabic — spec §7); only labels/chrome flip, which relaxes RTL pressure on the grid.
9. **API key is server-only** (`lib/ai/client.ts` + API routes only), never logged, never in the client bundle, never in unit tests. Live calls cost real money — the suite makes **zero**; goldens are recorded deliberately via `record-goldens.ts` (prewarm within 1h). Budget is limited (~$60 left); record efficiently.

## Environment (verified 2026-07-13)

- Node 26 + npm; `soffice` (LibreOffice), `gs` (ghostscript), `pdfinfo`/`pdftotext` (poppler) on PATH. `.env` has a real `ANTHROPIC_API_KEY` (paid). Corpus is uploaded to the Files API (16/16 `fileId`s in the manifest).
- Ports: dev/prod use 3000 by default; parallel worktrees must use a `PORT=` override for e2e (`playwright.config.ts` honors it) or they silently test the wrong server.
- New dependencies are **allowed** (user unlocked the stack for this wave — KaTeX for formulas, a grid lib if the spike picks one, etc.). Document each in AGENTS.md at G7. Still: never guess post-training APIs — web-search official docs, delegate the lookup to a cheap subagent so the payload stays out of your context.
- `demo-assets/` and `presentation/` are gitignored (local-only). `demo-rc2` is the floor; a backup tarball + demo video exist under `~/dev/projects/`.

## Definition of done

All plan workstreams merged; gates G1–G7 closed; `npm run verify` + `FAHEEM_E2E_PROD=1 npm run test:e2e` green twice at both viewports; the provenance adversarial gate proves zero orphan numbers app-wide; `computeModel` snapshot unchanged; new scripted-edit + sentiment goldens recorded and reviewed word-by-word; the Live Model beat integrated into the run of show, ⌘K palette, golden-path e2e, and rehearsal notes; the Methodology panel drills any computed number to a highlighted source PDF; AGENTS.md + README updated (new rules, feature, beat, screenshot, test counts); `scripts/preflight.ts` extended and passing; `master` promoted and tagged `demo-rc3`; backup tarball + demo video rebuilt.

## Decisions already locked (do not relitigate)

- **Provenance is two-tier** (sourced / computed-with-input-chain); **assumptions editable, actuals locked**; **no orphan numbers** (tested).
- **Formulas stay** (progressive disclosure: explainer → formula → inputs).
- **Roster ≈14 curated substantive agents** (add Accounting/QoE, Critical Review, News Intelligence, Sentiment; keep the existing set); "specialist teams · 20+ agents" framing; no empty cards.
- **Sentiment ships live** as a qualitative card reading a cached illustrative social pack; **Draft-to-IC** (compose modal → `mailto`, human sends) is in.
- **Scope is ONE model** (the Jahez DCF), not a general spreadsheet platform.

## Open items owned by the user

1. Any updated inspiration screens (they mentioned wanting to share more) — proceed with `context/rogo-screens/` as the floor if none arrive.
2. Re-rehearsing the new beat before Friday's submission (demo day: submit Fri 2026-07-17, present Sat 2026-07-18).

Build it beautiful, keep every number traceable to its source or its formula, and win.
