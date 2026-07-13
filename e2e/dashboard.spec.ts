import { expect, test } from "@playwright/test";

/**
 * /dashboard acceptance — the firm mission-control screen (differentiation
 * surface). Purely additive: a new route rendered from seeded firm/runs data,
 * no chat-engine contact. Covers the governance stats (sourced), the Analysis
 * Runs centerpiece (lanes + deliverables wired to the in-app preview), the
 * Saudi macro strip, and the recent/activity rows. `faheem_session` is set so
 * the protected route renders instead of redirecting to /login.
 */
test.beforeEach(async ({ context, baseURL }) => {
  await context.addCookies([
    { name: "faheem_session", value: "e2e-dashboard", url: baseURL },
  ]);
});

test.describe("Dashboard", () => {
  test("renders the header, stats row and nav entry", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(
      page.getByRole("heading", { name: "Firm overview" }),
    ).toBeVisible();

    // sidebar nav gained the Dashboard entry
    await expect(page.getByRole("link", { name: "Dashboard" })).toBeVisible();

    // four sourced stat cards
    for (const label of [
      "Active pipeline",
      "Assets under management",
      "Mandate headroom",
      "IC review queue",
    ]) {
      await expect(page.getByText(label, { exact: true })).toBeVisible();
    }
  });

  test("mandate headroom cites its sources and shows the governance headroom", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await expect(
      page.getByText("Technology & Consumer exposure"),
    ).toBeVisible();
    await expect(page.getByText("1.5pp headroom to the 10% cap")).toBeVisible();
    await expect(
      page.getByText("Portfolio p.1 · cap: IC Charter p.4"),
    ).toBeVisible();
  });

  test("analysis runs panel shows the 7 lanes, deliverables and citation total", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await expect(
      page.getByRole("heading", { name: "Analysis Runs" }),
    ).toBeVisible();
    await expect(page.getByTestId("analysis-run")).toBeVisible();

    // a sample of the specialist lanes (registry names)
    for (const name of [
      "Research & Sourcing",
      "Valuation & Modeling",
      "Verification & Compliance",
    ]) {
      await expect(page.getByText(name, { exact: true })).toBeVisible();
    }

    // the recorded run's citation total, verbatim
    await expect(
      page.getByText("17 citations · from the recorded analysis run"),
    ).toBeVisible();

    // audit-trail footer link
    await expect(
      page.getByRole("link", { name: /Logged to the audit trail/ }),
    ).toHaveAttribute("href", "/audit");
  });

  test("deliverables open the in-app preview panel", async ({ page }) => {
    await page.goto("/dashboard");
    const previews = page.getByRole("button", { name: "Preview" });
    await expect(previews).toHaveCount(3);

    await previews.first().click();
    await expect(page.getByTestId("artifact-preview")).toBeVisible();
  });

  test("collapsed screening run links to the Darb workspace", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    const screening = page.getByTestId("screening-run");
    await expect(screening).toBeVisible();
    await expect(screening).toHaveAttribute("href", "/deals/darb");
    await expect(screening.getByText("6 checks")).toBeVisible();
  });

  test("Saudi macro strip shows the verified GASTAT/SAMA figures", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await expect(page.getByText("Saudi macro")).toBeVisible();
    await expect(page.getByText("+4.5%")).toBeVisible();
    await expect(page.getByText("4.25%")).toBeVisible();
  });

  test("recent analyses and activity feed render", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByText("Recent analyses")).toBeVisible();
    await expect(page.getByText("Activity", { exact: true })).toBeVisible();
    // recent analyses link through to their workspace
    await expect(
      page.getByRole("link", { name: /Jahez/ }).first(),
    ).toBeVisible();
  });

  test("keeps Western digits in Arabic", async ({ page, context, baseURL }) => {
    await page.goto("/dashboard");
    await context.addCookies([
      { name: "faheem_locale", value: "ar", url: baseURL },
    ]);
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");

    // the run panel's numbers must stay Latin-digit in Arabic (rule 2)
    const panel = page.getByTestId("analysis-run");
    const text = await panel.innerText();
    expect(/[٠-٩]/.test(text)).toBe(false);
    expect(/[0-9]/.test(text)).toBe(true);
  });
});
