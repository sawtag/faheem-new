# Faheem — Live Model + Auditable Computation + Expanded Agent Team (build plan)

> **Status:** proposed, awaiting sosi's `go`. No code until approved. `master` / `demo-rc2` is the untouched floor; nothing lands on `master` until the final gate (G7) clears.
> **Operating model:** Opus main loop as orchestrator/reviewer (no Fable tokens); labor delegated to opus/sonnet/haiku subagents at the effort each task warrants, in git worktrees. Fan-outs via Workflow.
> **Why this feature set:** it converts our thesis — *every number has a source, humans decide, a specialist team does the work* — from static into kinetic, and it does so in ways a single chat model structurally cannot. That is the differentiation. We never name a competitor to make the point (see Rule 0).

---

## 0. New hard rules (added to AGENTS.md at G7)

- **Rule 0 — no competitor names, ever.** No user-visible string, comment, or commit may name ChatGPT, Claude, Copilot, Gemini, Rogo, or any competitor. We answer comparison questions (if asked) by naming *capabilities*, not products. Extends the existing Rogo landmine to all competitors.
- **Rule 5 (extended) — two-tier provenance, no orphan numbers.** Every user-visible number resolves to one of:
  1. **sourced** — a real actual → PDF opens at the cited page, passage highlighted (exists today); or
  2. **computed** — a formula + an **input chain**, each input itself sourced/computed/assumption, the recursion terminating at a sourced actual or a labeled assumption.
  No number may render without a terminating provenance. **Sourced actuals are immutable; only assumptions are editable.**
- **Rule (new) — sentiment/qualitative signals never emit a sourced number.** The sentiment agent outputs a *label + one-line rationale*, explicitly marked "signal only — not a valuation input." Its rationale may cite the news/industry pack **or a clearly-labeled synthetic social pack** (illustrative demo data — never presented as real scraped posts, never a sourced figure). It may never feed the model or claim a sourced number. Production connects real social / alt-data feeds — shown as a **roadmap connector** on the Connections page, same posture as our other MVP integrations.

---

## 1. The three pillars

### Pillar 1 — Provenance: make computation itself auditable (the spine)

Every number carries a `Provenance`. Clicking any number opens a **Methodology panel**:

- **sourced** → the existing PdfPanel at the page, passage highlighted.
- **assumption** → the editable field + its rationale (analyst judgment, what would change it).
- **computed** → the **formula** (rendered), a **plain-language explainer** (from the spec §11 glossary), and the **input chain** — each input a chip that drills into *its* provenance. Example: `WACC 13.31% → Ke = rf + β·ERP → rf 4.60% (sourced: sukuk, PDF) · β 1.82 (computed from comp betas → drills further) · ERP 5.01% (sourced: Damodaran, PDF)`.

The recursion always bottoms out at a source or a labeled assumption. This makes *"every number has a source"* true even for derived numbers — you can audit any figure to bedrock. Offline-safe: our glossary + formulas are local; an external "learn more" link is optional, never load-bearing.

### Pillar 2 — Live Model: the model, alive and governed

A valuation model **inside Faheem** (tabs: Assumptions / DCF / Sensitivity, mirroring the generated Excel). You **select a cell** and tell Faheem in plain language to change an **assumption** → `computeModel()` re-derives in-browser (deterministic, offline, already-correct — it's the same TS that builds the Excel) → outputs count-up, every cell's Methodology updates, the change is logged to the audit trail. **Sourced actuals are locked** (editing one → *"that figure is source-locked"*). The recompute is choreographed as the specialist team working (Pillar 3).

### Pillar 3 — the visible specialist team

- **Choreographed recompute:** changing an assumption visibly runs the relevant agents — **Valuation** recomputes → **Critical Review** re-verifies the provenance chain → **Compliance** re-checks the compliance ratios if debt moved → **Financial Writing** updates the recommendation line — in the existing Agent Activity timeline. A team, not a function call.
- **Curated roster expansion** (each card substantive, or it's cut — no padding):
  - *Add:* **Accounting & Quality-of-Earnings** (the "is the SAR 55M really one-off?" work), **Critical Review** (adversarial red-team; distinct from Compliance's fact-check; the star of the governance story), **News & Market Intelligence** (cites the industry pack), **Market Sentiment** (qualitative signal per Rule; label + one-line read: meme-stock/bubble/short-squeeze/macro color — "signal only"; reads a cached synthetic social pack).
  - Keep the existing 10 (orchestrator, screening, research, doc-intel, valuation, comparables, risk, writing, compliance, ic).
  - Framing stays "specialist teams · 20+ agents" (teams-of-agents); ~14 named cards.

---

## 2. Architecture & contracts (fable-owned; authored before workstreams start)

New/changed types (in `lib/types.ts` or a new `lib/model/types.ts` — decided at contract time):

```ts
// Provenance — the spine.
type Provenance =
  | { kind: "sourced"; docId: string; page: number; quote?: string }
  | { kind: "assumption"; assumptionKey: string; rationaleKey: string }
  | { kind: "computed"; formulaId: string; inputs: string[] /* valueKeys */ };

// Every number the model exposes.
interface ValueNode { value: number; unit: string; provenance: Provenance }

// The model, pure & client-safe.
type ModelKey = string; // "wacc" | "dcf.ev" | "irr.base" | "assumptions.terminalGrowth" | "fy25.gmv" | ...
interface Assumptions { /* editable inputs: beta, terminalGrowth, forecast growth/margins, scenario weights, hold years, tax */ }
interface ModelOutputs { nodes: Record<ModelKey, ValueNode> } // includes locked actuals + assumptions + computed
export function buildModel(a: Assumptions): ModelOutputs;
export const BASE_ASSUMPTIONS: Assumptions;

// Formula content registry — id → rendered formula + explainer.
interface FormulaDef { id: string; katex: string; explainer: Localized; external?: string }
```

**Invariants (enforced by tests):** every `computed` node's `inputs` resolve to real `ModelKey`s; every `formulaId` has a `FormulaDef`; the provenance graph is acyclic and every path terminates at `sourced` or `assumption`; `buildModel(BASE_ASSUMPTIONS)` reproduces today's numbers exactly (14.36 / 17.1% / 16.8% / Compliance PASS / one-off 55.4 …).

---

## 3. Workstreams (owner · model · effort · deps · acceptance)

All in worktrees off `dev`. `[C]` = fable-authored contract precedes it.

**WS-A — Provenance engine + model extraction** · **opus · high** · the critical-path spine
Extract `computeModel` from `lib/generate/xlsx.ts` → pure `lib/model/{compute,provenance,formulas}.ts`; emit a `ValueNode` per output with `formulaId` + input `ModelKey`s; refactor the xlsx builder to consume `.value` (output unchanged). Author the FormulaDef registry (WACC, DCF EV, Gordon TV, IRR, contribution margin, take rate, sensitivity, Compliance ratios).
*Acceptance:* snapshot test — every base-case number byte-identical to today; xlsx/docx/pptx read-back tests still pass; `deals.json` IC metrics unchanged; provenance-graph invariants test green (no orphans, acyclic, terminating). **→ G3, G2.**

**WS-A2 — Methodology panel + glossary content** · **sonnet · medium** (UI) + **haiku · low** (content) · dep: A contract
KaTeX formula render + explainer (transcribe/extend spec §11 glossary, EN/AR) + input-chain drill-down that reuses the existing PdfPanel for sourced leaves. Progressive disclosure: explainer first, formula shown, inputs expand.
*Acceptance:* component tests — sourced leaf opens PdfPanel at page w/ highlight; computed renders formula + drillable inputs; every input chip navigates to its node; bilingual.

**WS-B0 — Grid spike + decision** · **opus · high** · **→ GATE G1**
Throwaway prototype: (a) our own themed cell-grid vs (b) a canvas grid lib (Glide Data Grid, MIT, or equivalent). Decide on: flagship polish reachable, theme-ability, selection UX, and **note** the model grid is numeric/LTR by finance convention (Western digits even in Arabic — spec §7), so Arabic applies to labels/chrome, relaxing RTL pressure on the grid body. Pick the faster path to *flagship*.
*Acceptance:* a rendered prototype + my go/no-go on the approach. If neither is flagship-reachable, we cut Live Model and ship rc2 — cheap to learn.

**WS-B — Live Model surface** · **opus · high** · dep: A, B0(G1) · **→ G4**
Model view (Assumptions editable / actuals locked with source caption + lock affordance / outputs / sensitivity / live charts reusing existing chart primitives). Cell selection, recompute→count-up→changed-cell highlight→"N cells updated" diff, Reset-to-base. Bilingual chrome + numeric-LTR body.
*Acceptance:* component + e2e (below); my design QA EN+AR at 1920+1366 (flagship bar).

**WS-C — Conversational edit + agent choreography** · **opus · medium** (parse) + **sonnet · medium** (choreography) · dep: B
`/api/model-edit`: `{assumptions, selection, instruction, lang} → {assumptionKey, value}` with a **hard whitelist** (assumption keys only; editing a sourced actual → graceful "source-locked" event). Scripted demo edits pattern-matched/cached (offline-deterministic); live parse for judge what-ifs. Recompute rendered as the agent-team choreography (Valuation→Critical Review→Compliance→Writing).
*Acceptance:* unit — whitelist rejects actuals, accepts assumptions, parses the scripted set; SDK mocked, zero live calls in suite; e2e — NL edit → recompute → choreography visible.

**WS-D — Expanded agent roster + Sentiment** · **sonnet · medium** (+ me: which cards ship) · parallel
Registry additions (accounting-qoe, critical-review, news-intel, sentiment) with methods/data story; Agents page + dashboard runs updated; `data/social-pack.json` (a handful of **clearly-labeled illustrative** posts/headlines on the Saudi q-commerce narrative — price war, Q1 loss chatter, macro color); `data/sentiment.json` (per-company label + one-line rationale citing the social pack + "signal only"); a small Sentiment card on workspace/dashboard; a "Social & Alt-Data — roadmap" connector on the Connections page.
*Acceptance:* e2e — new cards render bilingual; sentiment card shows label + rationale + "signal only" disclaimer; the social pack renders with its "illustrative demo data" label; a test asserting sentiment carries **no** numeric `value` claiming a source.

**WS-E — Draft to IC / Outlook** · **sonnet · medium** · parallel, independent
In-app compose modal (recipients pre-selected chips, Faheem-written body referencing artifacts + headline numbers, all editable) → "Open in Outlook" (`mailto`, human sends) → audit entry.
*Acceptance:* e2e — modal opens, body populated, mailto href well-formed, audit grows.

**WS-F — Integration, goldens, polish, docs, ship** · me + **opus · high** (final polish + code review) + sonnet (e2e/docs) + haiku (screenshots) · dep: B, C, D, E
Record scripted-edit + sentiment goldens live (my word-by-word review); ⌘K palette entries for the edit instructions; golden-path e2e extended with the Live Model beat; run-of-show + rehearsal notes updated; **opus polish pass** across all new surfaces (the premium bar); opus code review; **AGENTS.md + README** updated; full prod e2e ×2; `demo-rc3`; rebuild backup tarball + demo video. **→ G5, G6, G7.**

**Topology:** A, A2-content, B0, D, E launch in parallel. A2-UI follows A's contract. B follows A + G1. C follows B. F is the convergence. Contracts (`[C]`) authored by me before A/C start.

---

## 4. Quality gates (not dates — we build it fully)

- **G1 — grid** hits flagship, or Live Model is cut (rc2 floor).
- **G2 — provenance adversarial** (opus, high effort): a checker walks **every number rendered anywhere** (model, dashboard, chat tables, scorecards, memo) and asserts each resolves to a terminating provenance. Zero orphans. This is the correctness heart and makes "every number sourced" a *tested guarantee*.
- **G3 — engine snapshot:** base-case numbers byte-identical; goldens + IC metrics + Office read-backs intact.
- **G4 — Live Model design QA:** flagship polish, EN + AR, 1920 + 1366, motion within the language. My eyes.
- **G5 — formula correctness:** displayed formulas are textbook-correct **and** match what `buildModel` actually computes (finance judges will read them). My review + a finance-lens verify.
- **G6 — goldens reviewed word-by-word** + immutable-actuals invariant verified end-to-end + full prod e2e ×2.
- **G7 — code review** (API-key exposure, cache integrity, provenance invariants, no golden breakage) + AGENTS.md/README updated + promote `master` + tag `demo-rc3`.

---

## 5. Testing strategy (FE-weighted — this is a judged demo)

**Unit (vitest):** `buildModel` snapshot (numbers frozen); provenance-graph invariants (acyclic, terminating, no orphans, every formulaId resolves); model-edit whitelist (accept assumptions / reject actuals / parse scripted set); sentiment carries no sourced number; formula-content integrity (every referenced id present, KaTeX parses).

**Component (vitest + testing-library):** Methodology panel (sourced→PdfPanel, computed→formula+drillable inputs, assumption→editable); grid selection + edit + locked-actual rejection; recompute animation + diff; Sentiment card; compose modal.

**E2E (Playwright, both viewports, cached, offline-asserted):** the Live Model beat — open model → select assumption → NL edit → recompute → outputs change → open a computed cell → Methodology → drill the input chain to a source PDF → **highlight visible** → change in the audit trail; locked-actual edit rejected gracefully; draft-to-IC modal → mailto. Zero non-localhost requests. RTL sweep includes `/…/model`.

**Adversarial provenance gate (G2):** the walk-every-number test above, run in CI-style as the release gate.

**Visual / design QA gates (G4):** screenshot grids EN+AR at both viewports, reviewed by me for the flagship bar — the "impress the judges" gate, treated as a first-class deliverable, not an afterthought.

**Golden recording:** scripted edits + sentiment + any new chat beats recorded live, reviewed word-by-word, cached for stage; ⌘K palette carries the exact text.

**Regression:** existing 315 unit + 190 e2e stay green throughout; new tests land with each task; `npm run verify` + prod e2e ×2 at G6.

---

## 6. Demo integration (run-of-show delta)

New beat, right after deliverables generate ("…and it's not a dead file"): open Live Model → scripted assumption edit → watch the team recompute → open a computed number → Methodology → drill to the source PDF (highlight). ~2 min. Ambient: the Sentiment card as market color; expanded roster on Agents + dashboard runs; Draft-to-IC after deliverables. README beat table + rehearsal notes updated; **you re-rehearse the new beat** (flagged).

---

## 7. AGENTS.md + README changes (applied at G7, listed here for review)

**AGENTS.md:** Rule 0 (no competitor names); Rule 5 extension (two-tier provenance, no orphans, immutable actuals); sentiment rule; new `lib/model/**` module (pure compute + provenance, shared by xlsx builder + Live Model); stack additions from the spike (KaTeX; a grid lib if chosen; anything else) with rationale; roster note.
**README:** new feature bullets (Live Model, auditable computation, expanded agent team, sentiment, draft-to-IC); new demo-table beat; Live Model + Methodology screenshot; updated test counts.

---

## 8. Risks + pushback

1. **Provenance correctness + formula accuracy are the real risk**, not the grid — a wrong formula or an orphan number in front of bankers is worse than no feature. → G2 (adversarial) + G5 (finance-lens).
2. **Engine extraction must not drift the numbers** (goldens, IC metrics, Office files). → G3 snapshot.
3. **Grid polish** is the one genuine UI unknown. → G1 spike + kill-switch.
4. **Sentiment must never emit a sourced number.** → design invariant + test in WS-D.
5. **Scope discipline:** ONE model (Jahez DCF), not a general spreadsheet platform. Roster stays curated (~14), substantive cards only.
6. **Rehearsal:** the demo changes; the new beat needs re-rehearsal before Friday's submit.
7. **Floor:** `demo-rc2` stays green and shippable until G7; if any gate fails irrecoverably, we ship rc2.

---

## 9. What I need to start

`go` — and confirmations on: (a) Sentiment ships as a live qualitative card (cited rationale), not roadmap [my read of your answer: yes]; (b) Draft-to-IC included [yes unless you cut it]; (c) any new Rogo/inspiration screens to fold in. On `go` I author the contracts, apply the AGENTS.md rule additions, and launch WS-A / A2 / B0 / D / E in parallel worktrees.
