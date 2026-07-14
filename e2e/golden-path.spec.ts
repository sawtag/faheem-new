import { expect, test } from "@playwright/test";
import { clickUntil, loadDemoCacheFixture } from "./helpers";

/**
 * T5.2 golden path — one serial run through the full demo run-of-show
 * (plan §T5.2, gate F), entirely in `FAHEEM_MODE=cached` (playwright.config.ts
 * webServer env): login → home hero → onboarding (3 steps) → pipeline filter →
 * Darb scorecard + human gate → Jahez documents → seeded chat Q&A (cached
 * fixture, stages → streamed answer → citation → PdfPanel) → language toggle
 * to Arabic and back → Library artifacts → Faheem IC room.
 *
 * Kept as ONE test (not a serial `describe`) so each beat runs against the
 * live DOM state left by the previous beat — no cross-test page handoff, no
 * re-navigation/re-login between beats, which is what "mirrors the run of
 * show" means here. `test.step` groups each beat in the HTML report.
 *
 * LOCALE-TOGGLE SURVIVAL (P6 item 1 — fixed): AppShell keys its content region
 * by locale (`key={locale}` on `motion.main`, for the crossfade) which fully
 * remounts ChatView, and its live turns live in plain `React.useState`. That
 * used to silently discard the just-asked Q&A on a language toggle. The fix
 * write-throughs each turn to the localStorage overlay (lib/chats.ts) — seeded
 * chats included — so the remount re-reads it as history. The "language toggle
 * to AR" step below now asserts the just-asked live answer survives the toggle,
 * not merely the pre-seeded history.
 *
 * Clicks that land right after a `page.goto()` use `clickUntil` (helpers.ts):
 * at this suite's parallelism the click can beat React's hydration of that
 * specific node — the element is already visible/stable so Playwright's
 * actionability checks pass, but no listener is attached yet and the click is
 * silently swallowed. `clickUntil` re-issues the click, not just the check.
 */
test("golden path: login through IC room, fully cached", async ({ page }) => {
  test.setTimeout(180_000);

  await test.step("login (ali/demo)", async () => {
    await page.goto("/login");
    await page.getByLabel(/username/i).fill("ali");
    await page.getByLabel(/password/i).fill("demo");
    // sign-in round-trips through /api/auth before the redirect, so give the
    // check more room than the local-state-only steps below get.
    await clickUntil(page.getByRole("button", { name: /sign in/i }), () =>
      expect(page).toHaveURL("/", { timeout: 3000 }),
    );
  });

  await test.step("home renders hero", async () => {
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  await test.step("/onboarding: complete the 3 steps", async () => {
    await page.goto("/onboarding");

    await expect(
      page.getByRole("heading", { name: "Connect & Configure" }),
    ).toBeVisible();
    await expect(page.getByText("Step 1 of 3")).toBeVisible();
    await clickUntil(page.getByRole("button", { name: "Continue" }), () =>
      expect(page.getByText("Step 2 of 3")).toBeVisible({ timeout: 2500 }),
    );

    await clickUntil(page.getByRole("button", { name: "Continue" }), () =>
      expect(page.getByText("Step 3 of 3")).toBeVisible({ timeout: 2500 }),
    );

    await clickUntil(
      page.getByRole("button", { name: "Create IC Charter" }),
      () =>
        expect(
          page.getByRole("heading", { name: "Your IC Charter is ready" }),
        ).toBeVisible({ timeout: 2500 }),
    );
  });

  await test.step("/deals: filter Inbound", async () => {
    await page.goto("/deals");
    await expect(
      page.getByRole("heading", { name: "Deal pipeline" }),
    ).toBeVisible();
    await expect(page.getByTestId("deal-card")).toHaveCount(4);

    await clickUntil(
      page.getByRole("button", { name: "Inbound (Private)" }),
      () =>
        expect(page.getByTestId("deal-card")).toHaveCount(3, {
          timeout: 2500,
        }),
    );
    await expect(page.locator('[data-deal="jahez"]')).toHaveCount(0);
    await expect(page.locator('[data-deal="darb"]')).toBeVisible();
  });

  await test.step("open Darb -> scorecard visible (6 rows, warn row)", async () => {
    await clickUntil(page.locator('[data-deal="darb"]').getByRole("link"), () =>
      expect(page).toHaveURL(/\/deals\/darb$/, { timeout: 2500 }),
    );

    await expect(page.getByTestId("scorecard-row")).toHaveCount(6);
    const warnRow = page
      .getByTestId("scorecard-row")
      .filter({ hasText: "Concentration" });
    await expect(warnRow.getByText("Flag")).toBeVisible();
  });

  await test.step("gate button flips the stage badge", async () => {
    const banner = page.getByTestId("stage-banner");
    await expect(banner.getByText("Screening", { exact: true })).toBeVisible();

    await clickUntil(
      page.getByRole("button", { name: "Advance to pitch meeting" }),
      () =>
        expect(banner.getByText("Analysis", { exact: true })).toBeVisible({
          timeout: 2500,
        }),
    );

    await expect(banner.getByText("Analysis", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Send to IC" }),
    ).toBeVisible();
  });

  await test.step("/deals/jahez -> Documents tab lists corpus docs", async () => {
    await page.goto("/deals/jahez");

    const docsTab = page.getByRole("tab", { name: "Documents" });
    await clickUntil(docsTab, () =>
      expect(docsTab).toHaveAttribute("aria-selected", "true", {
        timeout: 2500,
      }),
    );

    const rows = page.getByTestId("doc-row");
    await expect.poll(() => rows.count()).toBeGreaterThanOrEqual(6);
    await expect(page.getByText("Annual Report 2024")).toBeVisible();
    await expect(
      page.getByText("Lunar IC Charter & Investment Mandate"),
    ).toBeVisible();
  });

  const fixture = loadDemoCacheFixture();

  await test.step("open seeded Jahez chat, ask the cached fixture question", async () => {
    await page.goto("/chat/seed-jahez-revenue");
    await expect(
      page.getByRole("heading", { name: /FY2025 revenue quality review/i }),
    ).toBeVisible();

    await page.getByRole("textbox").fill(fixture.question);
    await clickUntil(page.getByRole("button", { name: "Send" }), () =>
      expect(page.getByText(fixture.question)).toBeVisible({ timeout: 2500 }),
    );
  });

  await test.step("stages appear, answer streams", async () => {
    // 30s: under a cold dev-server the first compile of this route plus the
    // paced replay can exceed 15s when the full suite runs at 16 workers.
    await expect(page.getByText(/\d+ agents · \d+s/)).toBeVisible({
      timeout: 30000,
    });
    await expect(page.getByText(/64\.9/)).toBeVisible();
    await expect(
      page.getByText(/Verified.*5 sources cited/).last(),
    ).toBeVisible();
  });

  await test.step("citation chip -> PdfPanel shows the right doc + page", async () => {
    await page.getByRole("button", { name: "Open source 1" }).last().click();

    const panel = page.locator("aside");
    await expect(panel.getByText("Q4 2025 Earnings Results")).toBeVisible();
    await expect(panel.getByText(/Page 4/)).toBeVisible();
    await expect(panel.locator("canvas")).toBeVisible({ timeout: 20000 });
  });

  await test.step("language toggle to AR -> same chat renders RTL cleanly", async () => {
    await page.getByRole("button", { name: "Switch language" }).click();

    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");

    await expect
      .poll(
        () =>
          page.evaluate(() => {
            const el = document.scrollingElement;
            return el ? el.scrollWidth - el.clientWidth : 0;
          }),
        { timeout: 8000 },
      )
      .toBeLessThanOrEqual(1);

    // Same chat, rendered cleanly in RTL: the pre-seeded history is present…
    await expect(
      page.getByRole("heading", { name: "مراجعة جودة إيرادات 2025" }),
    ).toBeVisible();

    // …AND the just-asked live turn survives the remount (P6 item 1 fix). The
    // streamed answer was written through to the overlay before the toggle, so
    // the remounted ChatView replays it as history — the "64.9%" figure from
    // that answer is still on screen after flipping to Arabic.
    await expect(page.getByText(/64\.9/).first()).toBeVisible();
  });

  await test.step("language toggle back to EN", async () => {
    await page.getByRole("button", { name: "تبديل اللغة" }).click();

    await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
    await expect(
      page.getByRole("heading", { name: /FY2025 revenue quality review/i }),
    ).toBeVisible();
  });

  await test.step("/library shows 3 artifact cards + download links HEAD 200", async () => {
    await page.goto("/library");
    await expect(page.getByRole("heading", { name: "Library" })).toBeVisible();
    await expect(page.getByText("Jahez — Valuation Model")).toBeVisible();
    await expect(page.getByText("Jahez — IC Memo")).toBeVisible();
    await expect(page.getByText("Jahez — Board Deck")).toBeVisible();

    const hrefs = await page
      .locator("a[download]")
      .evaluateAll((els) => els.map((el) => el.getAttribute("href")));
    expect(hrefs.length).toBeGreaterThanOrEqual(3);

    for (const href of hrefs) {
      expect(href, "artifact card missing a download href").toBeTruthy();
      const res = await page.request.head(href as string);
      expect(res.status(), href as string).toBe(200);
    }
  });

  await test.step("Live Model beat: chip edit → recompute → Methodology drill → back (WS-F)", async () => {
    // right after deliverables generate in the run-of-show (docs/rehearsal-notes.md,
    // plan §6) — thorough acceptance already lives in e2e/model.spec.ts; this is
    // the honest minimal slice that keeps the golden path a true walk of the
    // whole demo run-of-show.
    await page.goto("/deals/jahez/model");
    await expect(
      page.getByRole("heading", { level: 1, name: "Jahez" }),
    ).toBeVisible();

    const perShare = page.locator('[data-node-key="base.perShare"]').first();
    await expect(perShare).toContainText("14.36");

    // scripted chip — "Raise FY26 order growth to 20%" — the specialist team
    // choreographs, then Valuation's completed stage applies the recompute.
    await clickUntil(page.getByTestId("edit-chip-growth"), async () => {
      await expect(page.getByTestId("edit-choreography")).toBeVisible();
    });
    await expect(perShare).not.toContainText("14.36");
    await expect(page.getByTestId("diff-chip")).toBeVisible();

    // a computed cell's Methodology drills to a sourced leaf → the source PDF
    await page.getByRole("tab", { name: "DCF" }).click();
    await clickUntil(page.locator('[data-node-key="wacc"]'), async () => {
      await expect(page.getByTestId("methodology-sheet")).toBeVisible();
    });
    const sheet = page.getByTestId("methodology-sheet");
    await sheet.getByRole("button", { name: /Cost of equity/i }).click();
    await sheet.getByRole("button", { name: /Risk-free rate/i }).click();
    await sheet.getByRole("button", { name: "Open source" }).click();
    await expect(
      page.getByText("Market Data & Comparables Snapshot"),
    ).toBeVisible();

    // back to the workspace for the next beat
    await page.goto("/deals/jahez");
    await expect(
      page.getByRole("heading", { level: 1, name: "Jahez" }),
    ).toBeVisible();
  });

  await test.step("/ic: table shows both deal columns + disclaimer", async () => {
    await page.goto("/ic");
    await expect(
      page.getByRole("heading", { name: "Investment Committee" }),
    ).toBeVisible();
    await expect(page.getByTestId("ic-comparison-table")).toBeVisible();

    // Tolerate both states for Jahez (metrics landed vs. still pending) — the
    // column itself must render either way; Thara Pay is always populated.
    await expect(page.getByTestId("ic-col-jahez")).toBeVisible();
    await expect(page.getByTestId("ic-col-thara-pay")).toBeVisible();

    await expect(page.getByTestId("ic-advisory-disclaimer")).toHaveText(
      "Advisory only — the investment decision rests with the committee.",
    );
  });
});
