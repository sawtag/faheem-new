# Faheem Demo — Full Design Spec (Amad 2026 Hackathon)

**Date:** 2026-07-12 · **Demo day:** July 16–18, 2026 (on-site, Tuwaiq Academy HQ, Riyadh) · **Format:** 15 min presentation + demo combined
**Goal:** WIN. Prize pool 500K+ SAR (1st: 250K). Track 1: Generative AI for Fintech.
**Judging criteria (official):** innovation/creativity, technical implementation, data analysis, user experience, real-world implementation feasibility.

---

## 1. Strategy in one paragraph

**We are building a Rogo AI–style platform for the Saudi market.** Rogo is the US category leader in AI for finance (~$2B valuation, Kleiner Perkins/Sequoia-backed, 300+ institutions) — Faheem is that product thesis localized: Tadawul/CMA data, Arabic support, Shariah screening, SAMA open-banking roadmap. (Internal framing only — **on stage we never name Rogo**; we say "category leaders emerging in the US/UK.")

**The product is shaped around the actual workflow of an investment firm** (validated with a finance practitioner, 2026-07-12): ① a company approaches the firm (or, for public names, the firm screens the market) → ② fast **screening** against the firm's mandate and internal policies → ③ if advanced, the **deep analysis** — the weeks-long, hardest part: market sizing, data-room digestion, books, leadership diligence, and the Excel/Word/PPT outputs → ④ the **Investment Committee** decides (and ranks deals). Faheem puts agents at every stage — a **Screening Agent**, the 7-team analysis engine, and **Faheem IC** (committee advisor) — with a human gate between each stage. **Pitch spine: we don't replace humans — we accelerate weeks into hours and enhance accuracy. Humans decide at every gate.**

The demo tells this pipeline end-to-end inside **Lunar Investments** — fictional client: a **Riyadh-based multi-strategy investment firm** (public equities on Tadawul + private growth equity; sector focus technology & consumer; AUM ~SAR 2bn — no regulatory/religious labels in its identity; the Shariah screen appears as a mandate requirement, not firm branding). This firm type is chosen deliberately: it's the only shape where BOTH pipelines are business-as-usual and it matches real Saudi firms judges know. **Target market (say it on stage): enterprise — investment firms, banks, and sovereign wealth funds: "from boutique desks to the PIF."** Faheem's demo client is a mid-size firm precisely so the scaling story upward (Alinma Capital → PIF) is obvious. Each company lives in its own **workspace** on a deal-pipeline board. **The demo runs private-first, then switches to public:** a fictional inbound startup (**Darb**, logistics SaaS — synthetic data, presented as "anonymized to protect the company," which is what real firms do) carries the private screening beat; then the pivot — "for public companies the same pipeline starts from a market screen instead of an inbound pitch" — and **Jahez (Tadawul 6017)**, surfaced by a SAHMK/Argaam screen, carries the deep-dive money shot amid the Saudi quick-commerce war, where **every number carries a clickable citation to a real document page** and the analyst walks away with Lunar-branded deliverables (IC memo in Word, board deck in PowerPoint, full financial model in Excel — each figure source-linked). The story closes in the **Faheem IC room**, where the committee compares two deals against the hurdle and Faheem advises — advisory only, the committee decides. The multi-agent architecture from the pitch deck (7 specialist teams + fact-checker) is visible as live "agent activity," agents are directly addressable via **@-mentions** (docs via **#-references**), and the Connections page shows the MVP integration roadmap (Tadawul, SAHMK, data rooms, open banking). Everything runs locally on Next.js + Claude API with static verified data — zero moving parts that can break on stage.

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
| Design | **Rogo-informed layouts (reference, not constraint — user relaxed 2026-07-12)** + Faheem brand tokens from Figma. Keep the proven demo-load-bearing patterns (omnibox hero, split chat+artifact, citation chips, Sources accordion); free design judgment elsewhere | Rogo is "great for suggestions" (user); the FE must impress on its own merits. |
| Demo narrative (2026-07-12 rev.) | **Deal-pipeline story: Screening → Deep Analysis → IC**, shown **private-first, then public** | Mirrors the real firm workflow (practitioner-validated). Private flow = fictional **Darb** (logistics SaaS, Series B inbound; synthetic data framed on stage as "anonymized to protect the company"); public flow = **Jahez** (surfaced by a SAHMK/Argaam market screen; real verified data, the deep-dive centerpiece). Fictional **Thara Pay** (fintech, analysis complete) joins Jahez in the IC ranking (**exactly 2 deals compared — keep it simple**); **Aqar Development** shown Declined (real estate — outside mandate). Fictional names are placeholders — rename freely. |
| Client-firm identity | **Lunar Investments: Riyadh-based multi-strategy investment firm** — public equities (Tadawul) + private growth equity; sector focus technology & consumer; AUM ~SAR 2bn (fictional). No "CMA-licensed"/"Shariah-compliant" labels (user call) — Shariah screening remains a mandate requirement, not firm identity | Only firm type where both pipelines are native; matches real Saudi asset managers judges know. **Target market: enterprise investment firms, banks, sovereign funds — name-drop the PIF on stage.** |
| Onboarding | **Restored as a "Connect & Configure" demo beat** (~1.5 min): new-customer story — connector catalog + fake OAuth + "Add custom MCP" modal, agent/skill toggles, mandate questionnaire → IC Charter. Built as a thin stepper shell (Figma kit stepper) wrapping the Connections page, an agent-toggle panel, and a mandate form — no separate wizard app | User wants the connectivity story ("how they connect systems/plugins/skills/MCP/endpoints") — it IS the ease-of-connecting pitch. Show stays at 15 min by compressing the slide intro to ~3 min (workflow story lands better in-app). |
| Workspaces | **Each company = a workspace** (docs, chats, artifacts, stage badge) on a pipeline board | User request (Claude-Projects-like); maps 1:1 to Rogo's Projects pattern (sidebar + project page already cataloged). Chat engine gains a workspace context param — same engine everywhere. |
| Stage agents | **Screening Agent** (mandate-fit scorecard, cites IC Charter) and **Faheem IC** (committee advisor — ranks/answers, explicitly never decides) join the 7 analysis teams | The accelerate-not-replace pitch needs agents AT the workflow stages, with human gates between. Screening + IC beats run on pre-baked fictional data (same chat engine, different system prompt + doc subset) — live-AI engineering stays concentrated on the Jahez deep dive. |
| @ / # interactions | **`@` mentions an agent** (typeahead → chip → that agent leads the run; orchestrator auto-selects by default). **`#` references a corpus document** (typeahead over the manifest → scopes/emphasizes that doc). GUI equivalents: agent picker in the omnibox toolbar; source-picker flyout for docs. Per-agent enable/disable = cosmetic toggles on the Agents page (Rogo-Skills pattern), no config depth. | Cheap to build (system-prompt routing + manifest typeahead), makes the multi-agent claim tangible. **No dedicated demo beat** — one @ in Q&A 2, one # in Q&A 1. |

## 3. Demo narrative & 15-minute run of show

**Persona:** Arwa, analyst at Lunar Investments. **Frame:** one morning in the firm's real workflow — Screening → Deep Analysis → IC — **shown private-first, then public**, with Faheem accelerating every stage and a human deciding at every gate. (Table sums to 15:00 — the official format; beats marked ✂ are the cut order if the clock runs hot.)

| Min | Beat | On screen |
|---|---|---|
| 0–1.5 | **Problem**: 129+ hours per memo, 345+ pages per prospectus, 10+ disconnected sources, zero reuse. "Decisions worth billions of riyals are built manually." | Slides |
| 1.5–3 | **Category + why now** (compressed): agentic AI for finance exploding in US/UK (Hebbia $700M; AlphaSense $7.5B; unnamed $2B category leader, Kleiner Perkins/Sequoia, 300+ institutions — *never name Rogo*). Saudi: Year of AI, SDAIA 12%-of-GDP target, 301 fintechs, HUMAIN. **Nobody built this for Saudi, in Arabic, on Tadawul data.** Then the workflow in one breath: inbound pitch (or market screen) → screening → weeks of manual analysis → IC. "Faheem accelerates each stage from weeks to hours — a human decides at every gate." | Slides |
| 3–4.5 | **Connect & Configure (new-customer beat)**: Lunar onboards — stepper: ① connector catalog (Saudi Exchange disclosures ✓, Argaam ✓, SAHMK, news, **company data room**, "books/ERP via open banking — MVP"), one fake OAuth connect + the **"Add custom MCP" modal** ("any internal system speaks to Faheem"); ② agents & skills panel (the toggle grid — Screening, the 7 analysis teams, Faheem IC); ③ **investment mandate & risk questionnaire** → "this becomes your IC Charter — Faheem cites it back to you." | Live app |
| 4.5–6 | **Private pipeline — Screening beat**: the deal-pipeline board (filter: **Inbound (Private) / Market Screen (Public)**) — **Darb** (logistics SaaS, *Screening*), **Thara Pay** (*IC Review*), **Aqar Development** (*Declined — outside mandate: real estate*), Jahez (*Analysis*, public badge). Open Darb's workspace: inbound request, docs the **Screening Agent** collected from the company ("details anonymized — client confidentiality"), the **mandate-fit scorecard** — sector ✓, ticket ✓, stage ✓, Shariah pre-screen ✓, concentration ⚠ — every criterion citing the **Lunar IC Charter** page. Click **"Advance to pitch meeting"** — human gate #1. | Live app |
| 6–9 | **Switch to public — Jahez deep dive (the money shot)**: pivot line: "for public companies, the same pipeline starts from a market screen — no inbound needed." Jahez's workspace (origin badge: *SAHMK/Argaam screen, 2026-07-08*): "Break down Jahez's FY2025 unit economics from **#FY2025-Earnings-Release** — GMV growth vs take rate, AOV, contribution margin, EBITDA margin — and why did net income compress ~61% despite double-digit GMV growth?" (`#` typeahead = 2-second flourish) → agent activity timeline (Research → Document Intelligence → **Valuation & Modeling** → **Risk & Portfolio Monitoring** → Compliance fact-check) → streamed analyst answer with inline citation chips → click a citation → **the actual Jahez earnings PDF opens at the cited page**. Sources accordion shows the fact→citation mapping. | Live app |
| 9–10.5 | **Q&A moment 2**: "**@Risk & Portfolio Monitoring** — run a quantified risk assessment of the quick-commerce price war; does the position fit our mandate?" (`@` = agents are addressable) → **risk scorecard** (probability × impact, bps of take-rate compression per scenario, scenario-weighted expected return) citing BOTH the industry pack AND Lunar's private docs ("breaches your IC Charter's 15% IRR hurdle in the bear case; exceeds the 10% single-name concentration limit — Lunar IC Charter, p.4"). ✂ Prompt-improve micro-moment: "jahez good?" → **Improve** → structured equity-research prompt (Haiku). | Live app |
| 10.5–11.5 | **Arabic moment**: toggle the whole UI to Arabic live (full RTL) and ask: "هل يجتاز جاهز الفحص الشرعي وفق منهجية AAOIFI؟" → Shariah-screen card (debt/market-cap ratio, non-permissible income %, pass/fail) answered in Arabic with citations. | Live app |
| 11.5–13 | **Deliverables**: "Prepare the IC memo, DCF model, and committee deck." → generation progress → **Word IC memo + Excel valuation workbook + PPTX board deck in Lunar branding** → open the Excel live: Assumptions, Revenue Drivers, 3-Statement, **DCF (FCFF, WACC build, Gordon TV)**, **Sensitivity**, **Comps (vs Talabat, Deliveroo, DoorDash)**, Scenarios — every populated cell: "Source: Jahez FY2025 Earnings Release, p.3" deep-linking into Faheem's viewer. Human gate #2: the analyst reviews before anything reaches the IC. | Live app + Office |
| 13–14 | **Faheem IC room**: comparison of the two analysis-complete deals (**Jahez vs Thara Pay**: implied IRR vs 15% hurdle, risk score, mandate fit, Shariah). "Rank these — where's the strongest risk-adjusted case?" → advisor answer with citations into both analyses + on-screen: **"Advisory only — the investment decision rests with the committee."** Human gate #3. | Live app |
| 14–15 | **Close**: one architecture slide (orchestrator, 7 teams, fact-checker, 3 human gates — judges already saw it live); MVP roadmap (data rooms, Bloomberg/PitchBook, od.data.gov.sa, SAMA open banking); business model (enterprise SaaS, tiers/seat + usage) and **target market: institutional investors — asset managers, banks, insurance, pension funds (Hassana/GOSI), government funds: "every institution that evaluates deals, from boutique desks to Alinma Capital to the PIF" — closing on the governance argument: auditable AI with human gates is what makes institutional adoption possible (§10)**. "We're not replacing analysts — we're accelerating weeks into hours. We're not building a chatbot — we're building the knowledge infrastructure of the Saudi financial sector." Team + ask. | Slides |

Judges' follow-up questions after: keep app in `auto` mode, invite them to ask Faheem anything about Jahez (or ask Faheem IC to defend its ranking).

## 4. Product scope — screens (all bilingual; English default, full RTL when toggled)

Priority order (build top-down; 1–6 are must-have — they carry the demo):

1. **App shell / sidebar** — Faheem logo, New Chat, Home, Search, **Deals** (pipeline), Documents (Library), Agents, Scheduled Tasks (visual), pinned workspaces (Jahez, Darb, Thara Pay), user footer (Arwa avatar, "Lunar Investments"). Present on every screen.
2. **Home / omnibox** — serif hero "What can Faheem do for you today?" (AR: "كيف يخدمك فهيم اليوم؟"), large input card with: attach, **source-picker flyout** (External: Tadawul disclosures ✓, Argaam ✓, News ✓, Web ✓ / Internal: Lunar Data Room ✓, Templates ✓, Mandate ✓ — each with toggle), model tier selector ("Faheem · Max" / "فهيم · Max"), mic, send. **`@` typeahead** (agent registry: the 7 teams + Screening Agent + Faheem IC → chip; orchestrator auto-selects when absent) and **`#` typeahead** (corpus manifest → doc chip that scopes the question); GUI equivalents = agent picker icon in the input toolbar + the source-picker flyout. Quick-action pills use analyst vocabulary: **Run DCF · Comps Analysis · IC Memo · Risk Scorecard · Sensitivity Analysis · Shariah Screen** (AR when toggled: تقييم DCF، تحليل الشركات المماثلة، مذكرة لجنة الاستثمار، بطاقة المخاطر، تحليل الحساسية، الفحص الشرعي).
3. **Chat + citations + document viewer** (flagship) — streamed prose with inline numbered citation chips; collapsible **Agent Activity** timeline above the answer (choreographed stages mapped to real doc set; an @-mentioned agent leads the timeline); right split panel = PDF viewer (react-pdf) that opens at the cited page with the region highlighted where feasible; collapsible **Sources** panel grouping all citations; "improve prompt" button on short inputs; skeleton loading states. Same engine serves workspace chat, screening explanations, and Faheem IC (context param → system prompt + doc subset).
4. **Deal pipeline + company workspaces** — pipeline board (columns or stage badges: Screening → Analysis → IC Review → Decided/Declined) with company cards (logo, sector, stage, ask, one-line status) and an **origin dimension: Inbound (Private) vs Market Screen (Public)** — filter pills at the top + an origin badge per card (Jahez's reads "SAHMK/Argaam screen · 2026-07-08"); this is how the demo pivots private→public. Each **workspace** = Rogo-Projects-style page: "Ask Faheem about {company}" scoped omnibox, tabs **Overview | Documents (data room) | Chats | Artifacts | Leadership**; stage banner with the human-gate action ("Advance to pitch meeting" / "Send to IC"). Leadership tab absorbs the old Team-research view (card grid, web-source links, static pre-fetched). Darb's Overview houses the **Screening Agent report**: inbound summary ("details anonymized — client confidentiality") + mandate-fit scorecard (criterion rows: sector, ticket vs mandate, stage, Shariah pre-screen, concentration — each pass/warn/fail with a citation chip into the Lunar IC Charter). Pre-baked fictional data; scorecard rendered from JSON.
5. **Deliverables flow** — generation card with per-artifact progress (memo/deck/model), file cards with preview thumbnails + download; artifacts land in the workspace's Artifacts tab.
6. **Faheem IC room** — committee view: comparison table of analysis-complete deals (Jahez, Thara Pay) — implied IRR vs 15% hurdle, risk score, mandate fit, Shariah status, recommendation — plus a Faheem IC chat (same engine; system prompt = advisor persona; doc subset = both companies' analysis outputs + Lunar mandate; golden answers cached). Persistent disclaimer: **"Advisory only — the investment decision rests with the committee."** Thara Pay's "completed analysis" = pre-baked summary metrics + a short authored analysis PDF.
7. **Connections page** (Settings) — ROGO-style catalog: Connected (Saudi Exchange Disclosures, Argaam, marketaux news, Lunar Data Room, Templates) vs Available/MVP (SAHMK API, Bloomberg, PitchBook, Intralinks, Datasite, od.data.gov.sa, REGA, GASTAT, Alinma Open Banking [SAMA], Capital IQ) + "Add custom MCP" modal.
8. **Agents page** — mirrors the pitch deck's slide-9 architecture (see `context/pitch-deck-notes.md`), now grouped **by pipeline stage**: *Stage 1 — Screening* (Screening Agent card: intake questionnaire, mandate-fit scorecard, policy checks vs IC Charter), *Stage 2 — Deep Analysis* (Orchestrator/Planner banner "routes and sequences tasks" + the 7 specialist cards below, "7 specialist teams · 20+ agents" subtitle), *Stage 3 — IC* (Faheem IC card: committee Q&A, deal ranking vs hurdle, advisory-only). Human-gate markers between stages. Each card carries an enable/disable toggle (Rogo-Skills pattern, cosmetic) and an "@mention" hint. Cards list methods in analyst vocabulary (this page IS the "technical implementation" pitch for fin judges):
   - **Research & Sourcing** (البحث والمصادر) — screening universe, filings ingestion, news & expert-network sweep
   - **Document Intelligence** (ذكاء المستندات) — prospectus/CIM extraction, footnote & related-party analysis, covenant summaries
   - **Valuation & Modeling** (النمذجة والتقييم) — **DCF (FCFF/FCFE, WACC via CAPM, Gordon terminal value), trading comps (EV/Revenue, EV/EBITDA, P/E), precedent transactions, LBO-lite, sensitivity & scenario analysis**
   - **Comparables & Precedents** (المقارنات) — comp-set construction, multiple regression vs growth/margin
   - **Risk & Portfolio Monitoring** (المخاطر ومراقبة المحفظة) — **quantified risk scorecard (probability × impact), bear/base/bull scenario-weighted expected return, downside-to-mandate breach checks, concentration & liquidity limits** + covenants, alerts, periodic reports (merges the deck's "Monitoring & Portfolio" with the demo-critical Risk role — Q&A 2's Agent Activity shows this card's name)
   - **Deliverable Writing** (كتابة التقارير) — IC memos, research notes, pitch decks, periodic reports
   - **Verification & Compliance** (التحقق والامتثال) — **Shariah screening per AAOIFI/Tadawul methodology (debt/market-cap ratio, non-permissible income %), fact-check vs source, sanctions & conflicts, confidence flags** — the deck's red-bordered fact-checker box.
9. **Onboarding "Connect & Configure" stepper** (restored to the demo — beat at 3:00–4:30): a thin stepper shell (Figma-kit stepper component) wrapping three panels that exist anyway — ① **Connect**: the Connections catalog (item 7) in wizard dress: connector cards + one fake OAuth modal + the "Add custom MCP" modal, data-room and "books/ERP via SAMA open banking (MVP)" entries visible; ② **Agents & skills**: toggle grid of Screening Agent, the 7 analysis teams, Faheem IC (cosmetic toggles, @-mention hints); ③ **Mandate & risk questionnaire in IC language** — target IRR / hurdle 15%, max single-name concentration 10%, holding period 3–5y, liquidity, mandatory Shariah screen, sector appetite (technology & consumer), max drawdown — closing line: "this becomes your IC Charter." This data is REAL — it IS the Lunar IC Charter corpus doc the Screening Agent, Q&A 2, and Faheem IC all cite. (Skipped: subscription-tier and brand-upload steps — mentioned verbally, no build.)

(Team-research is now the Leadership tab inside each workspace — see item 4.)

Explicitly OUT of scope: real auth, real connectors, Excel add-in, email agent, share/permissions, mobile, real per-agent configuration (toggles are cosmetic).

## 5. Technical architecture

```
faheem/  (Next.js 15, TypeScript, App Router — single process)
├─ app/
│  ├─ (marketing)/onboarding/…        # wizard steps
│  ├─ (app)/page.tsx                  # home/omnibox
│  ├─ (app)/deals/page.tsx            # pipeline board
│  ├─ (app)/deals/[company]/page.tsx  # company workspace (Overview|Documents|Chats|Artifacts|Leadership)
│  ├─ (app)/ic/page.tsx               # Faheem IC room (comparison table + advisor chat)
│  ├─ (app)/chat/[id]/page.tsx        # chat + doc panel
│  ├─ (app)/connections, agents, library
│  └─ api/
│     ├─ chat/route.ts                # POST → SSE stream (agent stages + tokens + citations); body carries {question, lang, context: firm|workspace:<id>|ic, agent?: @-mention, docs?: #-refs}
│     ├─ improve/route.ts             # Haiku prompt improver
│     ├─ generate/[artifact]/route.ts # docx | pptx | xlsx
│     └─ documents/[id]/route.ts      # serve corpus PDFs
├─ lib/
│  ├─ ai/client.ts                    # Anthropic SDK, model from env
│  ├─ ai/corpus.ts                    # manifest: id, title ar/en, path, type, source URL, pages, workspace
│  ├─ ai/agents.ts                    # agent registry: name ar/en, stage, system-prompt flavor, default doc subset (drives @-typeahead, Agent Activity, Agents page)
│  ├─ ai/prompts.ts                   # grounded analyst system prompt (ar/en) + per-context flavors (workspace analyst | screening | IC advisor)
│  ├─ ai/cache.ts                     # record/replay (JSON, keyed by hash(question, lang, docset, context))
│  ├─ ai/mode.ts                      # live | cached | auto
│  └─ generate/{xlsx,pptx,docx}.ts    # template builders + model-inputs.json
├─ data/
│  ├─ corpus/                         # the PDFs (see §6)
│  ├─ deals.json                      # pipeline: company, sector, stage, origin (inbound|market-screen), ask, status line, screening scorecard rows (Darb), IC metrics (Jahez, Thara Pay), decline reason (Aqar)
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

**Context & agent routing:** one chat engine, three context flavors — `workspace:<id>` (analyst persona, corpus subset = that company's docs + Lunar docs + market packs), `ic` (Faheem IC advisor persona, doc subset = analysis outputs of IC-stage deals + mandate, hard-coded "advisory only" framing), `firm` (default home). An `@`-mention pins the named agent: its system-prompt flavor leads, and the Agent Activity timeline opens with that agent. `#`-refs restrict/emphasize the listed manifest docs. No mention → orchestrator narration picks agents (choreographed). Screening scorecards and IC comparison tables render from `deals.json` (pre-baked) — only their *chat* explanations hit the API, and those are golden-cached.

**Anti-hallucination:** system prompt: answer ONLY from provided documents; every quantitative claim must carry a citation; if not in sources, say so and offer what IS available; respond in the user's language. Citations are API-enforced (cited_text must exist in the doc). Golden-path answers are additionally human-reviewed during rehearsal and pinned in cache. Faheem IC additionally: never state a decision; always frame as recommendation + rationale + what would change it.

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
9. **Lunar IC Charter & Investment Mandate** (firm profile: Riyadh-based multi-strategy — public equities + private growth equity, AUM ~SAR 2bn; allocation limits, sector appetite — technology & consumer, 15% IRR hurdle, 10% single-name concentration, Shariah screen required by mandate) — now triple-duty: cited by the Screening Agent scorecard, Q&A 2 mandate-fit, and Faheem IC
10. **Lunar Risk Appetite Statement**
11. **Lunar current portfolio snapshot** (fictional holdings)

Fictional-deal docs (we author, short — they power the Screening and IC beats):
12. **Darb data-room mini pack** (~6–8 pages total): one-page company profile + ask (Series B, SAR 40M, logistics SaaS), financial summary table, founder bios — "collected by the Screening Agent"
13. **Thara Pay completed-analysis summary** (~4 pages): metrics used in the IC comparison (implied IRR, risk score, mandate fit, Shariah status) so Faheem IC's ranking answer has a citable source
(Aqar Development needs no docs — just a decline card + reason in `deals.json`.)

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

> **Superseded on execution detail by `docs/superpowers/plans/2026-07-12-implementation-plan.md`** — the full task-card plan (fable as orchestrator/reviewer, per-task model+effort, contracts, testing strategy, gates). The table below remains the phase-level summary. Root-level `AGENTS.md` carries the build conventions every agent must follow.

**One-day build (July 12), in §4 priority order.** Golden-path recording and answer review happen immediately after the build; remaining days before the hackathon are rehearsal, polish, and re-recording the cache on venue hardware/network only.

**Execution model:** the main (Fable) session is architect + flagship builder; mechanical and parallelizable work is delegated to subagents with pinned model + effort to control token spend. Subagents never run on Opus/Fable; `effort: low` for mechanics, `high` only where a wrong number could be quoted on stage. Subagents return summaries, not file dumps, to keep the main context lean.

| Phase | Work | Executor | Notes |
|---|---|---|---|
| **P0 Scaffold** | create-next-app (TS, App Router), Tailwind + HeroUI, next-intl, fonts, §7 tokens, deps (`@anthropic-ai/sdk`, react-pdf, exceljs, pptxgenjs, docx), env plumbing, commit checkpoint | main | ~30 min |
| **P1 Data prep** (background, runs during P0–P2) | a) corpus-fetch: download §6 PDFs, `pdfinfo` page counts, gs-compress the AR, write `data/corpus/manifest.json` | haiku / low | pure mechanics |
| | b) figures-extract: verified figures from FY2025 ER + Q1-26 FS + FY2024 AR → `data/model-inputs.json` `{value, source_doc, page}` | sonnet / high | main session spot-checks the load-bearing numbers (GMV, take rate, NI −61%, SAR 55M one-off, Q1-26 loss) before they feed artifacts |
| | c) market & industry packs: comps multiples, Saudi 10Y sukuk yield, ERP, beta, price-war articles → 2 compiled PDFs with dated source URLs | sonnet / high + web search | judges WILL ask where the WACC came from |
| | d) lunar-docs + fictional deals: IC Charter (15% hurdle, 10% concentration, 3–5y hold, sector mandate), Risk Appetite, Portfolio snapshot, **Darb data-room mini pack, Thara Pay analysis summary** → branded PDFs + `data/deals.json` (pipeline stages, screening scorecard rows, IC metrics) | sonnet / medium | |
| | e) leadership pack: bios + board from AR + web sources | haiku / low | |
| **P2 Core app** | shell + sidebar (incl. Deals nav + pinned workspaces) + i18n/RTL foundation → home/omnibox (serif hero, source-picker flyout, model-tier selector, quick-action pills, Improve affordance, **@/# typeahead**) → chat flagship: SSE route with **context routing (firm / workspace / ic) + agent registry**, choreographed agent-stage events + token stream + citation blocks, citation chips, Sources accordion, react-pdf viewer deep-link, Agent Activity timeline, `FAHEEM_MODE` live/cached/auto + record/replay, `/api/improve` (Haiku) | **main** | the demo IS this engine; not delegated |
| **P3 Screen fan-out** | deal pipeline board + company workspaces · Faheem IC room · connections · agents page (stage-grouped) · library/deliverables UI · onboarding Connect-&-Configure stepper (wraps connections + agent toggles + mandate form) — one subagent each, disjoint routes, shared components + chat engine frozen first; each agent gets the §7 tokens + relevant `context/rogo-screens/CATALOG.md` excerpts in its brief | 6× sonnet / medium (parallel) | pipeline/workspace/IC render from `deals.json`; main reviews the demo-critical ones (pipeline, IC, stepper) before integration; degrade order per §9 |
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
| Time overrun | Screens 1–6 are the demo core; degradation order: agents-page interactivity (static diagram) → library polish → onboarding stepper shell (beat survives on the bare Connections page + mandate form) → workspace tabs collapse to Overview+Chats. The Jahez deep dive + citations are never cut. Demo beats marked ✂ in §3 are the on-stage cut order. |
| Pipeline-scope creep (screening/IC/workspaces added 2026-07-12) | Screening scorecard + IC comparison render from pre-baked `deals.json`; their chats are golden-cached; @/# are typeahead sugar over existing routing — none of it adds live-AI surface area beyond the one engine |
| Corpus exceeds request limits (AR alone is 14.3 MB; 4 core PDFs ≈ 24 MB raw) | gs-compress the AR; upload corpus via Files API and reference `file_id`s (no base64 inflation); measure pages at download; Haiku doc-router as last resort |
| Console still on free Evaluation plan | Upgrade to paid before P5 — golden-path recording writes a ~full-corpus prompt cache repeatedly; the evaluation credit won't survive it (§12.1). Rate limits on the paid Start tier are a non-issue (1,000 RPM / 2M input-tok/min for Opus; cache reads don't count) |

## 10. Pitch/sales ammo (verified, citable)

- Category: Hebbia $700M valuation (a16z, 2024); AlphaSense $7.5B valuation, $600M+ ARR (2026); unnamed category leader $2B valuation Series D led by Kleiner Perkins, 300+ institutions, 40K daily users (Apr 2026). GenAI in financial services: $1.89B (2025) → $7.24B (2030), 31% CAGR.
- Saudi: 2026 declared Year of AI; SDAIA: AI = 12% of GDP by 2030, $20B AI investment target; fintechs 10 (2018) → 301 (2025), FSDP target 525 by 2030; cumulative fintech investment SAR 7.9B; HUMAIN $10B AI venture fund; CMA FinTech Lab 68 permits.
- Feasibility hooks: SAMA open banking framework (licensed connectors in MVP), sponsor synergy (Alinma Capital research desk as design partner), subscription model shown in onboarding.
- **Target market (institutional investors):** asset managers & investment firms, bank research/capital-markets desks (Alinma Capital), insurance investment arms, **pension funds (Hassana/GOSI — ~$300B+)**, and **government/sovereign funds — name-drop the PIF** (~$900B+, Riyadh; the world's most ambitious sovereign investor) as the aspirational ceiling: "every institution that evaluates deals, from boutique desks to the PIF." Frame as ambition, not a claimed customer.
- **The governance argument (THE institutional close — say it after the IC beat):** institutions can't adopt AI that makes decisions; they can adopt AI that's *auditable*. Faheem is built governance-first: mandate screening that cites the firm's own charter page, three human decision gates, an advisory-only IC agent that never decides, a full audit trail of every answer/source/artifact, and API-enforced citations so nothing is unattributable. "That's why this works for a pension fund or the PIF, not just a boutique — the process stays theirs; Faheem just makes it 100× faster." When a judge asks "would a bank/PIF trust this?" — the demo has already answered: point at the scorecard citation, the gates, and the audit trail they watched grow.
- **Positioning line (practitioner-validated workflow):** "We don't replace analysts or committees — we accelerate the screening→analysis→IC pipeline from weeks to hours, with a human decision gate at every stage." Three visible human gates in the demo: advance-past-screening, analyst review of deliverables, IC decision (Faheem IC is advisory-only). This is the governance/feasibility answer when judges ask "would a bank trust this?"
- **Differentiation vs the US/UK category leaders** (internal framing: Rogo is our *functionality* reference — chat+citations, deliverables, connections, projects — and we go beyond it exactly where Saudi wins): native **Arabic/RTL**, guided **onboarding & mandate capture**, the **deal-pipeline workflow** (Screening Agent + Faheem IC — they sell answers, we sell the process), **governance** (audit trail, human gates, advisory-only IC), **Saudi data rails** (Tadawul, SAHMK, Argaam), **AAOIFI Shariah screening**. This is the "why us, why here" answer when judges ask what's new vs the US players.
- Rule: never name Rogo.

## 11. Finance content spec (audience = fintech judges)

**Principle:** every AI answer and artifact speaks equity-analyst language. The AI never says "profit went down"; it says "net income compressed 61% YoY on ~SAR 55M of one-offs and take-rate pressure; EBITDA margin contracted ~X bps; contribution margin per order fell below the FY24 baseline."

**Screening Agent scorecard (rendered from `deals.json`, every row cites the Lunar IC Charter):**
| Criterion | Check | Example (Darb) |
|---|---|---|
| Sector mandate | in/out of "technology & consumer" | ✓ logistics SaaS |
| Ticket vs mandate | ask within min/max ticket & fund capacity | ✓ SAR 40M Series B |
| Stage fit | fund invests Series A–C | ✓ |
| Shariah pre-screen | business activity permissible; leverage sanity check | ✓ |
| Concentration | post-deal single-name & sector exposure vs 10% cap | ⚠ sector at 8.5% → flag |
| Red flags | sanctions/conflicts/related parties quick pass | ✓ none found |
Verdict line: "Recommend advancing to pitch meeting — 5 pass, 1 flag. Decision: yours." (Aqar's declined card shows the inverse: ✗ sector mandate — real estate.)

**Faheem IC — comparison & advisory spec:** table columns per analysis-complete deal: implied IRR at entry vs **15% hurdle**, scenario-weighted expected return, risk score (from the quantified scorecard), mandate fit, Shariah status, analyst recommendation. Advisory answers must: rank with rationale, cite both companies' analysis docs + the IC Charter, state sensitivity ("Jahez ranking flips if bear-case take-rate compression exceeds X bps"), and end with the advisory-only line. Never "invest/don't invest" — always "the case is strongest/weakest because…, the committee decides."

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
| Screening | The fast go/no-go filter against the firm's mandate BEFORE any deep work — saves the expensive analysis for deals that can actually close | Screening Agent, pipeline beat |
| Investment Committee (IC) | The partners who vote to approve or reject a deal — the final human gate | Faheem IC room |
| Mandate | The firm's own rulebook: what sectors, sizes, stages and risks it's allowed to invest in | IC Charter, screening scorecard |
| Ticket size | How much the fund writes into a single deal | Screening scorecard |
| Series B | A company's second major venture funding round (post product-market fit, scaling) | Darb's ask |
| Data room | The secure folder of due-diligence documents a company shares with investors | Darb workspace, Connections |
| Due diligence | The structured investigation of a company before investing — what stage 2 accelerates | Deep-dive beat |
| TAM / SAM / SOM | Total / serviceable / obtainable market — the market-sizing funnel in every analysis | Market pack, deep dive |

## 12. Needed from user

1. **Upgrade the Anthropic Console from the free Evaluation plan to paid — before P5 (today).** Steps: [platform.claude.com](https://platform.claude.com) → **Settings → Billing** → add a payment method / purchase credits (this moves the org onto the paid **Start tier**; tiers advance automatically with usage). Verify on **Settings → Limits** (shows current tier + rate limits). **$25–50 of credits is plenty**: the big cost is the corpus prompt-cache write (~SAR-corpus ≈ 300–500K tokens × $10/MTok at 1h-TTL write ≈ $3–5 per cold write; reads are ~$0.50/MTok, and cached tokens don't count toward rate limits). Expect ~$15–40 total across build + rehearsal. The $5 evaluation credit dies after one or two full-corpus requests — upgrade first, then record.
2. ~~API key~~ ✅ in `.env`. ~~Figma access~~ ✅ works via the Figma MCP connector — UI-kit tokens, logo system, and screens extracted 2026-07-12 (see §7 and `context/branding/figma-exports/`). Optional nicety: export the logo variants as **SVG** from Figma (select variant → Export → SVG) into `context/branding/` for crisper rendering; otherwise we build from MCP PNG exports.
3. Optional: real example templates to mimic for the branded outputs.
4. Demo-day logistics when known (own laptop? projector? judge interaction?).
