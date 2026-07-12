# Faheem Demo — Implementation Plan (agents, end-to-end, with tests)

> **For agentic workers:** this plan is executed under the **fable-chief-agent** operating model. **Fable is orchestrator / architect / reviewer / master** — it writes contracts, briefs agents, reviews diffs and design, and never does bulk implementation. Every other unit of work is delegated to the cheapest tier × effort that clears the accuracy bar. Task checkboxes track progress. Supersedes spec §8's executor column.

**Goal:** build the complete Faheem demo (spec `docs/superpowers/specs/2026-07-12-faheem-demo-design.md`) in one day: login → onboarding → pipeline → screening → Jahez deep-dive with citations → Arabic → deliverables → Faheem IC — beautiful, bilingual, tested, and demo-proof.

**Architecture:** single Next.js 16 App Router app at repo root. One chat engine (SSE, Anthropic citations, live/cached/auto) serving three contexts (firm / workspace / IC). Static verified data. Artifacts generated in Node. No DB, no auth backend, no RAG infra.

**Tech stack:** see AGENTS.md (locked list). Light mode only, `en` default + full `ar`/RTL.

**Non-negotiables carried from AGENTS.md:** bilingual strings, logical CSS properties, theme tokens only in `app/globals.css`, no invented numbers, less-LoC bias, tests land with code, no CodeRabbit (built-in `/code-review` only).

---

## 1. Orchestration model

### 1.1 Roles

| Role | Who | Does |
|---|---|---|
| **Master / architect / reviewer** | **Fable (main loop)** | Decomposition, contracts (`lib/types.ts`, SSE protocol, schemas), task briefs, dependency sequencing, diff review of every merged task, **design QA gate on every screen**, spot-verification of all stage-critical financial figures, integration, golden-path recording, final synthesis. Writes code ONLY for: contracts, `app/globals.css` theme, and surgical integration fixes. |
| Hard implementation **+ design-critical UI** | **opus** agents, effort high | Chat engine (SSE/citations/cache/modes), xlsx financial model, figure extraction from PDFs — **and the UI the judges stare at: theme+primitives, flagship chat, home/omnibox, pipeline+workspaces, IC room, final design-polish pass**. |
| UI art direction | **opus**, effort high (one task, T0.3) | Per-screen design briefs (layout grid, token usage, motion, empty states, AR notes) for every screen NOT opus-implemented — sonnet builds against these, never freestyles visuals. |
| Standard implementation | **sonnet** agents, effort medium (high where flagged) | Supporting screens (from opus briefs), docx/pptx builders, data-pack authoring, market research packs, e2e suite. |
| Mechanical work | **haiku** agents, effort low | Corpus download/compress/manifest, leadership pack, fixtures, checklist verification sweeps. **Haiku never writes UI.** |

### 1.2 Delegation mechanics

- **Workflow tool** for fan-outs (P1 data prep, P3 screens, P6 review) — it is the only place per-task `effort` is pinned. `pipeline()` by default; `parallel()` only where a barrier is genuinely needed.
- **Single `Agent` calls** for one-off scoped tasks (P0 scaffold, P4 builders).
- **Every brief is self-contained**: task card from this plan + pointer to AGENTS.md + the exact spec/CATALOG sections + the contracts it consumes. Agents return: summary, files touched, test output (verbatim), open questions. **No file dumps into fable's context.**
- **Two-stage acceptance** per task: (1) agent's own `npm run verify` green + task acceptance tests pass, (2) fable reviews the diff (and the rendered screen for UI tasks) before the task is marked done.
- **Escalation rule**: start at the listed tier/effort; if an agent fails acceptance twice, fable escalates one notch (sonnet→opus or effort+1) with a sharper brief — never more than one notch without re-scoping.
- **File ownership is exclusive** per task (listed on each card). Shared files (`lib/types.ts`, `app/globals.css`, `components/ui/*`, `messages/*.json`) are fable-owned after P0; agents request additions via their result summary, fable applies them. Exception: `messages/*.json` — agents append **namespaced keys only** (`"login.*"`, `"pipeline.*"`) in their own task; conflicts are structurally impossible if namespaces are respected.

### 1.3 Phase gates (fable checkpoints)

```
P0 foundation ─┬─ gate A: theme+primitives design QA ──► P2 engine ── gate C: SSE contract tests + chat UI design QA ─► P3 fan-out ── gate D: per-screen QA
               └─ P1 data (background) ── gate B: data validation + figure spot-check ────────────────────────┘            P4 artifacts ── gate E: open files, check numbers
P5 integration + golden recording ── gate F: full e2e green, both languages ── P6 review/polish ── gate G: dress rehearsal
```

---

## 2. File structure & ownership

```
/ (repo root)
├─ AGENTS.md                          ✅ exists (fable)
├─ package.json, tsconfig, eslint, prettier, next.config.ts, playwright.config.ts, vitest.config.ts   [T0.1]
├─ app/
│  ├─ globals.css                     # THE theme (@theme tokens) — fable-owned after T0.2
│  ├─ layout.tsx                      # fonts, next-intl provider, dir switch        [T0.1]
│  ├─ login/page.tsx                  # mock login                                    [T3.1]
│  ├─ (app)/layout.tsx                # shell: sidebar + topbar                       [T2.2]
│  ├─ (app)/page.tsx                  # home / omnibox                                [T3.2]
│  ├─ (app)/deals/page.tsx            # pipeline board                                [T3.3]
│  ├─ (app)/deals/[company]/page.tsx  # workspace (Overview|Documents|Chats|Artifacts|Leadership) [T3.3]
│  ├─ (app)/ic/page.tsx               # Faheem IC room                                [T3.4]
│  ├─ (app)/chat/[id]/page.tsx        # chat + doc panel (flagship)                   [T2.2]
│  ├─ (app)/connections/page.tsx      # connector catalog                             [T3.5]
│  ├─ (app)/onboarding/page.tsx       # Connect & Configure stepper                   [T3.5]
│  ├─ (app)/agents/page.tsx           # stage-grouped agent cards                     [T3.6]
│  ├─ (app)/library/page.tsx          # artifacts library                             [T3.6]
│  ├─ (app)/dev/kitchen-sink/page.tsx # primitives showcase (design QA)               [T0.2]
│  └─ api/
│     ├─ chat/route.ts                # SSE engine                                    [T2.1]
│     ├─ improve/route.ts             # haiku prompt improver                         [T2.1]
│     ├─ generate/[artifact]/route.ts # xlsx|docx|pptx                                [T4.3]
│     ├─ documents/[id]/route.ts      # serve corpus PDFs                             [T2.1]
│     └─ auth/route.ts                # mock login (sets cookie)                      [T3.1]
├─ components/
│  ├─ ui/                             # primitives: button, card, badge, input, tabs, dialog, dropdown, toggle, tooltip, skeleton, stepper [T0.2]
│  ├─ chat/                           # MessageStream, CitationChip, SourcesAccordion, AgentActivity, PdfPanel, Composer (@/# typeahead, source picker, model selector, Improve) [T2.2]
│  ├─ deals/                          # PipelineBoard, DealCard, ScreeningScorecard, StageBanner, LeadershipGrid [T3.3]
│  └─ ic/                             # ComparisonTable, AdvisoryDisclaimer           [T3.4]
├─ lib/
│  ├─ types.ts                        # ALL shared contracts — fable-authored          [T0.1]
│  ├─ i18n.ts, nav.ts                 # next-intl config, sidebar model               [T0.1/T2.2]
│  ├─ ai/{client,corpus,agents,prompts,cache,mode,sse}.ts                             [T2.1]
│  ├─ generate/{xlsx,docx,pptx,shared}.ts                                             [T4.1/T4.2]
│  └─ deals.ts                        # deals.json loader + zod                        [T1.4]
├─ data/
│  ├─ corpus/ + manifest.json         [T1.1]
│  ├─ model-inputs.json               [T1.2]
│  ├─ deals.json                      [T1.4]
│  └─ demo-cache/                     [P5 recordings]
├─ messages/{en,ar}.json              # namespaced per screen                          [all UI tasks]
├─ scripts/{fetch-corpus,validate-data,upload-files-api,prewarm,record-goldens}.ts    [T1.1/T1.5/T5.1]
├─ tests/                             # vitest unit+integration (mirrors lib/, api/)
└─ e2e/                               # Playwright specs                               [T5.2 + per-screen smoke]
```

---

## 3. Contracts (fable authors these in T0.1 — agents code against them, never redefine)

### 3.1 SSE protocol (`lib/types.ts`)

```ts
export type AgentId =
  | "orchestrator" | "screening" | "research" | "doc-intel" | "valuation"
  | "comparables" | "risk" | "writing" | "compliance" | "ic";

export type ChatContext =
  | { kind: "firm" }
  | { kind: "workspace"; companyId: string }
  | { kind: "ic" };

export interface ChatRequest {
  question: string;
  lang: "en" | "ar";
  context: ChatContext;
  agent?: AgentId;        // @-mention; undefined → orchestrator picks
  docIds?: string[];      // #-refs; scopes/emphasizes corpus docs
}

export type SSEEvent =
  | { type: "stage"; agent: AgentId; status: "start" | "done"; docIds?: string[] }
  | { type: "delta"; text: string }                       // may contain [[n]] citation markers
  | { type: "citation"; n: number; docId: string; page: number; quote: string }
  | { type: "done"; cached: boolean }
  | { type: "error"; message: string };
```

Inline citations: the server appends marker `[[n]]` at the end of each cited text block and emits the matching `citation` event; the client replaces markers with `<CitationChip n>` linking to `PdfPanel(docId, page)`.

### 3.2 Data schemas (zod, in `lib/types.ts`; validated by `scripts/validate-data.ts`)

```ts
CorpusDoc   = { id, title: {en, ar}, path, pages, sizeMB, type: "public"|"lunar"|"deal",
                workspace?: string, sourceUrl?: string, fileId?: string /* Files API, set by upload script */ }
ModelInput  = { key, value: number, unit, sourceDoc: string /* CorpusDoc.id */, page: number, note? }
Deal        = { id, name: {en, ar}, sector, origin: "inbound"|"market-screen",
                stage: "screening"|"analysis"|"ic-review"|"declined",
                ask?: string, statusLine: {en, ar},
                screening?: { rows: { criterion: {en,ar}, verdict: "pass"|"warn"|"fail",
                              note: {en,ar}, cite: {docId, page} }[], verdict: {en,ar} },
                icMetrics?: { irr: number, hurdle: number, riskScore: number,
                              mandateFit: "pass"|"warn", shariah: "pass"|"fail",
                              recommendation: {en,ar}, cite: {docId, page} },
                declineReason?: {en,ar} }
CacheEntry  = { key /* sha1(question|lang|context|agent|docIds) */, request: ChatRequest,
                events: SSEEvent[], recordedAt: string }
```

### 3.3 Agent registry (`lib/ai/agents.ts`, driven by spec §4 item 8 + deck notes)

Each entry: `{ id: AgentId, name: {en, ar}, stage: 1|2|3, methodsKey: string /* i18n */, systemFlavor: string, defaultDocIds: string[] }`. The registry drives the @-typeahead, Agent Activity labels, and the Agents page — one source of truth.

### 3.4 Modes (`lib/ai/mode.ts`)

`FAHEEM_MODE=live|cached|auto`. `cached`: replay `CacheEntry.events` with pacing (deltas batched ~30ms). `auto`: start live; if no first token within `FAHEEM_TIMEOUT_MS` (default 10000) AND an exact-key cache entry exists → switch to replay; else keep waiting and emit a reassurance `stage` event. `FAHEEM_RECORD=1`: persist every live response as `CacheEntry`.

---

## 4. Task cards

### P0 — Foundation (serial; ~first hour)

#### T0.1 Contracts + scaffold — **owner: fable (contracts) → sonnet/low (scaffold)**
- [ ] Fable writes `lib/types.ts` (§3 above), approves final dep list.
- [ ] Sonnet scaffolds: `create-next-app@latest` (Next 16, TS, App Router, Tailwind v4) at repo root; install locked deps; configure next-intl (en/ar routing-less, cookie-based locale + `dir` on `<html>`); next/font (Inter, Lora, IBM Plex Sans Arabic, Amiri); vitest (+jsdom, testing-library), Playwright (chromium only, `webServer` with `FAHEEM_MODE=cached`); eslint (+ two custom `no-restricted-syntax` guards: ① physical direction classes `ml-|mr-|pl-|pr-` in className literals, ② hex color literals `#[0-9a-fA-F]{3,8}` in string literals under `app/**` and `components/**` — carve-out: `lib/generate/**` per AGENTS.md rule 4), prettier (+tailwind plugin); `package.json` scripts exactly as AGENTS.md; `.env.example`; favicon (Faheem glyph) + metadata (`Faheem — Lunar Investments`, both locales).
- **Acceptance:** `npm run verify` green on fresh clone; `npm run dev` serves a placeholder page in en with `dir="ltr"` and toggles to ar/`dir="rtl"` via cookie; sample unit test + sample e2e (`e2e/smoke.spec.ts`: page loads, no console errors) pass.
- [ ] Commit `chore: scaffold`.

#### T0.2 Theme + primitives (design foundation) — **owner: opus/high** · gate A
> Promoted to opus (user call: opus/fable are the strongest UI hands; the primitives set the ceiling for every screen).
- Files: `app/globals.css`, `components/ui/*`, `app/(app)/dev/kitchen-sink/page.tsx`, `tests/ui/*.test.tsx`.
- [ ] `globals.css` `@theme`: full token set from spec §7 — navy scale (50→950 tints of #061F52), accent scale (#07966F), bg #FBFCFE, card #FFFFFF, border #E3E9F1, text-secondary #314160, warning #F59E0B, danger #EF233C, mint tint for citation chips; radii (btn 8px, card 12px, pill 20px); shadows (card `0 10px 24px rgba(8,33,82,0.03)`, hover elevation, modal); spacing scale; motion (`--duration-fast: 150ms`, `--duration: 250ms`, `--ease: cubic-bezier(.4,0,.2,1)`); font vars wired to next/font (Inter / IBM Plex Sans Arabic UI; Lora / Amiri hero-only) + a `tabular-nums` utility for financial figures. **Extension of the Figma kit is allowed and encouraged (hover states, tint ramps) — but every extension lands as a token here, never inline.**
- [ ] **Faheem logo as inline SVG** — recreate/enhance from `context/branding/figma-exports/logo-system.png` (green ascending bars + arrow, navy wordmark, AR/EN lockups, light/dark variants): crisp at all sizes, and the bars get a subtle staggered-rise animation used on the login screen and as the chat "thinking" affordance. Monogram-tile component (`components/ui/logo-tile.tsx`) for fictional companies/connectors per AGENTS.md assets policy.
- [ ] Primitives (Radix-wrapped where interactive, cva variants, RTL-safe): Button (primary/secondary/outline/ghost + loading), Card, Badge/Pill (status variants incl. pass/warn/fail), Input (+ leading icon), Tabs, Dialog, DropdownMenu, Toggle, Tooltip, Skeleton (shimmer), Stepper (Figma kit 08), Avatar.
- [ ] Kitchen-sink page renders all primitives in both locales.
- **Acceptance:** component tests — Button variants render + disabled blocks click; Dialog traps focus + closes on esc; Tabs keyboard-navigable; Toggle reflects state (4–6 focused tests, no snapshots). `npm run verify` green. **Gate A: fable visually reviews kitchen-sink (en + ar) against Figma kit before P3 may start.**
- [ ] Commit `feat: theme + ui primitives`.

#### T0.3 UI art direction (briefs for sonnet-built screens) — **owner: opus/high** (parallel with T0.2)
- Files: `docs/design-briefs.md`.
- [ ] For each screen NOT opus-implemented (login, connections, onboarding stepper, agents page, library): a build-ready brief — layout structure (regions, grid, max-widths), exact token usage (which navy tint, which radius, which shadow, type scale per element), component composition (which primitives, which variants), motion (what animates, duration/ease tokens), hover/focus/empty/loading states, RTL-specific notes (what flips, what doesn't), and 2–3 "wow details" per screen drawn from `context/rogo-screens/CATALOG.md` §4. Written so a sonnet agent makes zero visual decisions. **Rogo is reference, not constraint — depart wherever your layout idea is stronger; only the demo-load-bearing patterns (AGENTS.md design bar) are fixed.**
- **Acceptance:** fable reviews briefs for consistency with the Figma kit + CATALOG before P3 launches; every P3 sonnet card's brief section is non-empty.
- [ ] Commit `docs: ui design briefs`.

### P1 — Data prep (Workflow fan-out, background from T0.1; blocks P4/P5, not P2/P3)

Run as one Workflow: 5 concurrent `agent()` calls; validation task pipelined after each producer.

#### T1.1 Corpus fetch + manifest — **haiku/low**
- [ ] `scripts/fetch-corpus.ts` (or bash): download the 6 spec §6 URLs → `data/corpus/`; `pdfinfo` page counts; ghostscript `/ebook` compress the 14.3MB AR (assert ≤5MB, text layer intact via `pdftotext | head`); write `manifest.json` per `CorpusDoc` schema (no `fileId` yet).
- **Acceptance:** all files exist; total pages reported; `validate-data` passes manifest schema; compressed AR spot-readable.

#### T1.2 Verified figures → `model-inputs.json` — **opus/high** · gate B
- [ ] Read FY2025 ER, FY2025 earnings-call deck, Q1-2026 FS, FY2024 AR (from T1.1) and extract every figure the demo displays or the xlsx needs (spec §11): FY23–FY25 actuals (orders, AOV, GMV, take rate/net revenue, delivery costs, contribution margin, EBITDA, D&A, net income incl. the ~SAR 55M one-off, cash/debt, shares outstanding), Q1-26 actuals, segment splits. Each entry: `{key, value, unit, sourceDoc, page, note}`.
- **Acceptance:** `validate-data` green (every `sourceDoc`+`page` exists in manifest); agent returns a table of the 12 stage-critical figures (GMV, take rate, NI −61%, one-off, Q1-26 loss, cash, shares…) **with page numbers, which fable independently spot-checks against the PDFs before gate B closes.**

#### T1.3 Market & industry packs — **sonnet/high (+ web search)**
- [ ] Author two compiled PDFs (HTML→PDF via headless chromium print): `industry-news-pack.pdf` (Keeta entry/expansion, price-war coverage, Argaam FY25/Q1-26 articles, TAM notes — every article: title, date, source URL, key excerpt) and `market-data-comps.pdf` (Jahez price/mkt-cap/shares snapshot dated; Saudi 10Y sukuk yield; ERP note w/ source; sector beta note; comps multiples table: Talabat, Deliveroo, DoorDash, Delivery Hero — EV/Revenue, EV/EBITDA, P/E, EV/GMV, each row sourced+dated).
- **Acceptance:** every number in both packs carries an inline source+date; added to manifest; WACC inputs complete (rf, ERP, beta, cost of debt path); fable sanity-reviews the comps table.

#### T1.4 Lunar + fictional-deal docs + `deals.json` — **sonnet/medium**
- [ ] Author (HTML→PDF, Lunar-branded per spec §7): IC Charter & Mandate (firm profile, tech+consumer appetite, 15% hurdle, 10% concentration, 3–5y hold, Shariah screen required — page numbers stable, the screening scorecard cites them), Risk Appetite Statement, Portfolio snapshot, **Darb mini data-room** (profile+ask SAR 40M Series B, financial summary, founder bios), **Thara Pay analysis summary** (metrics for IC).
- [ ] `data/deals.json` per schema: Darb (screening rows per spec §11 incl. the concentration ⚠), Jahez (analysis, market-screen origin badge data), Thara Pay (ic-review + icMetrics), Aqar (declined + reason). `lib/deals.ts` loader.
- **Acceptance:** `validate-data` green; every scorecard `cite` resolves to a real page in the IC Charter PDF; numbers internally consistent (ask vs fund size vs concentration math) — fable reviews Darb pack + deals.json line-by-line (fictional ≠ sloppy).

#### T1.5 Leadership pack + Files-API script — **haiku/low**
- [ ] `leadership-pack.pdf`: Jahez board/exec bios from AR + public sources (each with URL). Add to manifest, `workspace: "jahez"`.
- [ ] `scripts/upload-files-api.ts`: uploads manifest docs via Files API, writes `fileId`s back into manifest. **Not run until billing upgraded** — engine must also accept base64 path as fallback (T2.1).
- **Acceptance:** script dry-runs (no key call) with `--check`; pack in manifest.

### P2 — Core engine + flagship UI (starts after T0.1; the critical path)

#### T2.1 Chat engine + API routes — **opus/high** · gate C(a)
- Files: `lib/ai/*`, `app/api/chat/route.ts`, `app/api/improve/route.ts`, `app/api/documents/[id]/route.ts`, `tests/ai/*`, `tests/api/*`.
- [ ] `client.ts`: SDK factory, **injectable** (`setClientForTests`); model/effort from env (`FAHEEM_MODEL=claude-opus-4-8`, adaptive thinking).
- [ ] `corpus.ts`: manifest loader; doc-block builder — Files-API `fileId` refs when present, else base64; `citations: {enabled: true}`; `cache_control {ttl:"1h"}` on last block; context filtering (workspace docs + lunar + packs; ic subset; #-refs narrowing).
- [ ] `prompts.ts`: grounded analyst system prompt (en/ar) per spec §5 anti-hallucination; flavors: workspace analyst / screening explainer / **IC advisor (never decides — required phrasing)**; orchestrator stage choreography table (which agents+docs per context/agent).
- [ ] `sse.ts` + `route.ts`: emit choreographed `stage` events overlapping the real stream; transform citation blocks → `[[n]]` markers + `citation` events (§3.1); modes per §3.4 **plus a runtime mode override (cookie `faheem_mode`, set via hidden keyboard shortcut `⌘.` → tiny stage-only overlay showing mode + cache-hit status; precedence cookie > env) — the on-stage panic switch**; `FAHEEM_EFFORT` env passed to `output_config`; `FAHEEM_RECORD` persistence; **every chat/generate call appends `{ts, user, context, question, citationCount, artifact?}` to `data/audit-log.json`** (feeds the Audit Trail panel, T3.6); improve route (haiku rewrite w/ analyst-prompt template); documents route streams PDFs.
- [ ] Graceful `error` SSE handling end-to-end: engine emits `error` → UI renders a calm in-chat notice ("connection issue — answering from verified cache") and auto-retries cached when available; never a blank screen or console-only failure.
- **Acceptance (all vitest, SDK mocked / cached fixtures — zero live calls):**
  - `mode.test.ts`: cached replays fixture events in order w/ pacing; auto falls back on simulated timeout when cache hit exists; live path passes correct blocks (assert doc order, cache_control placement, citations flag) to mocked SDK.
  - `sse.test.ts`: mocked SDK stream with citation blocks → exact expected `SSEEvent` sequence (stage → deltas w/ markers → citations → done).
  - `corpus.test.ts`: context filtering; #-refs; fileId vs base64 paths.
  - `route.test.ts` (integration, route handler direct-invoke): POST ChatRequest in cached mode → valid SSE wire format; unknown cache key in cached mode → graceful `error` event.
  - `improve.test.ts`: short input → mocked haiku call → rewritten prompt returned.
  - **Gate C(a): fable reviews the diff + contract-test output before T2.2 integrates.**
- [ ] Commit per module (`feat: chat engine`, `test: engine contract`).

#### T2.2 Shell + flagship chat UI — **opus/high** · gate C(b)
- Files: `app/(app)/layout.tsx`, `app/(app)/chat/[id]/page.tsx`, `components/chat/*`, `lib/nav.ts`, `tests/chat/*`, `e2e/chat.spec.ts`.
- [ ] Shell: Rogo-layout sidebar (CATALOG §2A) — logo, New Chat, nav (Home, Deals, Library, Agents, Scheduled Tasks visual, Connections), pinned workspaces from deals.json, Arwa footer; language toggle (cookie + `dir` swap, animated); collapse.
- [ ] Chat: `MessageStream` (marker→chip replacement, streaming append, prose styles), `CitationChip` (mint, numbered, hover quote preview), `SourcesAccordion` (grouped fact→chip per CATALOG §2B), **"Verified — N sources cited" compliance badge on completed answers (rendered from real citation count — the Verification agent made visible)**, `AgentActivity` (timeline of `stage` events: icon, agent name, docs being read, shimmer→check, collapse when done), `PdfPanel` (react-pdf, deep-link to page, zoom, close — **pdfjs worker vendored locally, NEVER the CDN default; e2e must pass with network offline**), `Composer` (auto-grow, **@ typeahead** from registry, **# typeahead** from manifest, chips in input, source-picker flyout w/ grouped toggles + tooltips (CATALOG §4.4), model-tier selector "Faheem · Max/Auto/Light" w/ one-line descriptions, mic (visual), Improve wand on short input + Undo, send states).
- [ ] Chat persistence: no DB — **`data/seed-chats.json` is the durable layer** (versioned in git; Jahez workspace history, a Darb screening explanation, prior artifacts chat — survives browser wipes/machine swaps); localStorage only overlays chats created at runtime. `chat/[id]` resolves seeded + new ids.
- **Acceptance:** component tests — marker replacement (delta text `"…[[2]]"` + citation event → chip 2 rendered, click calls `openDoc("fy25-er", 3)`); @/# typeahead filter + chip insert + payload fields set; Improve swaps textarea and Undo restores. `e2e/chat.spec.ts` (cached fixture): ask scripted question → stages appear then complete → answer streams → chip visible → click → PdfPanel opens with correct page prop → Sources accordion lists the citation. **Gate C(b): fable design-QA (en+ar, RTL flip, motion) — the bar is "screenshot-worthy".**
- [ ] Commit `feat: shell + flagship chat`.

### P3 — Screens fan-out (Workflow, 6 concurrent agents; after gates A + C(b) for chat-dependent screens; T0.3 briefs required for sonnet cards)

Common acceptance for every P3 card: bilingual messages (own namespace), RTL-clean (Playwright asserts `dir` + no horizontal overflow), primitives only, no new deps, component tests for logic, one e2e smoke nav spec, `npm run verify` green, fable design-QA (gate D applies to 3.2/3.3/3.4 strictly; 3.5/3.6 lighter). **Demo-critical screens (3.2, 3.3, 3.4) are opus-implemented; sonnet screens follow their `docs/design-briefs.md` section verbatim — no visual freestyling.**

#### T3.1 Mock login — **sonnet/medium** (build from T0.3 brief)
- Files: `app/login/page.tsx`, `app/api/auth/route.ts`, `middleware.ts`, `e2e/login.spec.ts`.
- [ ] Centered card on navy gradient backdrop, Faheem logo, username+password inputs, "Sign in" → POST `/api/auth` → **any non-empty credentials set `faheem_session` cookie** → redirect `/`. Middleware redirects unauthenticated `(app)` routes to `/login`. Subtle motion (logo fade, card rise). Figma Login frame is the layout reference, our tokens.
- **Acceptance:** e2e — unauthenticated `/` → `/login`; submit "arwa"/"demo" → home; empty submit → inline error, no redirect.

#### T3.2 Home / omnibox — **opus/high** (on-camera in every beat transition)
- Files: `app/(app)/page.tsx`, `e2e/home.spec.ts`, reuses `Composer`.
- [ ] Serif hero ("What can Faheem do for you today?" / "كيف يخدمك فهيم اليوم؟"), centered Composer (full affordances), rotating contextual placeholder, quick-action pills (Run DCF · Comps · IC Memo · Risk Scorecard · Sensitivity · Shariah Screen) that prefill the composer, recent-workspace cards row.
- **Acceptance:** e2e — pill click prefills composer; submit navigates to chat with question.

#### T3.3 Pipeline board + workspaces — **opus/high** (carries the private→public story on screen)
- Files: `app/(app)/deals/**`, `components/deals/*`, `e2e/deals.spec.ts`.
- [ ] Board from `deals.json`: origin filter pills (All / Inbound (Private) / Market Screen (Public)), stage-grouped cards (logo — **Jahez's real logo fetched once and vendored to `public/logos/`; fictional companies use monogram tiles**, sector, ask, origin badge — Jahez's reads "SAHMK/Argaam screen · 2026-07-08", status line, hover lift). Workspace page: header + stage banner with human-gate button ("Advance to pitch meeting" → confetti-free tasteful transition of stage badge), tabs Overview / Documents (manifest docs w/ open-in-viewer) / Chats / Artifacts / Leadership (bio card grid). Darb Overview = `ScreeningScorecard` (criterion rows, pass/warn/fail badges, citation chips → IC Charter page in PdfPanel, verdict line, "anonymized" note). Scoped composer "Ask Faheem about {company}".
- **Acceptance:** component test — scorecard renders rows/verdicts from fixture, cite click handler receives `{docId, page}`; e2e — filter toggles cards; Darb workspace shows scorecard; gate button flips stage badge; Jahez workspace Documents lists corpus docs.

#### T3.4 Faheem IC room — **opus/high** (the closing beat)
- Files: `app/(app)/ic/page.tsx`, `components/ic/*`, `e2e/ic.spec.ts`.
- [ ] Comparison table (Jahez vs Thara Pay: implied IRR vs 15% hurdle w/ delta coloring, scenario-weighted return, risk score, mandate fit, Shariah, recommendation) from `deals.json` `icMetrics`; persistent `AdvisoryDisclaimer` banner; IC-context chat panel (same engine, `context: {kind:"ic"}`).
- **Acceptance:** component test — hurdle delta renders correct sign/color from fixture; e2e — table renders both deals; disclaimer visible; scripted IC question (cached) streams with citations.

#### T3.5 Connections + onboarding stepper — **sonnet/medium** (build from T0.3 brief)
- [ ] Connections per CATALOG §2D: Connected list (Saudi Exchange, Argaam, marketaux, Lunar Data Room, Templates) w/ Configure pills; Available (SAHMK, Bloomberg, PitchBook, Intralinks, Datasite, od.data.gov.sa, REGA, GASTAT, Alinma Open Banking [SAMA], Capital IQ) w/ Connect; "Add custom MCP" modal (name, URL, advanced accordion); one fake OAuth modal flow.
- [ ] Onboarding `/onboarding`: 3-step Stepper — ① Connect (embeds connector grid) ② Agents & skills (registry toggle grid, @hints) ③ Mandate questionnaire (IRR 15%, concentration 10%, hold 3–5y, liquidity, Shariah toggle, sector chips, drawdown) → closing card "This becomes your IC Charter" with link that opens the actual PDF.
- **Acceptance:** e2e — stepper completes end-to-end, MCP modal opens/validates URL shape, OAuth modal flow closes as "Connected".

#### T3.6 Agents page + Library + Audit Trail — **sonnet/medium** (build from T0.3 brief)
- [ ] Agents: stage-grouped (1 Screening / 2 Analysis: orchestrator banner + 7 cards / 3 IC), "7 specialist teams · 20+ agents", methods in analyst vocabulary (spec §4 item 8), cosmetic toggles, @-hint, human-gate markers between stages.
- [ ] Library: artifact cards (type icon, name, workspace, date, download), empty state.
- [ ] **Audit Trail panel** (under Settings next to Connections): table rendered from `data/audit-log.json` — timestamp, user (Arwa), context/workspace, action (question asked / artifact generated / screening advanced), citations count. Seeded with a plausible week of history + grows live during the demo. **This is the deck's "full audit trail" claim made real — the governance beat for bank judges.** One line of copy: "Every answer, source, and artifact is logged. Nothing your client data touches trains any model."
- **Acceptance:** e2e smoke — all cards render bilingual; toggles flip; audit table shows seeded rows AND a new row after the chat e2e runs.

### P4 — Deliverables engine (after gate B; parallel to P3)

#### T4.1 xlsx financial model — **opus/high** · gate E(a)
- Files: `lib/generate/xlsx.ts`, `lib/generate/shared.ts`, `tests/generate/xlsx.test.ts`.
- [ ] Full workbook per spec §11 (9 tabs) built EXCLUSIVELY from `model-inputs.json` + assumption constants (documented in-sheet): real Excel formulas (DCF PV chain, WACC build, Gordon TV, two-way sensitivity via TABLE-less grid of formulas, comps multiples, scenario IRRs), Lunar branding (charcoal+gold header band, serif title), **every populated input cell gets a comment `Source: <doc title>, p.<n>` + a `faheem://doc/<id>/<page>` hyperlink**.
- **Acceptance:** tests read the generated file back with exceljs — assert: tab set; key cells contain formulas not literals (e.g. DCF!EV = SUM of PVs + TV); every cell fed by a ModelInput has the right comment text; sensitivity grid corners consistent with WACC±1%/g±0.5%; file opens in LibreOffice headless (`soffice --headless --convert-to pdf` exits 0). **Fable reviews the model math tab-by-tab (gate E(a)).**

#### T4.2 docx memo + pptx deck — **sonnet/medium** · gate E(b)
- [ ] IC memo per spec §11 sections; board deck ~8 slides per spec §11 — both Lunar-branded, numbers only from `model-inputs.json`/`deals.json`, sources appendix; narrative paragraphs pulled from a `narratives.json` (placeholder analyst-voice text now; optionally regenerated live in P5).
- **Acceptance:** docx parsed back (docx lib) — sections present, appendix lists every cited doc; pptx validated (JSZip: slide count, no broken rels); both convert via `soffice --headless` cleanly.

#### T4.3 Generate route + UI — **sonnet/medium**
- [ ] `/api/generate/[artifact]` streams progress (reuse SSE), writes to `public/artifacts/`, registers in Library + workspace Artifacts tab; generation card UI with per-artifact progress and file cards (per spec §4 item 5).
- **Acceptance:** e2e — trigger generation → 3 file cards appear → download link 200s with correct content-type + non-trivial size.

### P5 — Integration, golden path, hardening (fable-led)

#### T5.1 Wiring + recording — **fable + haiku helpers**
- [ ] Fable: cross-screen integration pass; seed demo state (Jahez chats list, artifacts); run `upload-files-api` (**requires billing upgrade**); `scripts/prewarm.ts` (max_tokens:0 cache warm); `scripts/record-goldens.ts` — record every scripted beat: Q&A 1 (with #), Q&A 2 (with @), Arabic Shariah question, IC ranking question, 2 likely judge follow-ups, in en (+ar where scripted), `FAHEEM_RECORD=1`.
- [ ] Fable reviews every golden answer word-by-word (numbers vs model-inputs.json; citation pages correct; analyst vocabulary; IC answer never decides).
- [ ] **Demo palette** (`⌘K`, stage-only like the mode overlay): lists the scripted golden questions per context; selecting one inserts the EXACT recorded text into the composer — guarantees cache-key hits and zero on-stage typos. (A typo'd question = cache miss = surprise live call; this kills that risk class.)
- **Acceptance:** demo-cache contains all beats; `FAHEEM_MODE=cached` full run works offline (wifi kill test); every palette entry replays from cache.

#### T5.2 Full e2e + RTL sweep — **sonnet/medium** · gate F
- [ ] `e2e/golden-path.spec.ts`: login → onboarding skim → pipeline (filter, Darb scorecard, gate click) → Jahez chat Q&A1 (stages→answer→chip→PDF page) → language toggle → Arabic question renders RTL → deliverables generate+download → IC room ranking → disclaimer visible. Runs fully in cached mode.
- [ ] RTL/i18n sweep: Playwright iterates every route in `ar` — asserts `dir="rtl"`, no horizontal scroll, no missing-message console warnings; screenshots per route/locale saved as artifacts for fable's visual pass.
- [ ] **Laptop viewports**: the golden-path + sweep run at BOTH 1920×1080 and 1366×768 (common laptop resolutions; demo runs in a desktop browser — mobile is a non-target) — no clipped layouts, no overflow.
- **Acceptance:** suite green twice consecutively (flake check) at both viewports; fable reviews screenshot grid (gate F).

### P6 — Review & polish

- [ ] `/code-review` (built-in reviewer) on the full diff — findings triaged by fable; fixes → sonnet/medium. **(No CodeRabbit — user decision.)**
- [ ] Design polish pass — **opus/high** driven by fable's gate-D/F notes (spacing, motion timing, empty states, hover details) across ALL screens, including tightening the sonnet-built ones to the briefs.
- [ ] Dress rehearsal: fable executes the §3 run of show click-by-click (cached, then live), stopwatch per beat, records deviations → `docs/rehearsal-notes.md`. **Runs against the PRODUCTION build (`next build && next start`), with wifi disabled once, and confirms: pdfjs worker loads offline, LibreOffice/Excel opens the generated workbook on the demo machine, `⌘.` mode overlay works, audit trail grew during the run.**
- [ ] Optional (fable, if time): draft **Arabic-only slide copy** for the §3 slide beats (problem / category+workflow / close) → `docs/slide-copy.md` — slides are Arabic like the Amad initial pitch deck (final pitch deck generated later, separate task); terminology must match `context/pitch-deck-notes.md` vocabulary AND `messages/ar.json` (one Arabic register across slides + product).
- [ ] **Backup**: copy the built app + data + node_modules (or a `npm run build` tarball) to a USB / second laptop; `demo-rc1` tag pushed.
- [ ] Final commit + tag `demo-rc1`.

---

## 5. Testing strategy (summary of what's embedded above)

| Layer | Tool | What | When it runs |
|---|---|---|---|
| Static | tsc, eslint (incl. no-physical-direction rule), prettier | types, lint, format | `npm run check`, every task |
| Unit | vitest | cache keys/replay pacing, mode fallback, corpus filtering & block building, SSE transform (citation markers), agent registry, deals/manifest/model-inputs zod schemas, xlsx/docx/pptx read-back assertions, scorecard + hurdle-delta logic | `npm run test`, every task |
| API integration | vitest (route handlers invoked directly) | /api/chat SSE wire format in cached mode, error paths, /api/improve (mocked haiku), /api/generate outputs, /api/auth cookie, /api/documents streaming | `npm run test` |
| Component | vitest + testing-library | citation chip flow, @/# typeahead, Improve/Undo, source-picker toggles, Dialog/Tabs a11y, stepper | `npm run test` |
| E2E | Playwright (chromium, `FAHEEM_MODE=cached`) | per-screen smokes + `golden-path.spec.ts` + RTL sweep w/ per-route screenshots | `npm run test:e2e`, gates D/F |
| Data QA | `scripts/validate-data.ts` (zod) + fable spot-check | schemas, source-page existence, figure verification (gate B), Darb/Thara internal consistency | `npm run validate:data` |
| Live smoke | `scripts/record-goldens.ts` + manual | real API: citations arrive, pages correct, latency measured | P5 only (post-billing) |
| Human | fable gates A–G + dress rehearsal | design bar, finance correctness, run-of-show timing | per phase |

**Deliberate exclusions (less-LoC):** no snapshot tests, no visual-pixel-diff CI (screenshot grids reviewed by fable instead), no unit tests for pure-presentation components, no live-API calls anywhere in the automated suite, no GitHub Actions (local `npm run verify` is the gate — solo repo, one build day).

---

## 6. Build-day risk register

| Risk | Mitigation |
|---|---|
| P2 engine slips (critical path) | P3 screens depend only on gate A + contracts; chat-dependent wiring lands last. Cached fixtures let UI proceed before engine is finished. |
| Parallel agents drift on conventions | AGENTS.md + fable-owned shared files + namespaced i18n keys + exclusive file ownership; gate reviews catch the rest. |
| Figma-kit fidelity argument mid-build | Gate A freezes the theme; extensions only via globals.css tokens. |
| Billing not upgraded by P5 | Everything except `upload-files-api`, prewarm, and golden recording works offline; base64 fallback path tested; worst case record goldens next morning. |
| xlsx formula errors under judge scrutiny | Read-back tests + LibreOffice open test + fable tab-by-tab review (gate E(a)); every input cell traceable to model-inputs.json. |
| e2e flake burning time | cached mode is deterministic; pacing configurable to 0ms in tests; flake-check = suite twice. |

## 7. Kickoff sequence (what fable does on "go")

1. Write `lib/types.ts` + finalize dep versions; launch T0.1 scaffold (sonnet).
2. Launch P1 Workflow (5 data agents) in background.
3. On T0.1 done: launch T0.2 (theme+primitives, **opus/high**) and T0.3 (UI briefs, **opus/high**) in parallel.
4. Gate A → launch T2.1 (opus). Review gate B data as it lands.
5. Gate C(a) → T2.2 (opus). Gate C(b) → P3 Workflow (3 opus screens + 3 sonnet-from-brief screens) + P4 (opus + sonnet).
6. Gates D/E → P5 integration + recording (billing must be live here).
7. Gate F → P6 review, **opus polish pass**, dress rehearsal, `demo-rc1`.
