# Faheem Demo — Full Design Spec (Amad 2026 Hackathon)

**Date:** 2026-07-12 · **Demo day:** July 16–18, 2026 (on-site, Tuwaiq Academy HQ, Riyadh) · **Format:** 15 min presentation + demo combined
**Goal:** WIN. Prize pool 500K+ SAR (1st: 250K). Track 1: Generative AI for Fintech.
**Judging criteria (official):** innovation/creativity, technical implementation, data analysis, user experience, real-world implementation feasibility.

---

## 1. Strategy in one paragraph

Faheem is "the AI financial research team for the Saudi investor." The demo tells one story end-to-end: **Lunar Investments** (fictional client investment firm) evaluates **Jahez (Tadawul 6017)** amid the Saudi quick-commerce war — onboards onto Faheem, connects data sources, asks questions in Arabic and English, gets answers where **every number carries a clickable citation to a real document page**, and walks away with branded deliverables (IC memo in Word, board deck in PowerPoint, full financial model in Excel — each figure source-linked). The multi-agent architecture from the pitch deck (7 specialist teams + fact-checker) is visible as live "agent activity," and the Connections page shows the MVP integration roadmap (Tadawul, SAHMK, data rooms, open banking). Everything runs locally on Next.js + Claude API with static verified data — zero moving parts that can break on stage.

## 2. Locked decisions

| Decision | Choice | Rationale |
|---|---|---|
| Demo company | **Jahez International (6017)** | 5/5 judge familiarity (app on their phones), 5/5 story: IPO darling → 2025 profit beats → FY2025 profit −61% (SAR 73M, incl. SAR 55M Q4 one-off) → Q1 2026 net **loss** SAR 9.2M amid Keeta/HungerStation/Ninja price war. Real bilingual docs available. User's instinct + research agree. |
| Stack | **Single Next.js app** (App Router, TypeScript) | One process on localhost, zero integration risk. Tailwind + HeroUI (RTL-capable). Doc generation in Node (exceljs, pptxgenjs, docx). No Python, no vector DB. |
| Retrieval | **No RAG infra — native PDF documents + API citations** | Corpus is ~6–8 curated PDFs; pass as document blocks with `citations: {enabled: true}` → Claude returns `page_location` citations (real page numbers, no hallucinated refs). Prompt caching (1h TTL) makes repeat queries fast/cheap. This is the single highest-leverage choice: grounded citations for free, and "every number has a source" is literally enforced by the API. |
| Main model | **`claude-opus-4-8`** (streaming, adaptive thinking, `effort` env-tunable) | Best quality; model ID via `FAHEEM_MODEL` env so we can trial `claude-sonnet-5` if stage latency demands. ~$5/$25 per MTok — trivial at demo volume with caching. |
| Prompt improver | **`claude-haiku-4-5`** | Per user instruction ("haiku or weak model"). Fast + cheap. |
| Live vs cached | **Hybrid, user-controlled**: `FAHEEM_MODE=live\|cached\|auto` | `live` = real API. `cached` = replay recorded responses with simulated streaming. `auto` = live with timeout → cache fallback. `FAHEEM_RECORD=1` records every live answer during rehearsal. Judges can ask follow-ups live; golden path is bulletproof. |
| Languages | **Arabic-first UI, live EN/AR toggle**; demo asks one question in Arabic, one in English | Saudi judges; pitch deck is Arabic; bilingualism is an explicit hackathon criterion ("تجربة مستخدم عربية"). Full RTL. |
| Design | ROGO layouts + Faheem brand (navy/green from pitch deck; exact tokens from Figma once access granted) | Per INIT instructions. |

## 3. Demo narrative & 15-minute run of show

**Persona:** analyst at Lunar Investments. **Task:** "Should we invest in Jahez? Get me the full picture of Saudi/GCC food delivery & quick commerce — fast."

| Min | Beat | On screen |
|---|---|---|
| 0–2 | **Problem** (from pitch deck): 129+ hours per investment memo, 345+ pages per prospectus, 10+ disconnected sources, zero reuse. "Decisions worth billions of riyals are built manually." | Slides |
| 2–3 | **Category proof + why now**: agentic AI for finance is exploding in the US/UK (Hebbia — $700M valuation, a16z; AlphaSense — $7.5B valuation, $600M ARR; a category leader just raised at a $2B valuation backed by Kleiner Perkins & Sequoia, used by 300+ institutions — *do not name Rogo*). Saudi: 2026 = Year of AI, SDAIA targets AI = 12% of GDP by 2030, 301 fintechs (30× since 2018), FSDP target 525 by 2030, HUMAIN $10B fund. **Nobody has built this for the Saudi market, in Arabic, on Tadawul data. We are.** | Slides |
| 3–4.5 | **Onboarding flyover**: Lunar Investments signs up → picks subscription tier → connects data sources (Tadawul/Saudi Exchange disclosures ✓, Argaam ✓, news ✓, SAHMK API, data room, Alinma Open Banking "coming in MVP") → uploads brand templates → sets investment mandate & risk appetite. | Live app, fast clicks |
| 4.5–8 | **Q&A moment 1 (Arabic)**: "حلّل الأداء المالي لجاهز في 2025: هوامش EBITDA، اقتصاديات الوحدة (متوسط قيمة الطلب، نسبة العمولة take rate، هامش المساهمة)، ولماذا انخفض صافي الربح رغم نمو GMV؟" → agent activity timeline (Research → Document Intelligence → **Valuation Agent** → **Risk Agent** → Compliance fact-check) → streamed answer in analyst language (GMV, take rate, AOV, contribution margin, operating leverage, FCF) with inline numbered citation chips → click a citation → **the actual Jahez earnings PDF opens at the cited page**. Sources panel shows grouped footnotes. | Live app — the money shot |
| 8–10 | **Q&A moment 2 (English, toggles language live)**: "Run a quantified risk assessment of the quick-commerce price war and its impact on Jahez's unit economics — and does the position fit our mandate?" → answer delivers a **risk scorecard** (probability × impact matrix, bps of take-rate compression per scenario, scenario-weighted expected return) and cites BOTH the industry pack AND Lunar's private docs ("breaches your IC Charter's 15% IRR hurdle in the bear case; exceeds the 10% single-name concentration limit — Lunar IC Charter, p.4"). Show prompt-improve: type "jahez good?" → **Improve** → full structured equity-research prompt (Haiku). | Live app |
| 10–12.5 | **Deliverables**: "Prepare the IC memo, DCF model, and committee deck." → generation progress → **Word IC memo (recommendation, target price, IRR at entry, catalysts, risk factors) + Excel valuation workbook + PPTX board deck, all in Lunar Investments branding** → open the Excel live: tabs for Assumptions, Revenue Drivers (GMV → take rate → net revenue), 3-Statement, **DCF (FCFF, WACC build, Gordon terminal value)**, **Sensitivity (WACC × terminal growth)**, **Comps (EV/Revenue, EV/EBITDA, P/E vs Talabat, Deliveroo, DoorDash)**, Scenarios (bull/base/bear with implied IRR each) — and every populated cell has a comment: "Source: Jahez FY2025 Earnings Release, p.3" linking back into Faheem's document viewer. | Live app + Office |
| 12.5–14 | **Architecture + MVP roadmap**: the 7 specialist agent teams + Shariah/compliance fact-checker + human review checkpoint (deck diagram); Connections roadmap (data rooms — Intralinks/Datasite, Bloomberg/PitchBook, od.data.gov.sa, SAMA open banking); business model (SaaS tiers/seat + usage); Alinma synergy (sponsor is a bank — Faheem for Alinma Capital's research desk). | Slides |
| 14–15 | **Close**: "نحن لا نبني روبوت محادثة — نحن نبني البنية المعرفية للقطاع المالي السعودي." Team + ask. | Slides |

Judges' follow-up questions after: keep app in `auto` mode, invite them to ask Faheem anything about Jahez.

## 4. Product scope — screens (all bilingual, RTL-first)

Priority order (build top-down; 1–5 are must-have):

1. **App shell / sidebar** — Faheem logo, New Chat, Home, Search, Documents (Library), Agents, Scheduled Tasks (visual), Pinned project "Jahez Evaluation", user footer (Lunar analyst avatar). Present on every screen.
2. **Home / omnibox** — serif hero "كيف يخدمك فهيم اليوم؟", large input card with: attach, **source-picker flyout** (External: Tadawul disclosures ✓, Argaam ✓, News ✓, Web ✓ / Internal: Lunar Data Room ✓, Templates ✓, Mandate ✓ — each with toggle), model tier selector ("فهيم · Max / Faheem · Max"), mic, send. Quick-action pills use analyst vocabulary: **Run DCF · Comps Analysis · IC Memo · Risk Scorecard · Sensitivity Analysis · Shariah Screen** (تقييم DCF، تحليل الشركات المماثلة، مذكرة لجنة الاستثمار، بطاقة المخاطر، تحليل الحساسية، الفحص الشرعي).
3. **Chat + citations + document viewer** (flagship) — streamed prose with inline numbered citation chips; collapsible **Agent Activity** timeline above the answer (choreographed stages mapped to real doc set); right split panel = PDF viewer (react-pdf) that opens at the cited page with the region highlighted where feasible; collapsible **Sources** panel grouping all citations; "improve prompt" button on short inputs; skeleton loading states.
4. **Deliverables flow** — generation card with per-artifact progress (memo/deck/model), file cards with preview thumbnails + download; artifacts land in the project Library.
5. **Onboarding wizard** (4 steps, pretty but shallow): ① Company profile & subscription tier (3 plan cards) ② Connect data sources (connector cards w/ Connect buttons, fake OAuth modals) ③ Brand & templates upload (drop Lunar logo/colors/template pptx-docx) ④ **Investment mandate & risk appetite questionnaire in IC language** — target IRR / hurdle rate (e.g. 15%), max single-name concentration (10%), target holding period (3–5y), liquidity requirements, Shariah-compliance requirement (mandatory screen), sector appetite, max drawdown tolerance. This data is REAL — it feeds the corpus as Lunar's private docs and the AI cites it back.
6. **Connections page** (Settings) — ROGO-style catalog: Connected (Saudi Exchange Disclosures, Argaam, marketaux news, Lunar Data Room, Templates) vs Available/MVP (SAHMK API, Bloomberg, PitchBook, Intralinks, Datasite, od.data.gov.sa, REGA, GASTAT, Alinma Open Banking [SAMA], Capital IQ) + "Add custom MCP" modal.
7. **Agents page** — 7 cards from the pitch deck, each listing its methods in analyst vocabulary (this page IS the "technical implementation" pitch for fin judges):
   - **Research & Sourcing** (البحث والمصادر) — screening universe, filings ingestion, news & expert-network sweep
   - **Document Intelligence** (ذكاء المستندات) — prospectus/CIM extraction, footnote & related-party analysis, covenant summaries
   - **Valuation Agent** (النمذجة والتقييم) — **DCF (FCFF/FCFE, WACC via CAPM, Gordon terminal value), trading comps (EV/Revenue, EV/EBITDA, P/E), precedent transactions, LBO-lite, sensitivity & scenario analysis**
   - **Comparables & Precedents** (المقارنات) — comp-set construction, multiple regression vs growth/margin
   - **Risk Agent** (تقييم المخاطر) — **quantified risk scorecard (probability × impact), bear/base/bull scenario-weighted expected return, downside-to-mandate breach checks, concentration & liquidity limits**
   - **Deliverable Writing** (كتابة التقارير) — IC memos, research notes, pitch decks, periodic reports
   - **Verification & Compliance** (التحقق والامتثال) — **Shariah screening per AAOIFI/Tadawul methodology (debt/market-cap ratio, non-permissible income %), fact-check vs source, sanctions & conflicts, confidence flags** — plus the human-review checkpoint.
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
2. Call `client.messages.stream` — `model` from env, `thinking: {type:"adaptive"}`, corpus PDFs as `document` blocks with `citations:{enabled:true}` and `cache_control:{type:"ephemeral", ttl:"1h"}` on the last block; user question after the cached prefix. First call of the day pre-warms the cache (script).
3. Stream text deltas + citation blocks → frontend renders chips (`document_index` + `start_page_number` → corpus manifest → viewer deep-link).
4. If `FAHEEM_RECORD`, persist the full response to demo-cache.

**Anti-hallucination:** system prompt: answer ONLY from provided documents; every quantitative claim must carry a citation; if not in sources, say so and offer what IS available; respond in the user's language. Citations are API-enforced (cited_text must exist in the doc). Golden-path answers are additionally human-reviewed during rehearsal and pinned in cache.

**Corpus size guard:** budget ≤ 600 pages / 32MB total (API PDF limits). If the pack exceeds it, a cheap Haiku doc-router picks the relevant subset per question. Start simple: whole pack + caching.

**Deliverables generation:** artifacts are template-driven for reliability. `model-inputs.json` holds hand-verified figures (each with `{value, source_doc, page}`) extracted once during data prep. Claude (live) writes the narrative sections (memo prose, deck bullets, recommendation) grounded in the corpus; exceljs/pptxgenjs/docx merge narrative + verified numbers into Lunar-branded templates. Excel cells get comments "Source: <doc>, p.<n>" with localhost deep-links (the ROGO Excel-citation wow-detail). Word memo gets a sources appendix. Generation completes in seconds; golden-path artifacts also pre-generated as fallback.

## 6. Static data pack (`data/corpus/` — fill on day 1)

Public Jahez documents (URLs verified live July 2026):
1. **FY2024 Annual Report (EN)** — jahezgroup.com/jahez-ar/2024/assets/img/pdfs/Jahez-Annual Report 2024-English.pdf
2. **FY2024 Annual Report (AR)** — same microsite `/ar/` assets (confirm exact file at download time)
3. **FY2025 Earnings Call Presentation** — jahezgroup.com/wp-content/uploads/2026/04/FY2025-Earnings-Call-PPT.pdf
4. **Q1 2026 Interim FS** — jahezgroup.com/wp-content/uploads/2026/05/Jahez-Q1-2026-ENG-FULL-FS-with-review-report.pdf
5. **Q1 2026 Earnings Call** — jahezgroup.com/wp-content/uploads/2026/05/Jahez-Q1-2026-Earnings-Call-V8.pdf
6. **FY2025 signed FS + earnings release** — from jahezgroup.com/financial-information/ (grab at download time)
7. **Industry/news pack** (compiled into one PDF with per-article source URLs): Keeta KSA entry & expansion, quick-commerce price-war coverage (Jahez/HungerStation/Ninja dark stores), Argaam FY2025 + Q1 2026 result articles, sector TAM notes.
8. **Jahez leadership/team pack** — public bios, board from AR, with web sources.
8b. **Market-data & comps snapshot** (compiled PDF, sourced & dated): Jahez share price/market cap/shares outstanding (Saudi Exchange/Argaam snapshot), Saudi 10Y government sukuk yield (risk-free rate for WACC), equity risk premium note (e.g. Damodaran KSA), sector beta note, and trading multiples for the comp set — Talabat (DFM, listed Dec 2024), Deliveroo, DoorDash, Delivery Hero, Swiggy/Zomato(Eternal). Every DCF input in the demo traces to a page in this pack — judges WILL ask "where did the WACC come from."

Lunar Investments private docs (we author, realistic, Arabic+English):
9. **Lunar IC Charter & Investment Mandate** (allocation limits, sector appetite, return hurdles)
10. **Lunar Risk Appetite Statement**
11. **Lunar current portfolio snapshot** (fictional holdings)

Note: saudiexchange.sa PDF links are bot-blocked (403) — cite company-hosted PDFs; for Saudi Exchange announcements link the HTML announcement pages.

All demo figures are re-verified against these actual PDFs during data prep — research numbers are not baked in blind.

## 7. Branding & bilingual

- Tokens from pitch deck until Figma access lands: deep navy (~#16233F), Faheem green (~#17B26A arrow/accent), cream/off-white surfaces, Arabic serif-ish display for heroes (e.g. IBM Plex Sans Arabic / Noto Naskh for body; final per Figma).
- next-intl (`ar` default, `en`), `dir` switch at root, Tailwind logical properties (ms-/me-), all copy in both languages, Arabic-Indic numerals OFF for financials (Western digits, standard in Saudi finance).
- Faheem = product brand (Lunar Technologies). Lunar Investments = fictional client whose brand skins the generated documents (distinct palette so judges see "their brand, not ours").

## 8. Build plan (4 days — hackathon starts July 16)

- **Day 1 (Jul 12):** git init; scaffold Next.js + Tailwind + HeroUI + next-intl; download & verify corpus; author Lunar docs; build `model-inputs.json`; corpus manifest; shell + sidebar.
- **Day 2 (Jul 13):** chat pipeline end-to-end (streaming, citations, PDF viewer deep-link, sources panel); grounded prompt; hybrid mode + recorder; prompt improver.
- **Day 3 (Jul 14):** agent-activity timeline; deliverables generators (xlsx → docx → pptx, in that order); onboarding wizard; connections + agents pages; language toggle polish.
- **Day 4 (Jul 15):** golden-path recording + human review of answers; visual polish pass against Figma; pre-warm scripts; full rehearsals (live and cached); risk drills (kill wifi mid-demo); pitch-deck updates with app screenshots.
- **Jul 16–18 (on-site):** re-record cache on venue network, rehearse on demo hardware, final polish, buffer.

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

1. `ANTHROPIC_API_KEY` in `.env`.
2. Figma access: authorize the Figma connector (claude.ai connector settings, or `/mcp` in an interactive `claude` session) — or export key frames as PNGs into `context/branding/`.
3. Faheem logo files (SVG/PNG) if available outside Figma.
4. Optional: real example templates to mimic for the branded outputs.
5. Demo-day logistics when known (own laptop? projector? judge interaction?).
