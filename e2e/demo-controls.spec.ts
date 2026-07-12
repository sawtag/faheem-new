import { expect, test, type Route } from "@playwright/test";

/**
 * P5a acceptance — the two stage-only overlays. Both are invisible until
 * their shortcut fires; neither has a visible affordance anywhere in the UI.
 */
test.beforeEach(async ({ context, baseURL }) => {
  await context.addCookies([
    { name: "faheem_session", value: "e2e-test", url: baseURL },
  ]);
});

test.describe("⌘K demo palette", () => {
  test("is hidden until ⌘K, then selecting qa1 fills the composer with the exact recorded text + a doc chip, and the submitted payload matches data/golden-questions.json byte-for-byte", async ({
    page,
  }) => {
    await page.goto("/chat/seed-jahez-revenue");
    const box = page.getByRole("textbox");
    await expect(box).toBeVisible();

    // no visible affordance — the palette doesn't exist in the DOM at all yet
    await expect(page.getByTestId("palette-item-qa1")).not.toBeVisible();

    await page.keyboard.press("Control+k");
    await expect(page.getByTestId("palette-item-qa1")).toBeVisible();

    await page.getByTestId("palette-item-qa1").click();

    // palette closes, the exact recorded text lands in the composer verbatim
    await expect(page.getByTestId("palette-item-qa1")).not.toBeVisible();
    await expect(box).toHaveValue(
      "Break down Jahez's FY2025 unit economics from #FY2025-Earnings-Release — GMV growth vs take rate, AOV, contribution margin, EBITDA margin — and why did net income compress ~61% despite double-digit GMV growth?",
    );
    // the # doc chip (docIds: ["fy25-er"]) landed alongside the text
    await expect(page.getByText("Q4 2025 Earnings Results")).toBeVisible();

    // intercept the actual POST /api/chat body — the submitted ChatRequest
    // must be byte-identical to golden-questions.json's qa1.request.
    let posted: unknown;
    await page.route("**/api/chat", async (route: Route) => {
      posted = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: "text/event-stream",
        body: 'data: {"type":"done","cached":true}\n\n',
      });
    });
    await box.press("Enter");

    await expect
      .poll(() => posted, { timeout: 5000 })
      .toEqual({
        question:
          "Break down Jahez's FY2025 unit economics from #FY2025-Earnings-Release — GMV growth vs take rate, AOV, contribution margin, EBITDA margin — and why did net income compress ~61% despite double-digit GMV growth?",
        lang: "en",
        context: { kind: "workspace", companyId: "jahez" },
        docIds: ["fy25-er"],
      });
  });
});

test.describe("⌘. mode overlay", () => {
  test("is hidden until ⌘., then switching mode sets the faheem_mode cookie with no reload", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByTestId("mode-overlay")).not.toBeVisible();

    await page.keyboard.press("Control+.");
    await expect(page.getByTestId("mode-overlay")).toBeVisible();

    await page.getByRole("button", { name: "Live", exact: true }).click();
    await expect
      .poll(() => page.evaluate(() => document.cookie))
      .toContain("faheem_mode=live");

    await page.getByRole("button", { name: "Cached", exact: true }).click();
    await expect
      .poll(() => page.evaluate(() => document.cookie))
      .toContain("faheem_mode=cached");

    // toggling again hides it — no visible affordance, no residual chrome
    await page.keyboard.press("Control+.");
    await expect(page.getByTestId("mode-overlay")).not.toBeVisible();
  });
});
