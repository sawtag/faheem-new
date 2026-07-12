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
4. Start: `FAHEEM_MODE=cached PORT=3000 npm run start` — cached is the bulletproof default; **⌘. switches to live/auto** for judge Q&A (the overlay shows mode + cache status).
5. Scripted questions: **⌘K only** — never type them (palette carries the exact recorded requests incl. chips).
6. Copy `demo-assets/talabat-q1-2026-results.pdf` to the demo machine for the upload beat (live mode only; cached mode politely refuses uploads).
7. The Improve wand hides itself on golden questions and no-ops in cached mode — safe to gesture at, click only on a scratch question in live mode.
8. Audit trail is curated to 35 plausible entries and grows during the demo — point at it in the governance close.
9. If wifi dies mid-live-answer: the engine auto-falls back to cache when the question is a golden; otherwise it shows the calm bilingual notice — segue: "and this is exactly why regulated institutions need the verified cached layer."

## Deviations / notes

- Replay pacing in cached mode reveals Agent Activity faster than live (~0.5–3s vs 30–60s) — by design; if asked, it's honest: "scripted beats replay our verified recorded runs; you're welcome to ask anything live."
- `presentation/` (pitch deck) and `demo-assets/` are local-only (gitignored).
- Serif hero (Lora/Amiri) confirmed rendering on the production build (fonts self-hosted at build time — the build machine needs network once).
