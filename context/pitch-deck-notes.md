# Faheem Pitch Deck — Extraction Notes

> Generated 2026-07-12 from `context/Lunar Team - Agentic AI Financial Platform (Faheem).pdf` (16 slides). Keep the demo app narratively and visually consistent with this.

## Slide inventory

| # | Content |
|---|---|
| 1 | Title — "منصة فهيم: الذكاء التوكيلي للمستثمر السعودي" (Faheem: Agentic AI for the Saudi Investor), فريق لونار; Alinma + Tuwaiq logos |
| 2 | Team members (5 people) |
| 3 | Contents 01–07 |
| 4 | Problem — 4 stat cards + result banner |
| 5 | Solution — Faheem logo reveal (dark navy) |
| 6 | Data used: public & private — 6 data-source cards |
| 7 | Tech stack — Backend / Frontend / Model providers |
| 8 | Idea description + applied example (Intake / Due Diligence / Output) |
| 9 | **رحلة الطلب داخل فهيم — the agent architecture diagram** |
| 10 | Data pipeline Collect→Process→Analyze→Deliver |
| 11 | Track/sector fit (Vision 2030, SAMA open banking) |
| 12 | Summary — results so far, closing banner |
| 13 | Testing/validation — 30% completion, execution graph |
| 14 | Screenshots/video — splash screen + demo video link |
| 15 | Challenges & roadmap (next two weeks → 70%) |
| 16 | Thank you |

## Agent architecture (slide 9 — mirror this on the Agents page & Agent Activity timeline)

Flow: Analyst submits request → **Orchestrator / Planner** ("Routes and sequences tasks") → 6 parallel **specialist agents** → cross-checked by **Verification & Compliance (Fact checker)** ↔ **Shared infrastructure (Database)** → **Human review checkpoint** (Reject/Revise → reroutes with new instructions | Approve) → **Final deliverable**.

Specialist agents (exact deck labels):
1. **Researching & sourcing** — screen universe, pull market data and news
2. **Modeling & Valuation** — DCF, LBO, credit fund returns
3. **Comparables & Precedents** — trading comps, precedent transactions
4. **Deliverable Writing** — IC and credit memos, research notes, pitch decks
5. **Monitoring & Portfolio** — covenants, alerts, periodic reports
6. **Document Intelligence** — extract from CIMs, PPMs, credit agreements, filings

**Verification & Compliance (Fact checker)**: Shariah screening, fact-check vs sources, sanctions and conflicts, confidence flags.

**Shared infrastructure**: Connectors (Tadawul, Bloomberg, CapIQ, Refinitiv, data rooms, code sandbox) · Memory/knowledge (firm history, deal context, user preferences) · Permissions & audit (info barriers, full audit trail).

Slide 13 language: **"7 specialist teams, 20+ smart agents"**; execution graph: research + document analysis in parallel → modeling + comparables in parallel → report writing → compliance check → human review → final document.

## Branding

- Deck (slides) palette: deep navy `#1E1B45`–`#211F42` dark slides; warm off-white `#F1F0ED` content slides with pink/peach diagonal gradient; terracotta `#BF6248`–`#C1633D` heading accents; green accents (dark green `#1B6E4A` on mint `#DCEEE4`; emerald `#1F9D6C` for logo arrow). **This is the SLIDES look — the app uses the Figma UI-kit palette (navy #061F52 / emerald #07966F), do not mix.**
- Faheem product logo: green ascending bar-chart + arrow icon; bold navy Arabic "فهيم" + "FAHEEM" green letter-spaced caps; splash tagline "AI-Powered Investment Analysis — Analyzing the future, empowering decisions."
- Typography: bold geometric Arabic sans (Tajawal/Cairo-like) headings; neutral sans body.

## Pitch numbers (quote exactly, already in spec §10)

- Problem: **zero** reusability; **10+** disconnected sources; **345+** pages per prospectus; **129+** hours per memo; "النتيجة: قرارات أبطأ، وتكلفة أعلى، وفرص استثمارية تضيع كل يوم"
- Data: **350+ companies** via SAHMK API (Twelve Data backup); ~300-page bilingual filings in RAG library
- SAMA open banking licensing regime — data model built to its standards from day one
- Results so far: design system + **12 Figma screens**; 7 specialist agent teams designed; working market/news API keys; bilingual synthetic-data generator; "hours instead of weeks"
- Closing: "نحن لا نبني روبوت محادثة! نحن نبني البنية المعرفية للقطاع المالي السعودي بالذكاء الاصطناعي التوكيلي"
- Status at deck time: 30% complete, next two weeks → 70%

## Consistency notes for the build

- Never frame Faheem as a chatbot; frame as an owned AI analyst team (orchestrator + specialists + fact-checker + human review).
- Persona in Figma screens: **"Arwa — Investor"** (spec uses a Lunar Investments analyst — keep "Arwa" as the analyst's name).
- Trust signals to surface in UI: Shariah screening, audit trail, confidence/fact-check flags, "every number traceable to source".
- Deliverable types: chat Q&A, IC memos (Word), board decks (PPTX), full financial models (Excel), portfolio monitoring/alerts, research notes.
- Demo video reference: https://drive.google.com/file/d/1EAuhln4EobiPMaurYdSCbPzrmnPThplv/view
- Deck typo "TailwendCSS" — do not propagate.
