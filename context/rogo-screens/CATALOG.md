# Rogo Design Reference Catalog

> Generated 2026-07-12 by visual analysis of all 30 PNGs in this folder. This is the layout/component reference for building Faheem's UI (ROGO layouts + Faheem brand tokens — see `docs/superpowers/specs/2026-07-12-faheem-demo-design.md` §7).

## 1. File-by-file index

| Filename | Description |
|---|---|
| swappy-20260709_181247.png | slide: "The category leader in AI for finance" — funding/investor logos, customer stats, VC quote |
| swappy-20260709_181402.png | slide: "No single model wins finance" — Big Finance Benchmark, model comparison bars, cost callout |
| swappy-20260709_181522.png | slide: "...With Enterprise Security and Compliance..." — SOC2/ISO/GDPR badges, security advisory board headshots |
| swappy-20260709_181836.png | slide: "How we partner: Security, Deployment, & Enablement" — 3 icon cards |
| swappy-20260709_181903.png | slide: "...Deployed Through a Partnership Model" — forward-deployed team bullets + bank logo strip |
| swappy-20260709_182137.png | app: Home/omnibox empty state, "What can Felix do for you?" |
| swappy-20260709_182231.png | app: Home screen, model-tier dropdown open (Felix Auto/Max/Medium/Light) |
| swappy-20260709_182323.png | app: Home screen, "All sources" dropdown, Internal Sources submenu expanded |
| swappy-20260709_182331.png | app: Home screen, "All sources" dropdown, External Sources submenu (Third Bridge tooltip) |
| swappy-20260709_182407.png | app: same External Sources submenu, PitchBook tooltip visible |
| swappy-20260709_182447.png | app: Settings → Connections, "Add custom MCP connector" modal open |
| swappy-20260709_182459.png | app: Settings → Connections, full "Connected" integrations list |
| swappy-20260709_182511.png | app: Settings → Connections, scrolled to available/uninstalled connectors |
| swappy-20260709_182533.png | app: cropped close-up of "use Felix in your email" toast |
| swappy-20260709_182621.png | non-app: Superhuman email client showing a Felix-drafting-request email thread |
| swappy-20260709_182700.png | app: Project page "DBS" — project home, file list, Upload dropdown |
| swappy-20260709_182717.png | app: same DBS project page, different crop |
| swappy-20260709_182820.png | app: "Share Project Arc" modal |
| swappy-20260709_182839.png | app: chat page loading/skeleton state |
| swappy-20260709_182855.png | app: **chat + artifact split view** — answer with citation chips + live PPTX slide preview |
| swappy-20260709_182930.png | app: same split view, edited "Deal Sizing" bar-chart slide, detailed edit instructions in chat |
| swappy-20260709_182937.png | app: cropped close-up of expanded "Sources" accordion under an answer |
| swappy-20260709_183041.png | app: Home screen, short prompt typed, "Improve" wand icon visible |
| swappy-20260709_183048.png | app: Home screen after "Improve" — expanded structured prompt, "Undo" link |
| swappy-20260709_183133.png | Excel desktop, LBO model, cell citation tooltip deep-linking to app.rogo.ai |
| swappy-20260709_183208.png | app: Excel add-in sidebar, "What can Felix help with today?" quick actions |
| swappy-20260709_183340.png | app: Skills library page, grid of skill cards |
| swappy-20260709_183451.png | app: Skills library, same cards, scrolled/cropped duplicate view |
| swappy-20260709_183545.png | stray image — generic 3D cube diagram, unrelated to Rogo |
| swappy-20260709_184020.png | slide: duplicate of 181402 in deck-browser context |

Net: 9 slide-deck images, 18 genuine app.rogo.ai screenshots, 3 other.

## 2. App screen inventory

### A. Home / Omnibox (empty state)
Files: 182137, 182231, 182323, 182331, 182407, 183041, 183048

**Layout**: Fixed-width left sidebar (~250px) + centered main content column (~800–830px wide, vertically centered in viewport).

**Sidebar** (top to bottom):
- Logo (lowercase serif-ish wordmark) + small collapse-icon top right
- "New Chat" — full-width white pill button with pencil icon, subtle border
- Primary nav (icon + label, flat list, no boxes): Home (active = light gray pill background), Search, Incognito File Chat, Tables, Skills, Library, Scheduled Tasks, Shortcuts
- "Pinned" section label (small gray caps) → folder rows: DBS, RockCo, Project Itau, Project Arc, Project BB
- "Projects" section label + "＋" add icon → more projects
- Bottom-pinned: "What's new", "Help & Support", user row (avatar circle, name, notification bell, download icon)

**Main content**:
- Centered serif heading "What can Felix do for you?" — large, italic-leaning serif display, gray-black (~#2A2A2A), ~1/3 down viewport
- Large rounded input card (white, ~16px radius, thin 1px light-gray border, soft shadow): rotating contextual placeholders — "Type / for shortcuts...", "Build a PowerPoint, model, analyze...", "Run research on any company...", "Schedule recurring tasks..."
- Input bottom row: left = lightning-bolt (quick actions), paperclip (attach), sliders + "All sources" (source picker); right = "Felix · Max" model dropdown, mic, circular send-arrow (dark green when active, gray when empty)
- Below input: pill row — "Create ▾", "Connect Apps" (with stacked colored app icons), "Schedule", "Public Documents" — white/outlined pills, fully rounded
- Bottom-right dismissible toast: envelope icon, "Remember that you can use Felix in your email", agent email address, "Open Mail" pill, "×"

**Model-tier dropdown** (182231): opens above input, white card, one row per tier, bold name + one-line gray description: "Felix · Auto — Picks the best Felix tier for each message", "Felix · Max — Most capable for full deliverables" (checkmark = selected), "Felix · Medium — For research & light deliverables", "Felix · Light — For faster analysis, drafting, research", divider, "More models >".

**Sources dropdown** (182323/182331/182407): first level = 3 toggleable groups (External Sources, Internal Sources, Broker Research) each with a global toggle and "›" to expand; "Manage connectors" link at bottom. Expanding opens a nested panel to the right with a search field + scrollable per-connector list, each with icon + name + toggle. Hovering a connector shows a small dark tooltip explaining what that source provides.

**Prompt "Improve"** (183041/183048): a short query surfaces a "✨ Improve" wand link next to the model selector; clicking rewrites the textbox in-place into a long, structured, professional prompt with an "Undo" link to revert.

### B. Chat / Answer view with artifact panel (the flagship screen)
Files: 182855, 182930, 182937, 182839 (loading)

**Layout**: Two-column split ~40/60. Top bar spans both: breadcrumb "Projects / 📁 DBS / Chats / ..." with "···" and "Share" pill far right.

**Left column (chat)**:
- Answer text: sans-serif, near-black on white; bold section sub-headings inside the answer; bulleted lists for data
- Inline citations: small rounded rectangular chips with just a number, pale mint background, dark number — placed directly after the clause they support
- Collapsible **Sources accordion** at the bottom of an answer section: header "⑨ Sources ⌃", then a bold sub-label matching the answer's section (e.g. "DEAL SIZING — SOURCES"), then one line per fact with its trailing number chip (e.g. "Pine Labs $440m: 3") — audit-ready mapping fact→citation
- Bottom-fixed input "Ask a follow up...", occasional attached-comment chip above, model selector, mic, green send
- Loading state: gray rounded shimmer blocks (no explicit step tracker captured — Faheem's choreographed Agent Activity timeline goes BEYOND Rogo here)

**Right column (artifact preview)**:
- Header: file-type icon + filename, last-saved timestamp, icon cluster (version history, download, expand, close)
- Vertical slide-thumbnail rail (~85px), current slide highlighted
- Live-rendered slide canvas, hover micro-toolbar (comment, edit, marquee-select)
- Rendered slide carries the CLIENT's branding (DBS red/navy) — vendor green never appears inside generated deliverables

### C. Project workspace
Files: 182700, 182717, 182820

- Breadcrumb + "🔒 Private" + "Share" pill; project title as large serif heading; metadata line "🔒 Private · Updated Jun 26, 2026"
- Contextual input: placeholder "Ask Felix about DBS" (project-scoped omnibox)
- Project quick-action pills: "Public Documents", "Schedule", "Screening", "Presentation", "Spreadsheet"
- Tabs: "Files | Recent chats | Scheduled tasks", right: search, new-folder, "Upload ▾" (Files/Folders/ZIPs)
- File list rows with colored file-type icons
- **Share modal**: recipient field + "Can view" permission dropdown + green "Share"; "People with Access" list (avatar, name "(you)", email, role); footer "🔒 Only people invited ▾" + info icon. Multi-select bulk bar at page bottom: "3 items selected × ＋Add to Chat ⬇ Download 🗑 Delete"

### D. Settings → Connections
Files: 182447, 182459, 182511

- Settings page: left mini-sidebar (user card; My Account, Usage, Personalize, Notifications, Memory, **Connections**, Permissions, Email Agent, Admin; "← Exit settings")
- Main: "Connections" title + subtitle, search bar, dark-green "＋ Add custom MCP" top-right
- "Connected" rows: colored app icon, bold name (+ BETA pill), gray one-liner, right "Configure" outlined pill + "···"
- Available list: same rows but "Connect" button, no overflow menu
- "Add custom MCP connector" modal: Name field, Remote server URL field, collapsible "Advanced settings", Cancel / solid dark-green "Add connector"

### E. Excel add-in
Files: 183133, 183208

- Right-docked panel in Excel; "New chat" + history; serif greeting "What can Felix help with today?"; spreadsheet-specific quick actions ("Build financial models", "Explain this workbook", "Debug my formulas", "Organize unstructured data")
- Bottom context chip "A1 [Selected]" binding selection to query
- **Cell-level citation**: hovering a model cell shows a tooltip with source label + deep-link URL back into the app (company/metric/date/periodicity params) — every number traceable

### F. Skills library
Files: 183340, 183451

- "Skills" serif title + subtitle "Reusable instructions your Rogo Agents can follow.", green "＋ Create Skill"
- Filter pills: All (mint active), Personal, Team, Organization, Shared with me; "Show hidden" toggle, search, filter, grid/list toggle
- 2-col card grid: green icon tile, bold title, 2-line truncated description, "By Rogo" byline, per-card on/off toggle
- Skill names seen: 3-Statement Model, AI Disruption Risk Scorer, Bolt-On M&A, Bottom-Up TAM, Business Quality Checklist, Buyer List, CIM Executive Summary Builder, Credit Agreement Summary, Customer Cube Analytics

## 3. Design system summary

- **Overall**: quiet, editorial, "private-bank" feel — white/off-white surfaces, thin hairline borders over shadows, generous whitespace. Finance research terminal, not SaaS chat toy.
- **Brand color**: single deep forest/pine green accent — logo tile, primary buttons, toggles, active send. Approx `#1B2E20`–`#2C4A34` darkest, `#3F6B4A`–`#4B7A57` buttons, pale mint `#DCEEDD`–`#E6F0E2` citation chips / selected pills. (Faheem swaps in `#061F52` navy primary + `#07966F` emerald accent.)
- **Neutrals**: bg `#FFFFFF`/`#FAFAFA`; callout cards `#F5F5F4`–`#F7F7F5`; text `#1F2124`–`#2A2A2A`; secondary `#8A8D91`.
- **Typography**: serif display ONLY for the big contextual greeting; everything else clean grotesque sans. Serif-headline/sans-body pairing carries across product and deck.
- **Radius**: pills fully rounded; inputs/cards 12–16px; modals slightly less.
- **Shadows**: subtle, mainly on the hero input card and modals; list rows use 1px borders.
- **Citations**: inline numbered mint chips (not superscripts/footnotes) + collapsible grouped "Sources" accordion mirroring the answer's own subheadings; doubled at cell level in Excel via deep-link tooltips.
- **Deliverables carry client branding**, never vendor branding.

## 4. Details worth copying

1. Rotating contextual placeholder text in the omnibox
2. Project-scoped placeholder ("Ask Faheem about Jahez Evaluation")
3. Model-tier picker with plain-English tradeoffs (Auto/Max/Medium/Light + "More models >")
4. Nested source picker: category toggles → per-connector toggles → hover tooltips explaining each source
5. One-click "Improve" prompt rewrite with "Undo"
6. Dedicated agent email toast (faheem@... "Open Mail") as ambient-presence flourish
7. Split-pane chat + live artifact preview with thumbnail rail + hover micro-toolbar + file metadata — the single most important pattern for the demo
8. Inline numbered citation chips + grouped Sources accordion
9. Cell-level citation tooltip with plausible deep-link URL in the Excel workbook
10. Skills library as toggle-able card gallery (map to Faheem's analyst playbooks: DCF, Comps, IC Memo, Risk Scorecard, Sensitivity, Shariah Screen)
11. Connections split Connected vs Available with different button treatments + BETA tags + custom MCP modal
12. Share modal + multi-select bulk-action bar for Library polish
