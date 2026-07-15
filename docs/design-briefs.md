# Faheem — Per-Screen Design Briefs (T0.3)

> **Addendum (fable, post-gate-A):** the Figma cover/splash frame is ratified as additional LOGIN reference (ideas, not layout law): ① giant low-opacity glyph watermark art — oversized faded bars + a soft emerald swoosh sweeping the bottom edge of the viewport (use the traced Logo paths at low opacity, never a bitmap); ② tagline lockup under the logo: "AI-Powered Investment Analysis" in emerald 13/700; ③ secondary line "Analyzing the future, empowering decisions." as text-secondary caption — bilingual per pitch-deck register. The login card + navy backdrop spec in §1 still stands; blend these in. Serif policy update (AGENTS.md): serif display is also sanctioned for large workspace/IC page display titles.

> **Audience:** the sonnet implementers of T3.1 (Login), T3.5 (Connections + Onboarding stepper), T3.6 (Agents + Library + Audit Trail).
> **Rule of this document:** you make **zero** visual decisions. Every dimension, token, primitive, motion, state, and string is specified here. If something is genuinely missing, ask fable — do not improvise. **Primitives only, no new visual language, tokens only — deviations get bounced at gate D.**

---

## 0. Shared preamble (applies to every brief below)

### 0.1 Token vocabulary (names provisional until gate A — use these semantic names consistently)

All values come from `app/globals.css` `@theme` (T0.2, fable-owned). Never write a hex, px shadow, or ad-hoc duration in `app/**` or `components/**` — the ESLint guard will reject it.

| Token | Value / meaning | Where you'll use it |
|---|---|---|
| `--color-navy` | `#061F52` — brand primary | headings, primary buttons, dark banner |
| `--color-navy-50 … 950` | tint/shade ramp over #061F52 | 50 = hover wash & selected bg · 100 = neutral chips · 300 = dashed/hairline emphasis borders · 700 = secondary emphasis text · 950 = gradient deep end |
| `--color-accent` | `#07966F` emerald | success/connected states, active toggles, verified badges |
| `--color-accent-50` | pale mint | BETA pills, active filter pills, citation-count badges, success washes |
| `--color-accent-700` | dark emerald | text on mint surfaces |
| `--color-bg` | `#FBFCFE` | page background |
| `--color-card` | `#FFFFFF` | all cards, modals, table containers |
| `--color-border` | `#E3E9F1` | 1px hairlines everywhere (prefer borders over shadows for rows) |
| `--color-text-secondary` | `#314160` | descriptions, captions, meta text |
| `--color-warning` / `--color-danger` | `#F59E0B` / `#EF233C` | warn/fail badges, error text, fact-checker accent |
| `--radius-btn` / `--radius-card` / `--radius-pill` | 8px / 12px / 20px (pills may be fully rounded) | buttons+inputs / cards+modals / badges+chips+filter pills |
| `--shadow-card` | `0 10px 24px rgba(8,33,82,0.03)` | resting cards that float (hero card, artifact cards) |
| `--shadow-hover` | elevated variant | hover lift only |
| `--shadow-modal` | strongest | Dialog surfaces only |
| `--duration-fast` / `--duration` / `--ease` | 150ms / 250ms / `cubic-bezier(.4,0,.2,1)` | all motion; nothing exceeds 400ms |

**Type scale (spec §7):** H1 30/800 · H2 22/800 · H3 18/800 · body 15–16/400–600 (never below 15 for content text) · caption 12–13/500 · button 16/800 (sm button 14/700). UI font = Inter (EN) / IBM Plex Sans Arabic (AR). **Serif (Lora/Amiri) is forbidden on your screens** — it is reserved for the omnibox hero only.

**Spacing rhythm:** 8px base grid. Page header block → 32px below. Between sections → 48px. Card grid gaps → 16px. Card padding → 24px (compact rows 16px). Page top padding 40px, bottom 64px.

**Financial digits are Western in both languages**, always with the `tabular-nums` utility on stat/number surfaces.

### 0.2 Bilingual / RTL checklist (run before calling any screen done)

1. Every string via next-intl, namespaced per screen (`login.*`, `connections.*`, `onboarding.*`, `agents.*`, `library.*`, `audit.*`). No hardcoded copy, ever.
2. Logical properties only: `ms-/me-/ps-/pe-/start-/end-/text-start`. The lint guard bans `ml-/mr-/pl-/pr-/left-/right-`.
3. **Flips in RTL:** chevrons and directional arrows (`rtl:rotate-180` or logical icon), stepper progression direction, progress-bar fill origin, breadcrumb order, table column order (automatic with `dir`), slide-in direction of step panels, end-aligned action clusters.
4. **Never flips:** logos and monogram tiles, Western digits, `@agent-ids` and URLs (wrap in `<bdi>` / `dir="ltr"` so bidi doesn't mangle them — the MCP URL input is *always* `dir="ltr"`), toggle semantics (Radix handles thumb position with `dir`).
5. Arabic register must match `context/pitch-deck-notes.md` vocabulary — e.g. الذكاء التوكيلي, لجنة الاستثمار, فحص الامتثال, نقطة المراجعة البشرية. Use the AR strings given in each brief verbatim.
6. Check both locales at 1366×768 and 1920×1080. No horizontal overflow in either direction.

### 0.3 Motion law (AGENTS.md — this is LAW)

| Event | Spec |
|---|---|
| Page enter | container fade + 4px rise, `--duration` 250ms `--ease` |
| List/grid reveal | stagger 30–40ms per item, cap 8 items, then the rest appear together |
| Card hover | lift: `--shadow-hover` + translateY(-1px), `--duration-fast` 150ms |
| Dialog/popover open | scale 0.98→1 + fade, 150ms |
| Toggle, badge, check morphs | ≤300ms |
| Count-up (stat numbers only) | 400ms, `tabular-nums` |
| Forbidden | bounce, spin, parallax, anything >400ms; respect `prefers-reduced-motion` (free via `motion`) |

### 0.4 Shared micro-patterns (use identically on all three surfaces)

- **Page header:** H1 30/800 `--color-navy` + subtitle 15/400 `--color-text-secondary` 8px below; primary action button (if any) end-aligned on the same row, vertically centered.
- **Section label:** 13/700, uppercase (EN only — Arabic has no caps; keep 13/700), letter-spacing 0.04em, `--color-text-secondary`, with optional count Badge (navy-100 bg, navy-700 text, pill).
- **Focus-visible:** whatever the T0.2 Input/Button primitives ship (accent ring). Do not restyle focus per-screen.
- **Skeletons:** Skeleton primitive (shimmer) matching the real element's exact box: rows = 40px square + two text lines (60% / 40% width); cards = icon square + 2 lines. Same count as the expected content, cap 8.
- **Row hover:** list rows never lift — background wash `--color-navy-50`, 150ms. Only *cards* lift.
- **Error text:** 13/500 `--color-danger` + 16px `circle-alert` lucide icon at inline-start, appears with 150ms fade, space pre-reserved (no layout jump).

---

## 1. Login — `/login` (T3.1)

### 1.1 Demo beat it serves (spec §3)

Minute ~3:00 — the **first live pixels the judges see** after the slide intro. It is on camera for maybe eight seconds, and those seconds set the design bar for everything after. The animated logo is the brand reveal. Spend your polish on: the gradient backdrop, the logo-bar entrance, and the card's enter motion. Nobody will see the error state on stage — but a judge poking around afterwards might, so it must still be clean.

### 1.2 Layout

- Full-viewport route, **no app shell** (no sidebar). Single centered column, both axes.
- **Backdrop:** full-bleed gradient — radial gradient centered ~35% from top: `--color-navy-800` core → `--color-navy` mid → `--color-navy-950` edges. Symmetric (no RTL flip needed). Over it, one decorative element: the Faheem bars+arrow glyph (from `components/ui/logo.tsx`, icon-only variant) rendered ~480px, `--color-card` at 4% opacity, positioned bottom inline-start, overflowing the edge by ~120px. Purely decorative, `aria-hidden`.
- **Card:** width 400px (fixed; `max-w-full` guard), `--color-card` bg, `--radius-card`, `--shadow-modal`, padding 32px. Vertically centered with a −4vh optical offset (card center sits slightly above true center).
- **Card stack, top → bottom (gaps in px):** logo lockup (height 36px, centered) → 24 → title H2 22/800 `--color-navy`, centered → 4 → subtitle 14/400 `--color-text-secondary`, centered → 28 → username field → 16 → password field → 8 → (reserved 20px error line) → 16 → submit button → 20 → hairline `--color-border` → 12 → footer caption 12/500 `--color-text-secondary`, centered.
- **Language toggle:** top inline-end of the viewport, 24px inset — a Badge/Pill-styled button (`EN | عربي`), white 70% opacity text on transparent, hover white 100%. Switches locale cookie + `dir` immediately (the login screen itself must be RTL-perfect).
- Inputs 44px tall; button 44px tall, full-width.

### 1.3 Tokens per element

| Element | Spec |
|---|---|
| Logo lockup | EN locale: horizontal EN lockup; AR locale: horizontal AR/EN lockup (فهيم under wordmark). Navy wordmark + emerald bars — the component inherits theme colors. |
| Title / subtitle | H2 22/800 `--color-navy` / 14/400 `--color-text-secondary` |
| Inputs | Input primitive with leading icon (`user` / `lock-keyhole`, 16px, `--color-text-secondary`), `--radius-btn`, 1px `--color-border`, bg `--color-card`, text 15/500. Placeholder `--color-text-secondary` at 60%. |
| Submit | Button primary (bg `--color-navy`, text white 16/800, `--radius-btn`), loading variant |
| Error | shared error pattern (§0.4) + input border switches to `--color-danger` |
| Footer caption | 12/500 `--color-text-secondary` |

### 1.4 Primitives

`Logo` (animated), `Input` (leading-icon variant) ×2, `Button` (primary, loading), `Badge/Pill` (language toggle). Nothing else.

### 1.5 Motion

1. Page enter: backdrop fades in 250ms; card fades + rises 4px, 250ms, 60ms after backdrop.
2. **Logo bars staggered rise** (T0.2 logo `animated` prop): each of the three bars rises into place ~80ms apart, arrow draws last; total ≤400ms; starts 100ms after card lands. This is the built-in behavior — just pass the prop.
3. Button press: primitive default. Loading: spinner replaces label region, label → "Signing in…".
4. Error appearance: 150ms fade of error line + border color transition 150ms. **No shake** (shake = bounce = forbidden).
5. On success: card fades out 150ms before redirect to `/` (cheap, feels intentional).

### 1.6 States

- **Hover:** inputs — border darkens to `--color-navy-300`; button — primitive hover (slightly lighter navy).
- **Focus-visible:** primitive default (accent ring). Tab order: username → password → submit → language toggle.
- **Error (empty submit):** both empty → one error line: copy below; the offending input(s) get danger border. Clears on first keystroke.
- **Loading:** button loading state, inputs disabled. No skeletons on this page.
- Any non-empty credentials succeed (mock auth — POST `/api/auth`, sets `faheem_session`, redirect `/`).

### 1.7 RTL notes

Card is symmetric — the layout barely changes. Leading input icons sit at inline-start (`ps-`), text-align start. Logo switches to the AR/EN lockup (does not mirror — it's a different asset variant). Error icon inline-start. Gradient and watermark glyph do not flip (logo never mirrors; keep the watermark at inline-start via logical positioning).

### 1.8 Copy (EN / AR)

| Key | EN | AR |
|---|---|---|
| `login.title` | Sign in to Faheem | تسجيل الدخول إلى فهيم |
| `login.subtitle` | Your Lunar Investments workspace | مساحة عمل لونار للاستثمار |
| `login.username` | Username | اسم المستخدم |
| `login.password` | Password | كلمة المرور |
| `login.usernamePlaceholder` | ali | ali |
| `login.cta` | Sign in | تسجيل الدخول |
| `login.loading` | Signing in… | جارٍ تسجيل الدخول… |
| `login.error` | Enter your username and password | يرجى إدخال اسم المستخدم وكلمة المرور |
| `login.footer` | SSO & enterprise controls on the MVP roadmap | تسجيل الدخول الموحّد والضوابط المؤسسية ضمن خارطة طريق المنتج |

(Footer wording is deliberate — matches the AGENTS.md privacy posture; never claim SOC2/ISO/encryption.)

### 1.9 Wow details (2–3, budgeted)

1. **Logo-bar entrance** — the staggered rise + arrow draw on the navy field is the single most memorable frame of the beat.
2. **Watermark glyph** at 4% opacity bottom-start — gives the gradient depth without noise.
3. **Enterprise framing** — "Your Lunar Investments workspace" + the SSO roadmap caption reads like a real deployed tenant, not a demo login.

---

## 2. Connections page + Onboarding "Connect & Configure" stepper (T3.5)

### 2.1 Demo beat it serves (spec §3, 3:00–4:30)

The **Connect & Configure beat is presented live for ~90 seconds**: the presenter walks the 3-step stepper, performs one fake OAuth connect, opens the **Add custom MCP modal** ("any internal system speaks to Faheem"), flips through the agent toggles, and fills the mandate form → "this becomes your IC Charter." The stepper transitions, the OAuth modal choreography, and the MCP modal polish are **all on camera**. The standalone Connections page is also the answer surface when judges ask about integrations (Tadawul, SAHMK, open banking) — the catalog contents ARE the feasibility pitch.

### 2.2 Connections page — layout (`/connections`, CATALOG §2D pattern)

- Renders inside the app shell (sidebar present). Content column: **max-width 960px**, centered in the content region, padding-block 40px/64px, padding-inline 32px.
- **Header row** (§0.4 pattern): H1 "Connections" + subtitle; end-aligned primary Button sm (14/700) `+ Add custom MCP` (leading `plus` icon 16px).
- 24px below: **search Input** (leading `search` icon), max-width 360px.
- 32px below: section label **Connected** + count Badge "5" → 12px → **rows container**: one Card (bg `--color-card`, 1px `--color-border`, `--radius-card`, **no shadow** — hairlines over shadows for lists), rows separated by 1px `--color-border`.
- 48px below: section label **Available** + count Badge "10" → same rows container.
- **Row anatomy** (min-height 64px, padding-inline 16px, 12px gap grid): `[40px LogoTile] [name block, flexible] [status/actions cluster, end]`
  - LogoTile: 40px, radius 8px, monogram or `simple-icons` glyph (see table below).
  - Name line: 15/600 `--color-navy` + optional Badge pill after name (BETA / MVP — see tokens).
  - Description: 13/400 `--color-text-secondary`, one line, truncate.
  - Connected cluster: 8px dot `--color-accent` + caption 12/500 `--color-accent-700` "Connected" → Button outline sm "Configure" → DropdownMenu trigger (ghost icon button, `ellipsis` icon).
  - Available cluster: Button secondary sm "Connect" only.

**Connector inventory (exact, in this order):**

| Section | Connector | Tile | Sublabel (EN) |
|---|---|---|---|
| Connected | Saudi Exchange Disclosures | monogram **ت** navy-100/navy-700 | Official Tadawul filings & announcements |
| Connected | Argaam | monogram **أ** accent-50/accent-700 | Saudi financial news & market data |
| Connected | marketaux | `simple-icons` glyph or monogram **M** navy-100/navy-700 | Global market news API |
| Connected | Lunar Data Room | monogram **L** navy-100/navy-700 | Deal documents & internal files |
| Connected | Templates | lucide `layout-template` tile navy-100 | Lunar-branded memo, model & deck templates |
| Available | SAHMK API `MVP` | monogram **س** navy-100/navy-700 | 350+ Tadawul companies, fundamentals & prices |
| Available | Bloomberg | simple-icons | Terminal data & analytics |
| Available | PitchBook | simple-icons | Private-market data |
| Available | Intralinks | simple-icons | Virtual data rooms |
| Available | Datasite | simple-icons | Virtual data rooms |
| Available | od.data.gov.sa | monogram **ب** navy-100/navy-700 | Saudi open government data |
| Available | REGA | monogram **ع** navy-100/navy-700 | Real-estate market indicators |
| Available | GASTAT | monogram **إ** navy-100/navy-700 | Official statistics authority |
| Available | Alinma Open Banking `MVP` | monogram **ا** accent-50/accent-700 | Books & ERP via SAMA open-banking framework |
| Available | Capital IQ | simple-icons | Company financials & screening |

Tile letters/paths are **data** — they live in the connectors module with the connector entries (AGENTS.md asset policy), not inline in JSX.

**Pills:** `BETA` = `--color-accent-50` bg, `--color-accent-700` text, 11/700, `--radius-pill`. `MVP` = `--color-navy-50` bg, `--color-navy-700` text, same size. (marketaux gets BETA; SAHMK + Alinma get MVP.)

### 2.3 Modals

**Fake OAuth modal** (Dialog, width 420px, `--radius-card`, `--shadow-modal`, padding 24px) — three internal states:
1. *Authorize:* LogoTile 48px centered → 16 → H3 18/800 "Connect {name}" → 8 → 14/400 text-secondary scope line: "Faheem will get read-only access to official disclosures and filings." → 20 → info row (12/500 text-secondary, `shield-check` icon 16px accent): "Read-only · revocable anytime · logged in the audit trail" → 24 → footer: Button ghost "Cancel" + Button primary "Authorize".
2. *Connecting:* content swaps (150ms cross-fade) to centered spinner + 14/500 "Establishing secure connection…" — hold ~900ms (fake).
3. *Success:* `circle-check` 40px `--color-accent` with a 300ms check-draw morph → "Connected" H3 → auto-dismiss after 900ms. On close, the row moves to the Connected section with a `--color-accent-50` background wash that fades over 400ms.

**Add custom MCP modal** (Dialog, width 480px, same surface tokens):
- Title H3 "Add custom MCP connector" + caption 13/400 text-secondary: "Model Context Protocol — any internal system can speak to Faheem."
- Field 1: label 13/600 "Name" + Input, placeholder "Lunar Portfolio DB".
- Field 2: label "Remote server URL" + Input **`dir="ltr"` always, monospace 14**, placeholder `https://mcp.internal.lunar.sa`. Live-validate URL shape on blur/submit: valid → 16px `circle-check` accent inside the input end slot; invalid → shared error pattern "Enter a valid HTTPS URL".
- Collapsible "Advanced settings" accordion (collapsed by default; chevron flips in RTL): auth header Input + timeout Input — visual only.
- Footer: Button ghost "Cancel" + Button primary "Add connector".

### 2.4 Onboarding stepper — layout (`/onboarding`)

- Renders in the app shell. Content column **max-width 880px**, centered, padding-block 40px/64px.
- **Header block:** H2 22/800 "Connect & Configure" + subtitle 15/400 text-secondary → 24px → **Stepper primitive** (Figma kit 08 pattern): 3 nodes — done = filled `--color-accent` circle with white check; active = `--color-accent` circle with white step number; upcoming = `--color-card` circle, 2px `--color-border`, navy-700 number; connector lines 2px (`--color-accent` when passed, `--color-border` otherwise); labels 13/600 under nodes (navy when active/done, text-secondary otherwise). Caption end-aligned on the same row: "Step 1 of 3" (Western digits both locales).
- 32px below: **step panel** — one Card, `--radius-card`, 1px border, `--shadow-card`, padding 32px, min-height 480px.
- **Panel footer** (inside the card, border-top 1px `--color-border`, padding-top 16px, margin-top 32px): Button ghost "Back" at inline-start (hidden on step 1) + Button primary "Continue" at inline-end (step 3: "Create IC Charter").

**Step 1 — Connect.** 2-column grid of connector cards (gap 16px), wizard dress of the same data: each card = `--radius-card`, 1px border, padding 16px, `[40px tile] [name 15/600 + one-liner 13/400] [end: Button secondary sm "Connect" or 20px circle-check accent]`. Pre-connected: Saudi Exchange, Argaam, Lunar Data Room, Templates. To connect live on stage: SAHMK (opens the OAuth modal). Alinma Open Banking card shows the MVP pill + sublabel "Books & ERP — SAMA open banking (MVP)". Last grid cell = **"Add custom MCP" card**: 1.5px **dashed** `--color-navy-300` border, transparent bg, centered `plus` icon 20px + label 14/600 navy; hover → border and text turn `--color-accent` (150ms). Opens the MCP modal.

**Step 2 — Agents & skills.** Three mini-sections with section labels (Stage 1 — Screening / Stage 2 — Deep Analysis / Stage 3 — Investment Committee). Under each, 2-column grid of agent toggle cards: `[36px icon tile accent-50/accent-700] [name 14/600 navy + AR name or methods one-liner 12/500 text-secondary] [end: Toggle, default ON]` + a mono 12px `@id` chip (navy-50 bg, navy-700 text, `--radius-pill`, `<bdi>`-wrapped). 9 cards total (Screening, the 7 teams, Faheem IC). Toggling OFF dims the card content to 55% opacity (150ms) — cosmetic only.

**Step 3 — Mandate & risk questionnaire** (single column, max-width 560px, field gap 20px; labels 13/600 navy, all numerals `tabular-nums`):
1. Target IRR hurdle — number Input, default **15**, `%` suffix in the input end slot.
2. Max single-name concentration — number Input, default **10**, `%` suffix.
3. Holding period — 3 segmented pills (Badge-style radio): `1–3y` / `3–5y` (default) / `5y+`; selected = `--color-navy` bg, white text.
4. Liquidity requirement — DropdownMenu select: Quarterly / Semi-annual (default) / Annual.
5. Compliance screen required — Toggle, default **ON**, caption 12/500 below: "Per AAOIFI methodology".
6. Sector appetite — multi-select chips (`--radius-pill`): Technology ✓, Consumer ✓ (pre-selected, navy bg white text), Healthcare, Financials, Real Estate, Industrials (unselected: card bg, 1px border, navy-700 text).
7. Max drawdown tolerance — segmented pills: 15% / 20% (default) / 25%.

**Completion state** (replaces the panel after "Create IC Charter"): centered — `circle-check` 48px accent with 300ms draw → H2 "Your IC Charter is ready" → 8 → caption 14/400 text-secondary "Faheem will cite it back to you in every screening decision." → 20 → **summary strip**: one row, three stat cells separated by hairlines — `15% IRR hurdle · 10% concentration cap · Compliance required` — the two numbers **count up over 400ms**, `tabular-nums`, 20/800 navy, labels 12/500 below → 24 → Button primary "Open IC Charter (PDF)" (opens the real charter PDF via the documents route) + Button ghost "Go to Home".

### 2.5 Motion (both surfaces)

- Page enter: 250ms fade+rise. Connector rows/cards: stagger 30ms, cap 8.
- **Step transitions:** outgoing panel fades out 150ms; incoming fades in + slides 12px from the inline-end direction (i.e., from the "next" side — flips automatically in RTL), 250ms `--ease`. Stepper node state morph (number → check) 300ms; connector line fills 250ms directionally.
- Dialogs: scale 0.98→1 + fade 150ms (primitive default). OAuth internal state swaps: 150ms cross-fade.
- Row hover: navy-50 wash 150ms. Wizard cards + dashed MCP card: hover lift (shadow-hover + −1px) 150ms.
- Toggle: primitive thumb slide 150ms + card dim 150ms.

### 2.6 States

- **Hover:** rows wash; buttons per primitive; connector rows also trigger a **Tooltip** (see wow details).
- **Focus-visible:** primitive defaults; stepper nodes not focusable (navigation only via Back/Continue).
- **Empty:** search with no matches → centered 15/600 navy "No connectors match '{q}'" + caption "Try a different name, or add it as a custom MCP." + Button outline sm "+ Add custom MCP". (Sections never render empty otherwise — data is static.)
- **Loading:** if connector data loads async, skeleton rows per §0.4 (5 rows Connected, 8 Available). Stepper panels render synchronously — no skeletons.
- **Error:** MCP modal URL validation (shared pattern). Mandate inputs: non-numeric/blank → danger border + "Enter a percentage" on blur. Nothing else can fail (all mock).

### 2.7 RTL notes

- Stepper runs inline-start → inline-end, so it **visually flips** in RTL (step 1 at the right); connector-line fill and panel slide-in direction flip with it. Western digits inside step circles do not change.
- Accordion/menu chevrons flip. `Configure`/`Connect` clusters sit at inline-end (automatic with logical layout).
- **Never flips:** monogram letters (each tile keeps its designed letter), simple-icons glyphs, the MCP URL input (`dir="ltr"` hard-coded), `@id` chips, `%` suffixes stay in the input end slot (logical).
- Arabic connector sublabels are real translations (below), not transliterations.

### 2.8 Copy (EN / AR)

| Key | EN | AR |
|---|---|---|
| `connections.title` | Connections | الاتصالات |
| `connections.subtitle` | Faheem's data sources — market data, disclosures, and your internal systems. | مصادر بيانات فهيم — بيانات السوق والإفصاحات وأنظمتكم الداخلية. |
| `connections.addMcp` | Add custom MCP | إضافة موصل MCP مخصص |
| `connections.connected` | Connected | متصلة |
| `connections.available` | Available | متاحة |
| `connections.configure` | Configure | تهيئة |
| `connections.connect` | Connect | ربط |
| `connections.searchPlaceholder` | Search connectors… | ابحث في الموصلات… |
| `connections.mcp.title` | Add custom MCP connector | إضافة موصل MCP مخصص |
| `connections.mcp.caption` | Model Context Protocol — any internal system can speak to Faheem. | بروتوكول سياق النماذج — أي نظام داخلي يمكنه التواصل مع فهيم. |
| `connections.mcp.name` | Name | الاسم |
| `connections.mcp.url` | Remote server URL | رابط الخادم البعيد |
| `connections.mcp.advanced` | Advanced settings | إعدادات متقدمة |
| `connections.mcp.submit` | Add connector | إضافة الموصل |
| `connections.mcp.urlError` | Enter a valid HTTPS URL | يرجى إدخال رابط HTTPS صحيح |
| `connections.oauth.title` | Connect {name} | ربط {name} |
| `connections.oauth.scope` | Faheem will get read-only access to official disclosures and filings. | سيحصل فهيم على صلاحية قراءة فقط للإفصاحات والملفات الرسمية. |
| `connections.oauth.note` | Read-only · revocable anytime · logged in the audit trail | قراءة فقط · قابل للإلغاء في أي وقت · مسجَّل في سجل التدقيق |
| `connections.oauth.authorize` | Authorize | تفويض |
| `connections.oauth.connecting` | Establishing secure connection… | جارٍ إنشاء اتصال آمن… |
| `connections.oauth.success` | Connected | تم الاتصال |
| `onboarding.title` | Connect & Configure | الربط والتهيئة |
| `onboarding.subtitle` | Three steps to make Faheem yours. | ثلاث خطوات ليصبح فهيم جاهزاً لعملكم. |
| `onboarding.step1` | Connect | الربط |
| `onboarding.step2` | Agents & skills | الوكلاء والمهارات |
| `onboarding.step3` | Mandate & risk | التفويض والمخاطر |
| `onboarding.stepCount` | Step {n} of 3 | الخطوة {n} من 3 |
| `onboarding.back` / `onboarding.continue` | Back / Continue | رجوع / متابعة |
| `onboarding.finish` | Create IC Charter | إنشاء ميثاق لجنة الاستثمار |
| `onboarding.mandate.irr` | Target IRR hurdle | معدل العائد الداخلي المستهدف (IRR) |
| `onboarding.mandate.concentration` | Max single-name concentration | الحد الأقصى للتركّز في اسم واحد |
| `onboarding.mandate.holding` | Holding period | فترة الاحتفاظ |
| `onboarding.mandate.liquidity` | Liquidity requirement | متطلبات السيولة |
| `onboarding.mandate.compliance` | Compliance screen required | فحص الامتثال إلزامي |
| `onboarding.mandate.complianceNote` | Per AAOIFI methodology | وفق منهجية أيوفي (AAOIFI) |
| `onboarding.mandate.sectors` | Sector appetite | القطاعات المستهدفة |
| `onboarding.mandate.drawdown` | Max drawdown tolerance | الحد الأقصى المقبول للتراجع |
| `onboarding.done.title` | Your IC Charter is ready | ميثاق لجنة الاستثمار جاهز |
| `onboarding.done.caption` | Faheem will cite it back to you in every screening decision. | سيستشهد به فهيم في كل قرار فرز. |
| `onboarding.done.open` | Open IC Charter (PDF) | فتح الميثاق (PDF) |
| `onboarding.done.home` | Go to Home | الانتقال إلى الرئيسية |

Sector chips: Technology التقنية · Consumer القطاع الاستهلاكي · Healthcare الرعاية الصحية · Financials القطاع المالي · Real Estate العقارات · Industrials الصناعات.

### 2.9 Wow details (from CATALOG §4 #4, #11)

1. **Connector hover tooltips** (§4.4): hovering any row/card shows a Tooltip — max-width 260px, `--color-navy` bg, white 12/500 text, 8px 12px padding, `--radius-btn` — explaining what the source provides, e.g. Saudi Exchange: "Official Tadawul filings, disclosures and announcements — Faheem's primary public-market source." One sentence each, both locales, stored with connector data.
2. **BETA / MVP pills + custom-MCP modal polish** (§4.11): the pill split quietly tells the roadmap story; the MCP modal's mono URL field, live validation check, and advanced accordion make "any internal system" feel like an engineering fact, not a slide claim.
3. **OAuth success choreography:** check-draw morph → row migrates to Connected with a mint wash that fades over 400ms. Judges see state change, not a static toggle.

---

## 3. Agents page + Library + Audit Trail (T3.6)

### 3.1 Demo beat it serves (spec §3 + §10)

- **Agents page** = the on-product version of pitch-deck slide 9 — it IS the "technical implementation" evidence for fintech judges. Seen during the Connect beat (step 2 mirrors it), revisited in the close ("one architecture slide — judges already saw it live") and in Q&A. The stage grouping + human-gate markers are the *accelerate-not-replace* argument drawn as UI.
- **Library** is on camera at 11:30–13:00 when the three Lunar-branded artifacts land.
- **Audit Trail** is the governance close (§10): the presenter points at rows that **grew during the demo** — "the audit trail they watched grow." The live-grow animation is the money detail; the copy line is the institutional trust claim.

### 3.2 Agents page — layout (`/agents`)

- Content column **max-width 1040px**, centered, padding-block 40px/64px, padding-inline 32px.
- **Header:** H1 "Agents" + subtitle (copy below).
- **Stage section pattern** (3×): section header row — Badge pill `Stage N` (`--color-navy` bg, white 12/700) + H3 18/800 navy stage name + caption 13/400 text-secondary after it — then 16px → cards.
- **Stage 1 — Screening:** one full-width card (padding 24px): `[40px icon tile: lucide 'filter', --color-accent-50 bg, --color-accent-700 icon] [name 16/700 navy "Screening Agent" + AR/secondary name 13/500 text-secondary below] [end cluster: Toggle (ON) + mono @chip '@screening']`. Below name block: methods line 13/500 text-secondary, middot-separated: "Intake questionnaire · Mandate-fit scorecard · Policy checks vs IC Charter". Footer caption 12/500 text-secondary with 14px `file-text` icon: "Cites: Lunar IC Charter".
- **Human-gate marker #1** (between stages, 32px vertical margin): full-width construct — 1px **dashed** `--color-navy-300` line on each side of a centered pill: `--color-navy-50` bg, `--radius-pill`, padding 6px 14px, 16px lucide `user-check` icon + 12/600 `--color-navy-700` text "Human gate — the analyst decides".
- **Stage 2 — Deep Analysis:** caption in header: "7 specialist teams · 20+ agents".
  - **Orchestrator banner:** full-width card, **`--color-navy` bg**, white text, `--radius-card`, padding 20px 24px: `[40px tile: white 10% bg, white 'network' icon] ["Orchestrator / Planner" 16/700 white + "Routes and sequences tasks across the specialist teams" 13/400 white 70%] [end: Badge accent-50/accent-700 "Always on"]`. No toggle — the orchestrator is not optional; that's the point.
  - 16px below: **7 specialist cards**, 3-column grid (gap 16px; last row 1 card — leave trailing cells empty, do not stretch). Card anatomy (padding 20px): icon tile 36px (accent-50/accent-700) top-start, Toggle top-end; 12px below: EN name 15/700 navy; AR name 12/500 text-secondary directly under (in AR locale: AR name leads, EN under); 8px: methods 13/500 text-secondary, max 3 lines, exact strings below; footer row: mono @chip.
  - **Verification & Compliance card is special** (the deck's red-bordered fact-checker): 1.5px border `--color-danger` at 40% opacity + Badge (danger-tint: `--color-danger` at 10% bg, `--color-danger` text, 11/700) "Fact-checker" beside the name. Icon tile stays accent (the red is a border accent, not an alarm).
- **Human-gate marker #2:** same construct, text "Human gate — the analyst reviews every deliverable".
- **Stage 3 — Investment Committee:** one full-width card like Stage 1: icon `scale`, name "Faheem IC", methods "Committee Q&A · Deal ranking vs the 15% hurdle · Scenario sensitivity". Footer: 14px `shield-check` icon + 12/500 `--color-navy-700` — **"Advisory only — the investment decision rests with the committee."** This line is permanent, not a tooltip.
- **Human-gate marker #3** (below stage 3, closing the page): "Human gate — the committee decides".

**Agent card contents (exact — names AR per spec §4 item 8; icons live in the agent registry data, not JSX):**

| Agent | AR name | lucide icon | Methods line (EN) | @chip |
|---|---|---|---|---|
| Research & Sourcing | البحث والمصادر | `telescope` | Screening universe · Filings ingestion · News & expert-network sweep | `@research` |
| Document Intelligence | ذكاء المستندات | `file-search` | Prospectus/CIM extraction · Footnote & related-party analysis · Covenant summaries | `@doc-intel` |
| Valuation & Modeling | النمذجة والتقييم | `calculator` | DCF (FCFF/FCFE, WACC, Gordon TV) · Trading comps · Precedents · LBO-lite · Sensitivity & scenarios | `@valuation` |
| Comparables & Precedents | المقارنات | `git-compare` | Comp-set construction · Multiple regression vs growth/margin | `@comparables` |
| Risk & Portfolio Monitoring | المخاطر ومراقبة المحفظة | `shield-alert` | Quantified risk scorecard (probability × impact) · Scenario-weighted return · Mandate-breach & concentration checks | `@risk` |
| Deliverable Writing | كتابة التقارير | `pen-line` | IC memos · Research notes · Pitch decks · Periodic reports | `@writing` |
| Verification & Compliance | التحقق والامتثال | `shield-check` | compliance screening (AAOIFI) · Fact-check vs source · Sanctions & conflicts · Confidence flags | `@compliance` |
| Screening Agent | وكيل الفرز | `filter` | (stage 1 card, above) | `@screening` |
| Faheem IC | فهيم — مستشار لجنة الاستثمار | `scale` | (stage 3 card, above) | `@ic` |

### 3.3 Library — layout (`/library`)

- Content column max-width 1040px, same page frame.
- Header: H1 "Library" + subtitle; end-aligned search Input (max-width 280px).
- 24px below: **filter pill row** (CATALOG §2F pattern): All / IC Memos / Models / Decks — Badge-pill buttons; active = `--color-accent-50` bg + `--color-accent-700` 13/600 text; inactive = card bg, 1px border, text-secondary.
- 24px below: **artifact card grid**, 3 columns, gap 16px. Card (padding 20px, `--radius-card`, 1px border, `--shadow-card`):
  - Top row: file-type icon tile 40px — xlsx: lucide `sheet` on accent-50/accent-700 · docx: `file-text` on navy-50/navy-700 · pptx: `presentation` on warning 10% bg / `--color-warning` icon — and a ghost icon Button (`download`, 16px) at top-end, **visible on hover/focus only** (always visible on touch — but desktop is the target).
  - 12px: name 14/600 navy, one line, truncate (e.g. "Jahez — IC Investment Memo").
  - 4px: meta caption 12/500 text-secondary: `{workspace monogram tile 16px} {Workspace} · {date}` — date Western digits both locales.
  - 8px: **verified caption**: 12/500 `--color-accent-700`, 14px `badge-check` icon: "Verified · {n} sources" (n from artifact metadata).
- **Empty state** (filter or fresh workspace): centered block 64px padding: Faheem glyph outline 48px at `--color-navy-300` → 16 → 15/600 navy "No artifacts yet" → 6 → 13/400 text-secondary "Generated memos, models, and board decks will land here." → 16 → Button primary sm "Ask Faheem to prepare an IC memo" → routes to Home with the composer prefilled.

### 3.4 Audit Trail — layout

**Route decision:** `/audit`, owned by T3.6, presented as a Settings-family page beside Connections (plan: "under Settings next to Connections"). Request via your result summary that fable add the sidebar nav item ("Audit Trail", under the same group as Connections) — `lib/nav.ts` is not yours to edit. Also: the Connections page header may later gain a quiet "View audit trail" link — that's T3.5/fable's call, not yours.

- Content column max-width 960px, same page frame.
- Header: H1 "Audit trail" + **the governance line as subtitle** (copy below — this sentence is a spec-mandated claim; render it verbatim).
- 24px below: filter row — context filter pills (All / Jahez / Darb / Thara Pay / Firm) styled like Library's pills + end-aligned caption 12/500 text-secondary "Last 7 days".
- 16px below: **table** in a Card container (1px border, `--radius-card`, no shadow):
  - Header row: 12/600 text-secondary, uppercase EN, bg `--color-bg`, height 40px, columns: Time (140px) · User (160px) · Context (160px) · Action (flexible) · Citations (100px, end-aligned).
  - Rows: height 48px, 1px border-b, padding-inline 16px; hover wash navy-50.
  - **Time:** 13/500 `tabular-nums` text-secondary — "Jul 12, 09:41" format, Western digits both locales.
  - **User:** Avatar 24px (initials tile "A", navy bg) + 13/500 navy "Ali".
  - **Context:** chip — 16px monogram tile + 12/500 navy-700 workspace name, navy-50 bg, `--radius-pill` (firm-level rows: "Lunar" chip).
  - **Action:** 16px lucide icon (question: `message-square-text` · artifact: `file-output` · screening: `check-check`) + 13/500 navy, truncated detail in text-secondary after an en-dash (e.g. "Question asked — FY2025 unit economics").
  - **Citations:** Badge — `--color-accent-50` bg, `--color-accent-700` 12/600 `tabular-nums`, e.g. "12" (zero renders as "—" 13/500 text-secondary, no badge).
- Seed data: ~25 rows across the prior 7 days (from `data/audit-log.json`); newest first.
- **Live-grow:** poll `audit-log.json` every 5s while the page is visible (or refetch on window focus). A new row enters at the top: height 0→48px + fade over 250ms, with a `--color-accent-50` background flash that fades over 400ms. No sound, no toast — the quiet growth IS the message.

### 3.5 Motion

- All three pages: 250ms page enter; card/row stagger 30–40ms cap 8 (per stage-section on Agents — each section staggers independently as it enters viewport; simple mount-stagger is fine, no scroll-triggering required).
- Agents toggle OFF: thumb 150ms + card content (everything except the Toggle) dims to 55% opacity and icon tile desaturates, 150ms. Toggle ON restores. This is the CATALOG §2F Skills-toggle micro-interaction.
- Library card hover: lift (shadow-hover + −1px, 150ms) + download button fades in 150ms.
- Audit row entrance per §3.4. Filter pill switch: content cross-fade 150ms (no reflow animation of the table).
- Nothing on these pages counts up, spins, or exceeds 400ms.

### 3.6 States

- **Hover:** agent cards lift; orchestrator banner does NOT lift (it's a fixture, not an item); gate markers inert; audit rows wash; library per above.
- **Focus-visible:** Toggles, filter pills, download buttons — primitive defaults; tab order follows DOM/reading order.
- **Empty:** Agents — none (registry is static). Library — §3.3 block; filtered-empty variant: "No {type} yet" + same caption, no CTA button. Audit — seeded, but handle gracefully: "No activity yet — Faheem logs every answer, source, and artifact here." centered 14/500 text-secondary.
- **Loading:** Agents — static import, no skeleton. Library — 6 skeleton cards. Audit — 6 skeleton rows (40px time bar + avatar circle + 2 bars); poll refreshes must NOT re-skeleton (only the initial load).
- **Error:** if `audit-log.json` fetch fails, keep last-good rows and show a caption above the table: 12/500 text-secondary "Live updates paused — retrying…". Never an empty red screen.

### 3.7 RTL notes

- Table column order flips automatically with `dir` (Time starts at inline-start in both). Timestamps, citation counts, `@chips` stay Western/LTR (`<bdi>` on chips). Icons in Action rows sit at inline-start.
- Agent cards: in AR locale the AR name leads (15/700) and the EN name becomes the 12/500 secondary line — swap roles, same boxes.
- Gate-marker pill icon sits at inline-start of its text; dashed lines are symmetric.
- Filter pills, toggles, stepper-like ordering all follow `dir`. Monogram tiles and file-type icons never mirror. The middot "·" separators are direction-neutral — keep them.
- "7 specialist teams · 20+ agents": digits stay Western in Arabic ("7 فرق متخصصة · +20 وكيلاً").

### 3.8 Copy (EN / AR)

| Key | EN | AR |
|---|---|---|
| `agents.title` | Agents | الوكلاء |
| `agents.subtitle` | 7 specialist teams · 20+ agents — orchestrated, auditable, human-gated. | 7 فرق متخصصة · أكثر من 20 وكيلاً — عمل منسّق وقابل للتدقيق وبقرار بشري. |
| `agents.stage1` | Stage 1 — Screening | المرحلة 1 — الفرز |
| `agents.stage2` | Stage 2 — Deep Analysis | المرحلة 2 — التحليل المعمّق |
| `agents.stage2Caption` | 7 specialist teams · 20+ agents | 7 فرق متخصصة · أكثر من 20 وكيلاً |
| `agents.stage3` | Stage 3 — Investment Committee | المرحلة 3 — لجنة الاستثمار |
| `agents.gate1` | Human gate — the analyst decides | بوابة بشرية — القرار للمحلل |
| `agents.gate2` | Human gate — the analyst reviews every deliverable | بوابة بشرية — المحلل يراجع كل مستند |
| `agents.gate3` | Human gate — the committee decides | بوابة بشرية — القرار للجنة |
| `agents.orchestrator` | Orchestrator / Planner | المنسّق والمخطّط |
| `agents.orchestratorDesc` | Routes and sequences tasks across the specialist teams | يوجّه المهام ويرتّب تسلسلها بين الفرق المتخصصة |
| `agents.alwaysOn` | Always on | يعمل دائماً |
| `agents.factChecker` | Fact-checker | مدقّق الحقائق |
| `agents.advisoryOnly` | Advisory only — the investment decision rests with the committee. | استشاري فقط — قرار الاستثمار بيد اللجنة. |
| `agents.citesCharter` | Cites: Lunar IC Charter | يستشهد بـ: ميثاق لجنة الاستثمار في لونار |
| `agents.mentionHint` | Mention in any chat | اذكره في أي محادثة |
| `library.title` | Library | المكتبة |
| `library.subtitle` | Every artifact Faheem prepares, in one place. | كل ما يعدّه فهيم من مستندات في مكان واحد. |
| `library.filters` | All / IC Memos / Models / Decks | الكل / مذكرات اللجنة / النماذج المالية / العروض |
| `library.verified` | Verified · {n} sources | موثّق · {n} مصدراً |
| `library.emptyTitle` | No artifacts yet | لا توجد مستندات بعد |
| `library.emptyCaption` | Generated memos, models, and board decks will land here. | ستظهر هنا المذكرات والنماذج المالية والعروض التي يولّدها فهيم. |
| `library.emptyCta` | Ask Faheem to prepare an IC memo | اطلب من فهيم إعداد مذكرة لجنة الاستثمار |
| `audit.title` | Audit trail | سجل التدقيق |
| `audit.subtitle` | Every answer, source, and artifact is logged. Nothing your client data touches trains any model. | كل إجابة ومصدر ومستند يُسجَّل. بيانات عملائكم لا تُستخدم أبداً في تدريب أي نموذج. |
| `audit.cols` | Time / User / Context / Action / Citations | الوقت / المستخدم / السياق / الإجراء / الاستشهادات |
| `audit.lastDays` | Last 7 days | آخر 7 أيام |
| `audit.actionQuestion` | Question asked | سؤال مطروح |
| `audit.actionArtifact` | Artifact generated | مستند مولّد |
| `audit.actionScreening` | Advanced past screening | اجتياز مرحلة الفرز |
| `audit.empty` | No activity yet — Faheem logs every answer, source, and artifact here. | لا يوجد نشاط بعد — يسجّل فهيم هنا كل إجابة ومصدر ومستند. |
| `audit.paused` | Live updates paused — retrying… | توقفت التحديثات المباشرة مؤقتاً — تجري إعادة المحاولة… |

Agent names/methods AR: use the exact Arabic names in §3.2's table (they are spec §4 item 8 verbatim). Method lines may be translated naturally but keep the technical anchors untranslated where standard (DCF, WACC, IRR, AAOIFI, CIM, LBO).

### 3.9 Wow details (CATALOG §4 #10 + deck slide 9 + §10 governance)

1. **Toggle micro-animation with card dim** (§4.10, the Rogo Skills gallery feel): flipping an agent off visibly "powers it down" — 150ms thumb + 55% dim + tile desaturation. Cosmetic, but it makes the multi-agent claim tactile.
2. **Fact-checker red border** — a one-token echo of the pitch deck's red-bordered Verification box (slide 9). Judges who saw the deck will subconsciously recognize the architecture diagram living in the product.
3. **Audit-row live-grow** — the demo's closing argument animates itself: rows the judges watched being created slide in with a mint flash. Pair with the human-gate markers on Agents and the advisory-only line on the Faheem IC card: governance rendered as UI, three screens deep.

---

## 4. Handoff checklist (every T3 card, before requesting gate D review)

- [ ] `npm run verify` green; acceptance tests on your task card pass.
- [ ] Both locales checked visually at 1366×768 and 1920×1080; `dir="rtl"` shows zero physical-property leaks and no overflow.
- [ ] Every string in `messages/en.json` + `messages/ar.json` under your namespace only.
- [ ] Zero hex/shadow/duration literals; zero `dark:`; zero serif usage; zero new dependencies.
- [ ] Motion audited against §0.3 — durations from tokens, nothing >400ms, reduced-motion respected.
- [ ] Skeleton/empty/error states implemented per your brief, not improvised.
- [ ] Anything this brief didn't cover → listed as an open question in your result summary, not solved with a new visual pattern.
