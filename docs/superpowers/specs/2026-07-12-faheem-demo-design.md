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
| 4.5–8 | **Q&A moment 1 (Arabic)**: "أعطني تقييماً شاملاً لأداء جاهز المالي في 2025، وما أسباب تراجع الربحية رغم نمو الإيرادات؟" → agent activity timeline (Research → Document Intelligence → Financial Analysis → Compliance fact-check) → streamed answer with inline numbered citation chips → click a citation → **the actual Jahez earnings PDF opens at the cited page** in the side panel. Sources panel shows the grouped footnotes. | Live app — the money shot |
| 8–10 | **Q&A moment 2 (English, toggles language live)**: "How is Keeta's entry reshaping Saudi food delivery, and what does that mean for Jahez's unit economics?" → answer cites the news/industry pack AND Lunar's own uploaded mandate ("exceeds your mandate's max 10% single-name consumer-tech allocation — Lunar IC Charter, p.4"). Show prompt-improve: type "jahez good?" → **Improve** → full structured analyst prompt (Haiku). | Live app |
| 10–12.5 | **Deliverables**: "Prepare the IC memo and financial model for Sunday's committee." → generation progress → **Word IC memo + Excel 3-statement/driver model + PPTX board deck, all in Lunar Investments branding** → open the Excel: every populated cell has a comment: "Source: Jahez FY2025 Earnings Release, p.3" linking back into Faheem's document viewer. | Live app + Office |
| 12.5–14 | **Architecture + MVP roadmap**: the 7 specialist agent teams + Shariah/compliance fact-checker + human review checkpoint (deck diagram); Connections roadmap (data rooms — Intralinks/Datasite, Bloomberg/PitchBook, od.data.gov.sa, SAMA open banking); business model (SaaS tiers/seat + usage); Alinma synergy (sponsor is a bank — Faheem for Alinma Capital's research desk). | Slides |
| 14–15 | **Close**: "نحن لا نبني روبوت محادثة — نحن نبني البنية المعرفية للقطاع المالي السعودي." Team + ask. | Slides |

Judges' follow-up questions after: keep app in `auto` mode, invite them to ask Faheem anything about Jahez.

## 4. Product scope — screens (all bilingual, RTL-first)

Priority order (build top-down; 1–5 are must-have):

1. **App shell / sidebar** — Faheem logo, New Chat, Home, Search, Documents (Library), Agents, Scheduled Tasks (visual), Pinned project "Jahez Evaluation", user footer (Lunar analyst avatar). Present on every screen.
2. **Home / omnibox** — serif hero "كيف يخدمك فهيم اليوم؟", large input card with: attach, **source-picker flyout** (External: Tadawul disclosures ✓, Argaam ✓, News ✓, Web ✓ / Internal: Lunar Data Room ✓, Templates ✓, Mandate ✓ — each with toggle), model tier selector ("فهيم · Max / Faheem · Max"), mic, send. Quick-action pills: تقييم شركة, مذكرة استثمار, نموذج مالي, بحث السوق.
3. **Chat + citations + document viewer** (flagship) — streamed prose with inline numbered citation chips; collapsible **Agent Activity** timeline above the answer (choreographed stages mapped to real doc set); right split panel = PDF viewer (react-pdf) that opens at the cited page with the region highlighted where feasible; collapsible **Sources** panel grouping all citations; "improve prompt" button on short inputs; skeleton loading states.
4. **Deliverables flow** — generation card with per-artifact progress (memo/deck/model), file cards with preview thumbnails + download; artifacts land in the project Library.
5. **Onboarding wizard** (4 steps, pretty but shallow): ① Company profile & subscription tier (3 plan cards) ② Connect data sources (connector cards w/ Connect buttons, fake OAuth modals) ③ Brand & templates upload (drop Lunar logo/colors/template pptx-docx) ④ Investment mandate & risk appetite questionnaire (this data is REAL — it feeds the corpus as Lunar's private docs).
6. **Connections page** (Settings) — ROGO-style catalog: Connected (Saudi Exchange Disclosures, Argaam, marketaux news, Lunar Data Room, Templates) vs Available/MVP (SAHMK API, Bloomberg, PitchBook, Intralinks, Datasite, od.data.gov.sa, REGA, GASTAT, Alinma Open Banking [SAMA], Capital IQ) + "Add custom MCP" modal.
7. **Agents page** — 7 cards from the pitch deck: البحث والمصادر (Research & Sourcing), ذكاء المستندات (Document Intelligence), النمذجة والتقييم (Modeling & Valuation), المقارنات (Comparables), كتابة التقارير (Deliverable Writing), المراقبة والمحفظة (Monitoring), التحقق والامتثال (Verification & Compliance — Shariah screening, fact-check, sanctions) with enable toggles.
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

## 11. Needed from user

1. `ANTHROPIC_API_KEY` in `.env`.
2. Figma access: authorize the Figma connector (claude.ai connector settings, or `/mcp` in an interactive `claude` session) — or export key frames as PNGs into `context/branding/`.
3. Faheem logo files (SVG/PNG) if available outside Figma.
4. Optional: real example templates to mimic for the branded outputs.
5. Demo-day logistics when known (own laptop? projector? judge interaction?).
