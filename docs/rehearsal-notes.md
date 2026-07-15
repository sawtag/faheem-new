# Dress rehearsal notes — 2026-07-13 (technical rehearsal, production build)

All measurements against `next build && next start`, `FAHEEM_MODE=cached`, laptop-class hardware.
Human on-stage rehearsal (spec §3 run of show, spoken, stopwatch) remains for sosi on the demo machine.

## Offline gauntlet — PASSED (the wifi-kill scenario)

Full walk with **every non-localhost request blocked** (0 external requests even attempted, 0 page errors):

| Beat | Time |
|---|---|
| Login page render | 0.6s |
| Sign-in → home (atmosphere hero) | 0.3s |
| Open seeded Jahez chat | 0.7s |
| Golden replay → Verified badge | streams with pacing |
| Citation chip → PDF opens + passage highlighted | 0.9s |
| IC room (table + disclaimer) | 0.7s |
| ⌘K palette → ic-rank prefill → send → replay | 0.5s to full text |
| Darb screening scorecard | 0.7s |

pdfjs worker: vendored, loads offline ✓. All six goldens replay from cache ✓ (`done.cached:true` drives the ⌘. overlay).

## Live Model beat (WS-F) — new in the run-of-show, flagged for re-rehearsal

Slots in right after **Deliverables** generate ("…and it's not a dead file" — the whole
point of the beat) and before **Upload any PDF** (README beat table: 10:30–12:30, ~2 min —
Upload/IC-room/Audit-close all shift by +2:00). This beat has not yet been walked with a
stopwatch on the production build — do that pass before the slot (plan §6: "you
re-rehearse the new beat"). Fully offline and scripted, same as the rest of cached mode.

**Where:** Jahez workspace → **Live Model** (header button, or `/deals/jahez/model`).

**⌘K entries — never type them:**

1. From anywhere, ⌘K → **Live Model** section → **"Raise FY26 order growth to 20%"** —
   selecting it navigates to the model (if you're not already there) and fills the
   command bar; press Enter/Apply. Watch the specialist team choreograph in order —
   Valuation → Critical Review → Compliance → Writing — while the DCF value/share and
   IRR count up to their new numbers.
2. Click any computed number (WACC on the DCF tab is a reliable one) → **Methodology**
   panel opens → drill **Cost of equity → Risk-free rate** → **Open source** — the PDF
   opens on the cited page, passage highlighted.
3. **The source-locked flourish:** ⌘K → **Live Model** → **"Change FY25 revenue to SAR 2
   billion"** — Critical Review refuses gracefully ("that figure is a sourced actual —
   source-locked"); the numbers never move. This is the beat that *proves* the
   immutability claim instead of merely stating it — don't skip it.

**What to say:** "This isn't a static export — it's the same engine that builds the
Excel, running live, right here in the browser, **and it's not a dead file**." After the
source-locked attempt: "Sourced actuals are locked — only assumptions are editable. Every
number you've seen today still resolves to either a source or a formula — here's the
formula, and here's where it bottoms out."

**Fallback:** if anything hiccups mid-recompute (a slow reveal, a stuck choreography
stage), hit **Reset to base** and carry on — the whole beat is offline and deterministic
(the scripted edit-parser, zero network calls), so a reset costs nothing and nothing is
actually lost. Same recovery instinct as the rest of cached mode: reload calmly, ⌘K
reopens the exact entry, never retype.

## Live path — PASSED (venue-network scenario, real API)

- **Prewarm** (fresh 1h-TTL cache write, 16-doc corpus): **17s**, cost ≈ $3–5. Run `npx tsx scripts/prewarm.ts` (with `.env` loaded) **within the hour before the slot**.
- **Live follow-up** (warm cache, workspace jahez): 4 citations, correct audited figure (SAR 510,685,237 cash), **~44s total**. Expect 30–60s for judge follow-ups — narrate over it ("the agents are reading the filings").
- **Upload beat** (Talabat Q1-26 deck, 3.4MB, never-seen doc): upload 3s → live cross-document answer in **16s**, 4 citations, figures correct (USD 2.7bn GMV, +18% y/y cc). Demo asset: `demo-assets/talabat-q1-2026-results.pdf` (gitignored — copy to the demo machine!).

## Artifact open-tests — PASSED

`soffice` opens all three committed artifacts cleanly (xlsx / docx / pptx → PDF conversion exit 0). LibreOffice recalculates the full model formula chain on open.

## Venue-day checklist

1. `git clone` (or the backup tarball) → `npm ci` → `cp .env(.example)` with the real key → `npm run build`.
2. Sanity: `FAHEEM_E2E_PROD=1 npm run test:e2e` once on the demo machine (≈3 min).
3. **Within 1h of the slot:** load `.env`, run `npx tsx scripts/prewarm.ts`.
4. Start: `PORT=3000 npm run start:cache` — cached is the bulletproof scripted-demo mode; **⌘. switches to live/auto** for judge Q&A (the overlay shows mode + cache status). (`start:auto` / `start:live` boot straight into those; bare `npm start` smart-defaults to auto when the key is present.)
5. Scripted questions: **⌘K only** — never type them (palette carries the exact recorded requests incl. chips).
6. Copy `demo-assets/talabat-q1-2026-results.pdf` to the demo machine for the upload beat (live mode only; cached mode politely refuses uploads).
7. The Improve wand hides itself on golden questions and no-ops in cached mode — safe to gesture at, click only on a scratch question in live mode.
8. Audit trail is curated to 35 plausible entries and grows during the demo — point at it in the governance close.
9. If wifi dies mid-live-answer: the engine auto-falls back to cache when the question is a golden; otherwise it shows the calm bilingual notice — segue: "and this is exactly why regulated institutions need the verified cached layer."

## Deviations / notes

- Replay pacing in cached mode reveals Agent Activity faster than live (~0.5–3s vs 30–60s) — by design; if asked, it's honest: "scripted beats replay our verified recorded runs; you're welcome to ask anything live."
- `presentation/` (pitch deck) and `demo-assets/` are local-only (gitignored).
- Serif hero (Lora/Amiri) confirmed rendering on the production build (fonts self-hosted at build time — the build machine needs network once).

## Preflight

`npx tsx scripts/preflight.ts [--live] [--port 3000]` — the single command to run on the venue
machine before going on stage. Automates the venue-day checklist above into a 12-section
green/red/yellow report, then prints a `PASS` / `FIX THE ABOVE` banner and a 4-line day-of
sequence. Exits 1 on any hard failure (warnings don't block).

Checks: Node ≥26 + build freshness · **CRITICAL:** every golden question except `deliverables`
resolves from `data/demo-cache/` and ends with a `done` event · corpus manifest integrity
(warn-only — doc count, size drift, Files-API `fileId`s) · `npm run validate:data` · fonts
self-hosted (`.next/static/media/*.woff2`) · `soffice` + the 3 committed fallback artifacts +
`deck-01..08` preview images · the upload-beat PDF (gitignored, copy it onto the machine by
hand) · the target port is free or already answering `/login` as Faheem · `ANTHROPIC_API_KEY`
(read from `.env` directly — Next auto-loads it for `npm run start`, but this is a bare script) ·
`data/audit-log.json` parses (reminder to reseed past ~60 rows) · **Live Model beat (WS-F):**
`buildModel(BASE_ASSUMPTIONS)` headline numbers byte-identical + Shariah PASS, the provenance
graph carries zero orphans, the edit-parser's scripted set (incl. an Arabic instruction and the
source-locked demo) still parses, `data/sentiment.json` / `data/social-pack.json` stay schema-valid
with no sourced-number shape, and every `FormulaDef`'s KaTeX renders — zero network calls.

`--live` adds one more check: a real, tiny (`max_tokens: 16`) Anthropic call through the same
`lib/ai/client.ts` the app uses, to prove the key/network actually work — it does **not** warm
the prompt cache (that's still `scripts/prewarm.ts`, run separately within 1h of the slot).
Without `--live`, preflight makes zero network calls to Anthropic.

Makes zero assumptions about who's already running what: if a `next dev` or `next start` is
already up on the target port and answers `/login`, that counts as a pass — it says which.
