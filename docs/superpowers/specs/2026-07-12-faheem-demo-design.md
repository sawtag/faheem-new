# Faheem Demo — Full Design Spec (Amad 2026 Hackathon)

**Date:** 2026-07-12 · **Demo day:** July 16–18, 2026 (on-site, Tuwaiq Academy HQ, Riyadh) · **Format:** 15 min presentation + demo combined
**Goal:** WIN. Prize pool 500K+ SAR (1st: 250K). Track 1: Generative AI for Fintech.
**Judging criteria (official):** innovation/creativity, technical implementation, data analysis, user experience, real-world implementation feasibility.

---

## 1. Strategy in one paragraph

**We are building a Rogo AI–style platform for the Saudi market.** Rogo is the US category leader in AI for finance (~$2B valuation, Kleiner Perkins/Sequoia-backed, 300+ institutions) — Faheem is that product thesis localized: Tadawul/CMA data, Arabic support, Shariah screening, SAMA open-banking roadmap. (Internal framing only — **on stage we never name Rogo**; we say "category leaders emerging in the US/UK.") Faheem is "the AI financial research team for the Saudi investor." The demo tells one story end-to-end: **Lunar Investments** (fictional client investment firm) evaluates **Jahez (Tadawul 6017)** amid the Saudi quick-commerce war — onboards onto Faheem, connects data sources, asks questions in Arabic and English, gets answers where **every number carries a clickable citation to a real document page**, and walks away with branded deliverables (IC memo in Word, board deck in PowerPoint, full financial model in Excel — each figure source-linked). The multi-agent architecture from the pitch deck (7 specialist teams + fact-checker) is visible as live "agent activity," and the Connections page shows the MVP integration roadmap (Tadawul, SAHMK, data rooms, open banking). Everything runs locally on Next.js + Claude API with static verified data — zero moving parts that can break on stage.

## 2. Locked decisions

| Decision | Choice | Rationale |
|---|---|---|
| Demo company | **Jahez International (6017)** | 5/5 judge familiarity (app on their phones), 5/5 story: IPO darling → 2025 profit beats → FY2025 profit −61% (SAR 73M, incl. SAR 55M Q4 one-off) → Q1 2026 net **loss** SAR 9.2M amid Keeta/HungerStation/Ninja price war. Real bilingual docs available. User's instinct + research agree. |
| Stack | **Single Next.js app** (App Router, TypeScript) | One process on localhost, zero integration risk. Tailwind + HeroUI (RTL-capable). Doc generation in Node (exceljs, pptxgenjs, docx). No Python, no vector DB. |
| Retrieval | **No RAG infra — native PDF documents + API citations** | Corpus is ~6–8 curated PDFs; pass as document blocks with `citations: {enabled: true}` → Claude returns `page_location` citations (real page numbers, no hallucinated refs). Prompt caching (1h TTL) makes repeat queries fast/cheap. This is the single highest-leverage choice: grounded citations for free, and "every number has a source" is literally enforced by the API. |
| Main model | **`claude-opus-4-8`** (streaming, adaptive thinking, `effort` env-tunable) | Best quality; model ID via `FAHEEM_MODEL` env so we can trial `claude-sonnet-5` if stage latency demands. ~$5/$25 per MTok — trivial at demo volume with caching. |
| Prompt improver | **`claude-haiku-4-5`** | Per user instruction ("haiku or weak model"). Fast + cheap. |
| Live vs cached | **Hybrid, user-controlled**: `FAHEEM_MODE=live\|cached\|auto` | `live` = real API. `cached` = replay recorded responses with simulated streaming. `auto` = live with timeout → cache fallback. `FAHEEM_RECORD=1` records every live answer during rehearsal. Judges can ask follow-ups live; golden path is bulletproof. |
| Languages | **English-first UI, live AR toggle**; demo runs in English with one dedicated Arabic moment (Shariah-screen question, full RTL) | Finance is English-first and judges are tech+fin ("fintech bros"). Arabic UX remains an explicit hackathon criterion and a differentiator — showcased via the live toggle, not as the default. |
| Design | ROGO layouts + Faheem brand (navy/green from pitch deck; exact tokens from Figma once access granted) | Per INIT instructions. |

## 3. Demo narrative & 15-minute run of show

**Persona:** analyst at Lunar Investments. **Task:** "Should we invest in Jahez? Get me the full picture of Saudi/GCC food delivery & quick commerce — fast."

| Min | Beat | On screen |
|---|---|---|
| 0–2 | **Problem** (from pitch deck): 129+ hours per investment memo, 345+ pages per prospectus, 10+ disconnected sources, zero reuse. "Decisions worth billions of riyals are built manually." | Slides |
| 2–3 | **Category proof + why now**: agentic AI for finance is exploding in the US/UK (Hebbia — $700M valuation, a16z; AlphaSense — $7.5B valuation, $600M ARR; a category leader just raised at a $2B valuation backed by Kleiner Perkins & Sequoia, used by 300+ institutions — *do not name Rogo*). Saudi: 2026 = Year of AI, SDAIA targets AI = 12% of GDP by 2030, 301 fintechs (30× since 2018), FSDP target 525 by 2030, HUMAIN $10B fund. **Nobody has built this for the Saudi market, in Arabic, on Tadawul data. We are.** | Slides |
| 3–4.5 | **Onboarding flyover**: Lunar Investments signs up → picks subscription tier → connects data sources (Tadawul/Saudi Exchange disclosures ✓, Argaam ✓, news ✓, SAHMK API, data room, Alinma Open Banking "coming in MVP") → uploads brand templates → sets investment mandate & risk appetite. | Live app, fast clicks |
| 4.5–7.5 | **Q&A moment 1 (English — the money shot)**: "Break down Jahez's FY2025 unit economics — GMV growth vs take rate, AOV, contribution margin, EBITDA margin — and why did net income compress ~61% despite double-digit GMV growth?" → agent activity timeline (Research → Document Intelligence → **Valuation Agent** → **Risk Agent** → Compliance fact-check) → streamed analyst answer with inline numbered citation chips → click a citation → **the actual Jahez earnings PDF opens at the cited page**. Sources panel shows grouped footnotes. | Live app |
| 7.5–9.5 | **Q&A moment 2 (English)**: "Run a quantified risk assessment of the quick-commerce price war — and does the position fit our mandate?" → **risk scorecard** (probability × impact matrix, bps of take-rate compression per scenario, scenario-weighted expected return) citing BOTH the industry pack AND Lunar's private docs ("breaches your IC Charter's 15% IRR hurdle in the bear case; exceeds the 10% single-name concentration limit — Lunar IC Charter, p.4"). Prompt-improve moment: type "jahez good?" → **Improve** → full structured equity-research prompt (Haiku). | Live app |
| 9.5–10.5 | **Arabic moment**: toggle the whole UI to Arabic live (full RTL) and ask: "هل يجتاز جاهز الفحص الشرعي وفق منهجية AAOIFI؟" → Shariah-screen card (debt/market-cap ratio, non-permissible income %, pass/fail) answered in Arabic with citations. Bilingual product + the most Saudi-native analysis in one beat. | Live app |
| 10.5–13 | **Deliverables**: "Prepare the IC memo, DCF model, and committee deck." → generation progress → **Word IC memo (recommendation, target price, IRR at entry, catalysts, risk factors) + Excel valuation workbook + PPTX board deck, all in Lunar Investments branding** → open the Excel live: tabs for Assumptions, Revenue Drivers (GMV → take rate → net revenue), 3-Statement, **DCF (FCFF, WACC build, Gordon terminal value)**, **Sensitivity (WACC × terminal growth)**, **Comps (EV/Revenue, EV/EBITDA, P/E vs Talabat, Deliveroo, DoorDash)**, Scenarios (bull/base/bear with implied IRR each) — and every populated cell has a comment: "Source: Jahez FY2025 Earnings Release, p.3" linking back into Faheem's document viewer. | Live app + Office |
| 13–14.5 | **Architecture + MVP roadmap**: the 7 specialist agent teams + Shariah/compliance fact-checker + human review checkpoint (deck diagram); Connections roadmap (data rooms — Intralinks/Datasite, Bloomberg/PitchBook, od.data.gov.sa, SAMA open banking); business model (SaaS tiers/seat + usage); Alinma synergy (sponsor is a bank — Faheem for Alinma Capital's research desk). | Slides |
| 14.5–15 | **Close**: "We're not building a chatbot — we're building the knowledge infrastructure of the Saudi financial sector." Team + ask. | Slides |

Judges' follow-up questions after: keep app in `auto` mode, invite them to ask Faheem anything about Jahez.

## 4. Product scope — screens (all bilingual; English default, full RTL when toggled)

Priority order (build top-down; 1–5 are must-have):

1. **App shell / sidebar** — Faheem logo, New Chat, Home, Search, Documents (Library), Agents, Scheduled Tasks (visual), Pinned project "Jahez Evaluation", user footer (Lunar analyst avatar). Present on every screen.
2. **Home / omnibox** — serif hero "What can Faheem do for you today?" (AR: "كيف يخدمك فهيم اليوم؟"), large input card with: attach, **source-picker flyout** (External: Tadawul disclosures ✓, Argaam ✓, News ✓, Web ✓ / Internal: Lunar Data Room ✓, Templates ✓, Mandate ✓ — each with toggle), model tier selector ("Faheem · Max" / "فهيم · Max"), mic, send. Quick-action pills use analyst vocabulary: **Run DCF · Comps Analysis · IC Memo · Risk Scorecard · Sensitivity Analysis · Shariah Screen** (AR when toggled: تقييم DCF، تحليل الشركات المماثلة، مذكرة لجنة الاستثمار، بطاقة المخاطر، تحليل الحساسية، الفحص الشرعي).
3. **Chat + citations + document viewer** (flagship) — streamed prose with inline numbered citation chips; collapsible **Agent Activity** timeline above the answer (choreographed stages mapped to real doc set); right split panel = PDF viewer (react-pdf) that opens at the cited page with the region highlighted where feasible; collapsible **Sources** panel grouping all citations; "improve prompt" button on short inputs; skeleton loading states.
4. **Deliverables flow** — generation card with per-artifact progress (memo/deck/model), file cards with preview thumbnails + download; artifacts land in the project Library.
5. **Onboarding wizard** (4 steps, pretty but shallow): ① Company profile & subscription tier (3 plan cards) ② Connect data sources (connector cards w/ Connect buttons, fake OAuth modals) ③ Brand & templates upload (drop Lunar logo/colors/template pptx-docx) ④ **Investment mandate & risk appetite questionnaire in IC language** — target IRR / hurdle rate (e.g. 15%), max single-name concentration (10%), target holding period (3–5y), liquidity requirements, Shariah-compliance requirement (mandatory screen), sector appetite, max drawdown tolerance. This data is REAL — it feeds the corpus as Lunar's private docs and the AI cites it back.
6. **Connections page** (Settings) — ROGO-style catalog: Connected (Saudi Exchange Disclosures, Argaam, marketaux news, Lunar Data Room, Templates) vs Available/MVP (SAHMK API, Bloomberg, PitchBook, Intralinks, Datasite, od.data.gov.sa, REGA, GASTAT, Alinma Open Banking [SAMA], Capital IQ) + "Add custom MCP" modal.
7. **Agents page** — mirrors the pitch deck's slide-9 architecture (see `context/pitch-deck-notes.md`): an **Orchestrator / Planner** banner ("routes and sequences tasks") on top, 7 specialist cards below, "7 specialist teams · 20+ agents" as the page subtitle, and the human-review checkpoint shown at the end of the flow. Each card lists its methods in analyst vocabulary (this page IS the "technical implementation" pitch for fin judges):
   - **Research & Sourcing** (البحث والمصادر) — screening universe, filings ingestion, news & expert-network sweep
   - **Document Intelligence** (ذكاء المستندات) — prospectus/CIM extraction, footnote & related-party analysis, covenant summaries
   - **Valuation & Modeling** (النمذجة والتقييم) — **DCF (FCFF/FCFE, WACC via CAPM, Gordon terminal value), trading comps (EV/Revenue, EV/EBITDA, P/E), precedent transactions, LBO-lite, sensitivity & scenario analysis**
   - **Comparables & Precedents** (المقارنات) — comp-set construction, multiple regression vs growth/margin
   - **Risk & Portfolio Monitoring** (المخاطر ومراقبة المحفظة) — **quantified risk scorecard (probability × impact), bear/base/bull scenario-weighted expected return, downside-to-mandate breach checks, concentration & liquidity limits** + covenants, alerts, periodic reports (merges the deck's "Monitoring & Portfolio" with the demo-critical Risk role — Q&A 2's Agent Activity shows this card's name)
   - **Deliverable Writing** (كتابة التقارير) — IC memos, research notes, pitch decks, periodic reports
   - **Verification & Compliance** (التحقق والامتثال) — **Shariah screening per AAOIFI/Tadawul methodology (debt/market-cap ratio, non-permissible income %), fact-check vs source, sanctions & conflicts, confidence flags** — the deck's red-bordered fact-checker box.
8. **Team research view** — "who runs Jahez?" card grid of leadership with web-source links (static pre-fetched, labeled Web).

Explicitly OUT of scope: real auth, real connectors, Excel add-in, email agent, share/permissions, mobile.

## 5. Technical architecture

```
faheem/  (Next.js 15, TypeScript, App Router — single process)
├─ app/
│  ├─ (marketing)/onboarding/…        # wizard steps
│  ├─ (app)/page.tsx                  # home/omnibox
│  ├─ (app)/chat/[id]/page.tsx        # chat + doc panel
│  ├─ (app)/connections, agents, library
│  └─ api/
│     ├─ chat/route.ts                # POST → SSE stream (agent stages + tokens + citations)
│     ├─ improve/route.ts             # Haiku prompt improver
│     ├─ generate/[artifact]/route.ts # docx | pptx | xlsx
│     └─ documents/[id]/route.ts      # serve corpus PDFs
├─ lib/
│  ├─ ai/client.ts                    # Anthropic SDK, model from env
│  ├─ ai/corpus.ts                    # manifest: id, title ar/en, path, type, source URL, pages
│  ├─ ai/prompts.ts                   # grounded analyst system prompt (ar/en)
│  ├─ ai/cache.ts                     # record/replay (JSON, keyed by hash(question, lang, docset))
│  ├─ ai/mode.ts                      # live | cached | auto
│  └─ generate/{xlsx,pptx,docx}.ts    # template builders + model-inputs.json
├─ data/
│  ├─ corpus/                         # the PDFs (see §6)
│  ├─ model-inputs.json               # hand-verified figures + per-figure source refs
│  └─ demo-cache/                     # recorded golden-path responses
├─ messages/{ar,en}.json              # next-intl
└─ .env  ANTHROPIC_API_KEY, FAHEEM_MODE, FAHEEM_MODEL=claude-opus-4-8,
         FAHEEM_IMPROVE_MODEL=claude-haiku-4-5, FAHEEM_RECORD
```

**Chat pipeline (live mode):**
1. Request → route handler; emit SSE "agent stage" events (choreographed: which agents, which docs they're "reading" — drawn from the real corpus manifest, ~4–6 s total, overlapping with the real API call which starts immediately).
2. Call `client.messages.stream` — `model` from env, `thinking: {type:"adaptive"}`, corpus PDFs as `document` blocks **referencing Files-API `file_id`s** (uploaded once during data prep — avoids per-request base64 inflation and the 32 MB body limit; beta `files-api-2025-04-14` on the messages call) with `citations:{enabled:true}` and `cache_control:{type:"ephemeral", ttl:"1h"}` on the last block; user question after the cached prefix. First call of the day pre-warms the cache (`max_tokens: 0` pre-warm request in a script).
3. Stream text deltas + citation blocks → frontend renders chips (`document_index` + `start_page_number` → corpus manifest → viewer deep-link).
4. If `FAHEEM_RECORD`, persist the full response to demo-cache.

**Anti-hallucination:** system prompt: answer ONLY from provided documents; every quantitative claim must carry a citation; if not in sources, say so and offer what IS available; respond in the user's language. Citations are API-enforced (cited_text must exist in the doc). Golden-path answers are additionally human-reviewed during rehearsal and pinned in cache.

**Corpus size guard:** budget ≤ 600 pages / 32MB total (API PDF limits). If the pack exceeds it, a cheap Haiku doc-router picks the relevant subset per question. Start simple: whole pack + caching.

**Deliverables generation:** artifacts are template-driven for reliability. `model-inputs.json` holds hand-verified figures (each with `{value, source_doc, page}`) extracted once during data prep. Claude (live) writes the narrative sections (memo prose, deck bullets, recommendation) grounded in the corpus; exceljs/pptxgenjs/docx merge narrative + verified numbers into Lunar-branded templates. Excel cells get comments "Source: <doc>, p.<n>" with localhost deep-links (the ROGO Excel-citation wow-detail). Word memo gets a sources appendix. Generation completes in seconds; golden-path artifacts also pre-generated as fallback.

## 6. Static data pack (`data/corpus/` — fill on day 1)

Public Jahez documents (**all re-verified HTTP 200 on 2026-07-12**, sizes from HEAD):
1. **FY2024 Annual Report (EN)** — jahezgroup.com/jahez-ar/2024/assets/img/pdfs/Jahez-Annual%20Report%202024-English.pdf — **14.3 MB, must be ghostscript-compressed** (image-heavy ARs typically shrink 3–5×)
2. **FY2025 Earnings Call Presentation** — jahezgroup.com/wp-content/uploads/2026/04/FY2025-Earnings-Call-PPT.pdf (2.6 MB)
3. **FY2025 Earnings Release** — jahezgroup.com/wp-content/uploads/2026/04/Jahez-Q4-2025_ER-En.pdf
4. **Q1 2026 Interim FS** — jahezgroup.com/wp-content/uploads/2026/05/Jahez-Q1-2026-ENG-FULL-FS-with-review-report.pdf (1.9 MB)
5. **Q1 2026 Earnings Call** — jahezgroup.com/wp-content/uploads/2026/05/Jahez-Q1-2026-Earnings-Call-V8.pdf (4.8 MB)
6. **FY2025 signed FS** — identify on jahezgroup.com/financial-information/ at download time (45 PDF links indexed; the Nov-2025 upload `Jahez-English-FSs.pdf` is likely 9M-2025 — if no standalone FY2025 statutory FS exists, the ER + earnings-call deck carry the FY2025 numbers; don't block on it)
7. **Industry/news pack** (compiled into one PDF with per-article source URLs): Keeta KSA entry & expansion, quick-commerce price-war coverage (Jahez/HungerStation/Ninja dark stores), Argaam FY2025 + Q1 2026 result articles, sector TAM notes.
8. **Jahez leadership/team pack** — public bios, board from AR, with web sources.
8b. **Market-data & comps snapshot** (compiled PDF, sourced & dated): Jahez share price/market cap/shares outstanding (Saudi Exchange/Argaam snapshot), Saudi 10Y government sukuk yield (risk-free rate for WACC), equity risk premium note (e.g. Damodaran KSA), sector beta note, and trading multiples for the comp set — Talabat (DFM, listed Dec 2024), Deliveroo, DoorDash, Delivery Hero, Swiggy/Zomato(Eternal). Every DCF input in the demo traces to a page in this pack — judges WILL ask "where did the WACC come from."

Lunar Investments private docs (we author, realistic, Arabic+English):
9. **Lunar IC Charter & Investment Mandate** (allocation limits, sector appetite, return hurdles)
10. **Lunar Risk Appetite Statement**
11. **Lunar current portfolio snapshot** (fictional holdings)

Notes (verified 2026-07-12):
- **No Arabic FY2024 AR PDF exists** (the AR microsite has an `/ar/` HTML variant but no PDF; the only Arabic PDF on the IR page is the Q3-2025 press release). The Arabic demo beat does NOT depend on an Arabic source doc — Claude answers in Arabic from English sources; optionally include the Arabic press release for authenticity.
- **Size budget:** the 4 sized PDFs alone total ~24 MB raw — over the 32 MB request limit once base64-inflated. Plan of record: upload the corpus once via the **Files API** (beta `files-api-2025-04-14`) and reference `file_id`s in document blocks — citations work identically, no base64 inflation, no re-upload per request. Compress the AR regardless; measure total pages with `pdfinfo` at download (≤600-page per-request cap) and fall back to the Haiku doc-router (§5) if over.
- saudiexchange.sa PDF links are bot-blocked (403) — cite company-hosted PDFs; for Saudi Exchange announcements link the HTML announcement pages.

All demo figures are re-verified against these actual PDFs during data prep — research numbers are not baked in blind.

## 7. Branding & bilingual

**Tokens extracted 2026-07-12 from the Figma "Faheem UI Kit" frame** (file `ZHECLOgl3D76BXygcx5Nyf`, node 17:2, via Figma MCP — access now works). Reference exports live in `context/branding/figma-exports/` (design-system.png, logo-system.png, faheem-ai-screen.png).

| Token | Value |
|---|---|
| Navy / Primary | `#061F52` |
| Green / Accent (Emerald) | `#07966F` |
| Background | `#FBFCFE` |
| Card | `#FFFFFF` |
| Border | `#E3E9F1` |
| Text secondary | `#314160` |
| Warning | `#F59E0B` |
| Danger | `#EF233C` |
| Spacing scale | 8 / 12 / 16 / 24 / 32 px |
| Radius | buttons 8px · cards 10–12px · badges/pills 20px |
| Shadow | `0 10px 24px rgba(8,33,82,0.03)` |
| Type scale | H1 30/800 · H2 22/800 · H3 18/800 · body 14–16/400–600 · caption 12–13/500 · button 16/800 |

- **Typography decision:** the Faheem kit is all-sans with heavy weights → UI/body = Inter + IBM Plex Sans Arabic. The ROGO-signature serif display is kept ONLY for the omnibox hero greeting ("What can Faheem do for you?" / "كيف يخدمك فهيم اليوم؟") — e.g. Lora/Fraunces + a matching Arabic display face — the one editorial flourish layered on the kit.
- **Logo system** (Figma node 17:235): icon-only, horizontal EN, horizontal AR/EN (فهيم under wordmark), vertical — each in light/dark. Green ascending-bars+arrow glyph, navy wordmark. Brand colors per logo sheet: Navy `#0B1F3E`-ish "Trust, finance, stability", Emerald `#07966F` "Growth, investment, success". Export individual variants as SVG/PNG on build day (Figma MCP node screenshots, or crop `logo-system.png`).
- **Deck ≠ app:** the pitch-deck palette (dark navy `#1E1B45`, terracotta, warm off-white — see `context/pitch-deck-notes.md`) is the SLIDES look. The app follows the UI kit. Don't mix.
- **Lunar Investments** (fictional client) skins generated docs with a distinct palette — charcoal + gold, serif headings, "old-money PE" look (finalize in P4) — mirroring how Rogo renders DBS-branded decks with zero vendor branding inside deliverables.
- The Figma file also contains **12 designed screens** (Dashboard, Companies, New Analysis, Analysis Result, Reports, Settings, Faheem AI…). Layouts still follow ROGO (per INIT instruction — see `context/rogo-screens/CATALOG.md`), but borrow component patterns from these screens (quick-action cards, stat cards w/ health score, 5-step stepper, status badges) and the persona **"Arwa — Investor"** as the analyst's name.
- next-intl (**`en` default, `ar` toggle**), `dir` switch at root, Tailwind logical properties (ms-/me-), all copy in both languages, Arabic-Indic numerals OFF for financials (Western digits, standard in Saudi finance). RTL must be flawless when toggled — it's a scripted demo beat, not an afterthought.
- Faheem = product brand (Lunar Technologies). Lunar Investments = fictional client whose brand skins the generated documents (distinct palette so judges see "their brand, not ours").

## 8. Build target & execution plan

**One-day build (July 12), in §4 priority order.** Golden-path recording and answer review happen immediately after the build; remaining days before the hackathon are rehearsal, polish, and re-recording the cache on venue hardware/network only.

**Execution model:** the main (Fable) session is architect + flagship builder; mechanical and parallelizable work is delegated to subagents with pinned model + effort to control token spend. Subagents never run on Opus/Fable; `effort: low` for mechanics, `high` only where a wrong number could be quoted on stage. Subagents return summaries, not file dumps, to keep the main context lean.

| Phase | Work | Executor | Notes |
|---|---|---|---|
| **P0 Scaffold** | create-next-app (TS, App Router), Tailwind + HeroUI, next-intl, fonts, §7 tokens, deps (`@anthropic-ai/sdk`, react-pdf, exceljs, pptxgenjs, docx), env plumbing, commit checkpoint | main | ~30 min |
| **P1 Data prep** (background, runs during P0–P2) | a) corpus-fetch: download §6 PDFs, `pdfinfo` page counts, gs-compress the AR, write `data/corpus/manifest.json` | haiku / low | pure mechanics |
| | b) figures-extract: verified figures from FY2025 ER + Q1-26 FS + FY2024 AR → `data/model-inputs.json` `{value, source_doc, page}` | sonnet / high | main session spot-checks the load-bearing numbers (GMV, take rate, NI −61%, SAR 55M one-off, Q1-26 loss) before they feed artifacts |
| | c) market & industry packs: comps multiples, Saudi 10Y sukuk yield, ERP, beta, price-war articles → 2 compiled PDFs with dated source URLs | sonnet / high + web search | judges WILL ask where the WACC came from |
| | d) lunar-docs: IC Charter (15% hurdle, 10% concentration, 3–5y hold), Risk Appetite, Portfolio snapshot → 3 Lunar-branded PDFs | sonnet / medium | |
| | e) leadership pack: bios + board from AR + web sources | haiku / low | |
| **P2 Core app** | shell + sidebar + i18n/RTL foundation → home/omnibox (serif hero, source-picker flyout, model-tier selector, quick-action pills, Improve affordance) → chat flagship: SSE route (choreographed agent-stage events + token stream + citation blocks), citation chips, Sources accordion, react-pdf viewer deep-link, Agent Activity timeline, `FAHEEM_MODE` live/cached/auto + record/replay, `/api/improve` (Haiku) | **main** | the demo IS this screen; not delegated |
| **P3 Screen fan-out** | onboarding wizard · connections · agents page · library/deliverables UI · team view — one subagent each, disjoint routes, shared components frozen first; each agent gets the §7 tokens + relevant `context/rogo-screens/CATALOG.md` excerpts in its brief | 5× sonnet / medium (parallel) | degrade to static mockups per §9 if time runs out |
| **P4 Deliverables engine** | exceljs workbook per §11 tab spec — main builds the model math & cell-level source comments; docx IC memo + pptx board deck builders; `/api/generate/[artifact]`; Lunar branding | main + sonnet / high | every populated cell carries "Source: <doc>, p.<n>" |
| **P5 Golden path & QA** | cache pre-warm script, `FAHEEM_RECORD=1` golden answers (EN + the Arabic Shariah beat), citation click-through test, RTL sweep, artifact-open test, end-to-end verify against the running app, code review | main (+ code-reviewer subagent) | **requires paid billing first — see §12.1** |

## 9. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Venue wifi / API outage | `auto` mode → cached replay with realistic streaming; pre-generated artifacts |
| Slow first response on stage | Prompt-cache pre-warm script before slot; `effort` tunable; cached golden path |
| Corpus exceeds PDF limits | Curate ≤600 pages; Haiku doc-router fallback |
| Arabic rendering/RTL bugs | RTL-first development, daily checks in both languages |
| Hallucinated numbers in follow-ups | API-enforced citations + grounded refusal prompt + Verification agent framing ("flagged low confidence") |
| Judge asks off-corpus question | Prompt instructs graceful "not in my connected sources — in the MVP this routes to web/Bloomberg"; turns a miss into a roadmap point |
| Time overrun | Screens 1–5 are the demo; 6–8 degrade to static mockups if needed |
| Corpus exceeds request limits (AR alone is 14.3 MB; 4 core PDFs ≈ 24 MB raw) | gs-compress the AR; upload corpus via Files API and reference `file_id`s (no base64 inflation); measure pages at download; Haiku doc-router as last resort |
| Console still on free Evaluation plan | Upgrade to paid before P5 — golden-path recording writes a ~full-corpus prompt cache repeatedly; the evaluation credit won't survive it (§12.1). Rate limits on the paid Start tier are a non-issue (1,000 RPM / 2M input-tok/min for Opus; cache reads don't count) |

## 10. Pitch/sales ammo (verified, citable)

- Category: Hebbia $700M valuation (a16z, 2024); AlphaSense $7.5B valuation, $600M+ ARR (2026); unnamed category leader $2B valuation Series D led by Kleiner Perkins, 300+ institutions, 40K daily users (Apr 2026). GenAI in financial services: $1.89B (2025) → $7.24B (2030), 31% CAGR.
- Saudi: 2026 declared Year of AI; SDAIA: AI = 12% of GDP by 2030, $20B AI investment target; fintechs 10 (2018) → 301 (2025), FSDP target 525 by 2030; cumulative fintech investment SAR 7.9B; HUMAIN $10B AI venture fund; CMA FinTech Lab 68 permits.
- Feasibility hooks: SAMA open banking framework (licensed connectors in MVP), sponsor synergy (Alinma Capital research desk as design partner), subscription model shown in onboarding.
- Rule: never name Rogo.

## 11. Finance content spec (audience = fintech judges)

**Principle:** every AI answer and artifact speaks equity-analyst language. The AI never says "profit went down"; it says "net income compressed 61% YoY on ~SAR 55M of one-offs and take-rate pressure; EBITDA margin contracted ~X bps; contribution margin per order fell below the FY24 baseline."

**Excel valuation workbook — tab spec (exceljs, Lunar-branded):**
1. `Cover` — recommendation, target price, implied upside, IRR at current entry, rating (Buy/Hold/Reduce)
2. `Assumptions` — WACC build (risk-free = Saudi 10Y sukuk, ERP, beta, cost of debt, D/E), terminal growth, tax/zakat rate, forecast horizon — each input cell carries a source comment
3. `Revenue Drivers` — orders × AOV = GMV → take rate → net revenue → delivery costs → contribution margin; segment split (Jahez KSA / Logistics / other)
4. `3-Statement` — summarized P&L, balance sheet, cash flow, FY23A–FY25A + FY26E–FY30E
5. `DCF` — FCFF projection, PV of explicit period + Gordon terminal value, EV → equity bridge (net cash), implied per-share value
6. `Sensitivity` — two-way data table: WACC × terminal growth; second table: take rate × GMV growth
7. `Comps` — EV/Revenue, EV/EBITDA, P/E, EV/GMV for Talabat, Deliveroo, DoorDash, Delivery Hero; implied valuation range vs DCF (football-field summary)
8. `Scenarios & Risk` — bull/base/bear with per-scenario IRR and scenario-weighted expected return; quantified risk register (probability × impact, mitigation)
9. `Shariah Screen` — AAOIFI/Tadawul-methodology ratios (debt/market cap, non-permissible income %) with pass/fail flags

**IC memo (Word) sections:** Executive summary & recommendation · Investment thesis (3 pillars) · Company & industry (quick-commerce competitive dynamics, market share) · Financial analysis (unit economics, operating leverage, FCF profile) · Valuation (DCF + comps triangulation, target price, IRR) · Quantified risk assessment (scorecard + mandate-fit check: hurdle rate, concentration, liquidity) · Shariah & compliance screen · Catalysts & monitoring KPIs · Appendix: sources.

**Board deck (PPTX) ~8 slides:** thesis-on-a-page, market map, unit economics bridge, valuation football field, scenario IRRs, risk matrix, mandate fit, recommendation.

**Founder pitch glossary (for sosi — one-liners to answer judges confidently):**
| Term | One-liner | Where it appears in demo |
|---|---|---|
| GMV / take rate / AOV | Total order value flowing through the app; the % Jahez keeps; average order value | Q&A 1, Revenue Drivers tab |
| Contribution margin | Profit per order after direct delivery costs — the unit-economics health metric | Q&A 1 & 2 |
| Operating leverage | Fixed costs spread over more orders → profits grow faster than revenue (works in reverse too) | Q&A 1 |
| EBITDA (margin) | Operating profit before depreciation etc. — the "core engine" profitability | everywhere |
| FCF / FCFF | Cash actually generated after investment — what a DCF discounts | DCF tab |
| DCF | Valuation = today's value of all future cash flows, discounted at WACC | Valuation Agent, Excel |
| WACC | The discount rate — blended cost of the company's equity + debt (we build it from Saudi 10Y sukuk + risk premium) | Assumptions tab |
| Terminal value (Gordon) | Value of all cash flows beyond the forecast, assuming steady growth forever | DCF tab |
| Sensitivity analysis | "What if WACC or growth is a bit different?" — a grid of valuations, shows honesty about uncertainty | Sensitivity tab |
| Comps (EV/EBITDA, P/E, EV/GMV) | Valuing Jahez by what similar companies (Talabat, DoorDash…) trade at | Comps tab |
| IRR | The annualized % return of the investment case — compared against the fund's hurdle rate | IC memo, Scenarios |
| Hurdle rate | Minimum IRR the mandate demands (Lunar's = 15%) before a deal is investable | Mandate, Q&A 2 |
| Payout ratio / dividend yield | Share of profit paid to shareholders / dividend as % of price — relevant for the comps & mandate income requirements | Comps, mandate |
| Quantified risk assessment | Risks scored probability × impact with a number, not adjectives; rolled into scenario-weighted return | Risk Agent, Q&A 2 |
| Shariah screen (AAOIFI) | Rules-based test: interest-bearing debt < ~33% of market cap, non-permissible income < 5% | Compliance agent card |
| IC memo | The document an Investment Committee reads to approve/reject a deal — Faheem's flagship output | Deliverables |

## 12. Needed from user

1. **Upgrade the Anthropic Console from the free Evaluation plan to paid — before P5 (today).** Steps: [platform.claude.com](https://platform.claude.com) → **Settings → Billing** → add a payment method / purchase credits (this moves the org onto the paid **Start tier**; tiers advance automatically with usage). Verify on **Settings → Limits** (shows current tier + rate limits). **$25–50 of credits is plenty**: the big cost is the corpus prompt-cache write (~SAR-corpus ≈ 300–500K tokens × $10/MTok at 1h-TTL write ≈ $3–5 per cold write; reads are ~$0.50/MTok, and cached tokens don't count toward rate limits). Expect ~$15–40 total across build + rehearsal. The $5 evaluation credit dies after one or two full-corpus requests — upgrade first, then record.
2. ~~API key~~ ✅ in `.env`. ~~Figma access~~ ✅ works via the Figma MCP connector — UI-kit tokens, logo system, and screens extracted 2026-07-12 (see §7 and `context/branding/figma-exports/`). Optional nicety: export the logo variants as **SVG** from Figma (select variant → Export → SVG) into `context/branding/` for crisper rendering; otherwise we build from MCP PNG exports.
3. Optional: real example templates to mimic for the branded outputs.
4. Demo-day logistics when known (own laptop? projector? judge interaction?).
