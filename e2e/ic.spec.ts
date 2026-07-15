import { expect, test } from "@playwright/test";

/**
 * T3.4 acceptance, the Faheem IC room (the closing beat). Session cookie is set
 * defensively (same pattern as governance.spec) so the route is reachable
 * without a fresh login.
 */
test.beforeEach(async ({ context, baseURL }) => {
  await context.addCookies([
    { name: "faheem_session", value: "e2e-test", url: baseURL },
  ]);
});

test.describe("Faheem IC room", () => {
  test("renders both deal columns, both populated (P5a: Jahez model signed off)", async ({
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

    // Thara Pay: 18.5% implied IRR vs the 15% hurdle, positive delta, pass
    // badges, all from deals.json.
    await expect(page.getByText("18.5%")).toBeVisible();
    await expect(page.getByText("vs 15% hurdle")).toBeVisible();
    const tharaDelta = page.getByTestId("ic-irr-delta-thara-pay");
    await expect(tharaDelta).toHaveAttribute("data-tone", "above");
    await expect(tharaDelta).toContainText("350");

    // Jahez: 17.1% implied IRR vs the 15% hurdle, +210bps, pass badges, the
    // model signed off at P5a (jahez-analysis-summary.pdf).
    await expect(page.getByText("17.1%")).toBeVisible();
    const jahezDelta = page.getByTestId("ic-irr-delta-jahez");
    await expect(jahezDelta).toHaveAttribute("data-tone", "above");
    await expect(jahezDelta).toContainText("210");

    // Both columns clear mandate fit + Shariah → 4 "Pass" badges total.
    await expect(page.getByText("Pass")).toHaveCount(4);

    // No pending column left, never fake numbers, but nothing pending either.
    await expect(page.getByTestId("ic-pending-jahez")).not.toBeVisible();
  });

  test("advisory-only disclaimer is visible on load", async ({ page }) => {
    await page.goto("/ic");
    const banner = page.getByTestId("ic-advisory-disclaimer");
    await expect(banner).toBeVisible();
    await expect(banner).toHaveText(
      "Advisory only: the investment decision rests with the committee.",
    );
  });

  test("a suggested-question pill fills the composer", async ({ page }) => {
    await page.goto("/ic");
    const composer = page.getByRole("textbox", { name: "Ask Faheem IC…" });
    await expect(composer).toHaveValue("");

    const pill = page.getByRole("button", {
      name: "Rank these deals: strongest risk-adjusted case?",
    });
    await pill.click();

    await expect(composer).toHaveValue(
      "Rank these deals: strongest risk-adjusted case?",
    );
  });
});
