import { expect, test } from "@playwright/test";

/**
 * T3.4 acceptance — the Faheem IC room (the closing beat). Session cookie is set
 * defensively (same pattern as governance.spec) so the route is reachable
 * without a fresh login.
 */
test.beforeEach(async ({ context, baseURL }) => {
  await context.addCookies([
    { name: "faheem_session", value: "e2e-test", url: baseURL },
  ]);
});

test.describe("Faheem IC room", () => {
  test("renders both deal columns — Thara Pay populated, Jahez pending", async ({
    page,
  }) => {
    await page.goto("/ic");

    await expect(
      page.getByRole("heading", { name: "Investment Committee" }),
    ).toBeVisible();
    await expect(page.getByTestId("ic-comparison-table")).toBeVisible();

    // Both analysis-complete deals get a column.
    await expect(page.getByTestId("ic-col-jahez")).toBeVisible();
    await expect(page.getByTestId("ic-col-thara-pay")).toBeVisible();

    // Thara Pay is populated: 18.5% implied IRR vs the 15% hurdle, positive
    // delta, and pass badges — all from deals.json.
    await expect(page.getByText("18.5%")).toBeVisible();
    await expect(page.getByText("vs 15% hurdle")).toBeVisible();
    const delta = page.getByTestId("ic-irr-delta-thara-pay");
    await expect(delta).toHaveAttribute("data-tone", "above");
    await expect(delta).toContainText("350");
    await expect(page.getByText("Pass")).toHaveCount(2);

    // Jahez has no icMetrics yet → pending state, never fake numbers.
    await expect(page.getByTestId("ic-pending-jahez")).toBeVisible();
    await expect(page.getByTestId("ic-pending-jahez")).toContainText(
      /metrics pending model sign-off/i,
    );
  });

  test("advisory-only disclaimer is visible on load", async ({ page }) => {
    await page.goto("/ic");
    const banner = page.getByTestId("ic-advisory-disclaimer");
    await expect(banner).toBeVisible();
    await expect(banner).toHaveText(
      "Advisory only — the investment decision rests with the committee.",
    );
  });

  test("a suggested-question pill fills the composer", async ({ page }) => {
    await page.goto("/ic");
    const composer = page.getByRole("textbox", { name: "Ask Faheem IC…" });
    await expect(composer).toHaveValue("");

    const pill = page.getByRole("button", {
      name: "Rank these deals — strongest risk-adjusted case?",
    });
    await pill.click();

    await expect(composer).toHaveValue(
      "Rank these deals — strongest risk-adjusted case?",
    );
  });
});
