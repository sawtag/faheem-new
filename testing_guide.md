# New features on `feature/wip` — and how to see them live

**Run the app first:**

```bash
PORT=4000 npm run dev:cache   # fully offline, no API key needed
```

Open http://localhost:4000 and sign in with **any username/password** (auth is mocked).
(If you already have `npm run dev` running on port 3000, just use that — it hot-reloads.)

---

## 1. Live Model — the Jahez DCF, interactive

**Where:** Deals → Jahez → **"Live Model"** button in the header (or go to `/deals/jahez/model`).

- Hero stats: DCF value/share **SAR 14.36** and weighted IRR **16.8%**, with a bear/base/bull scenario strip.
- **Assumptions tab** — the gold cells are editable: click one (e.g. Order growth FY26E), change it with the stepper, and the whole model recomputes instantly — changed cells count up and a "N values updated" chip appears. **Reset to base** undoes everything.
- **DCF tab** — the full chain: WACC build → revenue build → statement → FCFF → valuation bridge. Actual columns are dimmed; forecasts bright.
- **Sensitivity tab** — two stress matrices (WACC × terminal growth, take-rate × GMV growth); the base cell is ringed.

## 2. Methodology panel — "explain this number"

**Where:** same page — **click any number**.

- A side panel explains it: plain-language explainer → the real formula (rendered like a textbook) → its inputs as clickable chips.
- Keep drilling chips (breadcrumbs take you back). Every chain ends at either an **analyst assumption** (with the reasoning) or a **source PDF that opens at the exact cited page**.
- Click a grey "actual" cell (e.g. FY25 revenue): it shows a lock and "source-locked" — sourced numbers can never be edited.

## 3. Conversational model edits + the agent team (just committed)

**Where:** same page — the **command bar above the tabs**.

- Click a suggested chip like **"Raise FY26 order growth to 20%"** — or type your own, English or Arabic (Arabic-Indic digits like ٢٠٪ work).
- Watch the specialist team choreograph the change: **Valuation** recomputes → **Critical Review** re-verifies the provenance chain → **Compliance** re-checks only if leverage/tax moved (otherwise an honest "no re-check needed") → **Deliverable Writing** updates the recommendation line with the real new numbers vs the 15% hurdle.
- Try the chip **"Change FY25 revenue to SAR 2 billion"** — Critical Review refuses gracefully: that's a sourced actual (**source-locked**).
- Every applied edit is logged — check the **Audit Trail** page for the new "model edit" entries.

## 4. Expanded agent roster — 14 agents

**Where:** **Agents** page.

Four new cards with real methods and data stories: **Accounting & Quality of Earnings**, **Critical Review** (adversarial red-team, distinct from Compliance), **News & Market Intelligence**, and **Market Sentiment**.

## 5. Market Sentiment card — "signal only"

**Where:** Deals → Jahez → **Overview** tab (compact version on the Dashboard under the macro strip).

- Shows a **"cautious"** read with a one-line rationale and the caption _"Signal only — not a valuation input"_.
- Click **"View the social pack"** — the posts behind it, each clearly tagged _"illustrative demo data"_ (synthetic, never presented as real scraped posts, never a sourced number).

## 6. Social & Alt-Data connector (roadmap)

**Where:** **Connections** page — a new roadmap-posture connector card.

## 7. Draft email to IC — "Open in Outlook"

**Where:** two places —

- In **Jahez chat**, ask ⌘K → "Prepare the IC memo, DCF model, and committee deck." When the deliverables finish generating, a **"Draft email to IC"** button appears on the artifacts panel.
- Or in the **IC Room** header (appears once Jahez artifacts exist).

**What to try:** the modal opens with the recipients pre-filled (Lunar IC Group), an editable subject, and a Faheem-written body carrying the live model numbers (per-share, weighted IRR vs the 15% hurdle, compliance status) plus the list of generated materials. Edit anything, then **"Open in Outlook"** — it opens your mail client with everything filled in; _you_ review and send (Faheem never sends). The draft is logged in the Audit Trail as an "IC draft" entry.

## 8. ⌘K palette — the Live Model demo beat

**Where:** anywhere in the app, press **⌘K**.

- A new **"Live Model"** section lists the scripted demo edits (including the source-locked one). Picking an entry navigates to the Jahez model page if needed and pre-fills the instruction into the command bar — you just hit Apply. This is the stage-safety path: on demo day nothing gets typed by hand.
- Venue preflight now covers the new beat too: `npx tsx scripts/preflight.ts` checks the engine's headline numbers, the provenance graph (zero orphans), the scripted edit set (incl. Arabic), the sentiment data guards, and KaTeX rendering of all 55 formulas.

## 9. Everything works in Arabic

Toggle **العربية** (bottom-left) and revisit any of the above: full RTL chrome, while model grids stay numeric-LTR (Western digits) per finance convention.

## 10. Agent toggles

**Where:** **Agents** page. Toggling is the only roster interaction, deliberately: the orchestrator already picks the right specialists per prompt, so a toggle is the analyst's persisted roster preference, never a routing switch.

- Flip the toggle on any specialist card; the card dims (icon grayscales, copy fades) but nothing else changes.
- Reload the page: the toggle state survives (localStorage, per browser profile).
- Every flip is logged: check the **Audit Trail** page for "Agent toggled" entries carrying "&lt;agent&gt; · enabled|disabled".
- The orchestrator banner has no toggle; it is not optional.
- There is no add, edit, or delete on agents anywhere.

## 11. Custom skills: build your own playbook

**Where:** **Skills** page: the dashed **"Add skill"** tile, always the last card in the grid.

- Click it: a dialog opens asking for a **Name**, a **Category** (pill picker: Valuation / Diligence / Risk & Compliance / Output, "Valuation" selected by default), a one-line **Description** (what shows on the card), and a **Run prefill**: the text Run drops into the chat composer, unsent.
- Type a rough prefill (e.g. "check working capital swings for red flags"), then click the **✨ Enhance** wand inside the textarea: it reuses the exact same prompt-improver route the chat composer's Improve wand calls (`/api/improve`), rewriting your rough line into a structured analyst prompt. **Undo** restores exactly what you typed before.
- **Create skill** is disabled until the name/description/prefill all clear their minimum lengths. On success the dialog closes and a new card appears in the grid: Wrench icon tile, your name, category, description, and a **Custom** badge.
- The category filter pills narrow custom cards exactly like built-in ones; the **"Add skill"** tile itself always stays visible regardless of which pill is active.
- Click **Run** on a custom card: it lands you on a fresh chat (`/chat/new?context=firm`) with your prefill text sitting in the composer, unsent; same mechanism a built-in prefill skill (e.g. DCF, FCFF Build) uses.
- Three **Lunar** skills ship pre-seeded (IC Charter Quick Screen, Saudi Consumer Pulse, Weekly Portfolio Brief), each with a navy **Lunar** badge: the firm's own playbooks living beside Faheem's, and the showcase for this whole feature.
- Click the pencil icon on any store-backed card (Lunar or Custom): the same dialog opens pre-filled, **Save changes** edits in place.
- Click the copy icon on ANY card, built-in included: the dialog opens seeded with "&lt;name&gt; (copy)" and the source's category, one-liner, and run prompt, ready to adapt. Copying is how you make an immutable Faheem playbook your own.
- Flip the toggle on a store-backed card: it dims exactly like a registry card, and the state persists (server-side) across reloads.
- Click the trash icon to delete a store-backed card; it disappears immediately.
- Everything is logged: check the **Audit Trail** page for "Skill created" / "Skill updated" / "Skill deleted" entries carrying "&lt;name&gt; · &lt;category&gt;", and "Skill toggled" entries carrying "&lt;name&gt; · enabled|disabled".
- Built-in Faheem skills are immutable: copy is the only affordance they ever show, never edit or delete.

---

**Still in progress:** the final code review of the whole wave, the full production e2e run (needs the dev server stopped briefly), and the `demo-rc3` tag.
