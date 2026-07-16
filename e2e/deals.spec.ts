import { expect, test } from "@playwright/test";

/**
 * T3.3 acceptance, pipeline board + company workspaces.
 * Board: origin filter pills toggle card visibility. Darb workspace: the
 * Screening Agent scorecard (6 rows, one flag), citation chip → PdfPanel at
 * the cited IC Charter page, and the human-gate stage flip. Jahez workspace:
 * document room (workspace + Lunar + packs) and the leadership bio grid.
 */
test.beforeEach(async ({ context, baseURL }) => {
  await context.addCookies([
    { name: "faheem_session", value: "e2e-test", url: baseURL },
  ]);
});

test.describe("pipeline board", () => {
  test("origin filter pills toggle deal-card visibility", async ({ page }) => {
    await page.goto("/deals");
    await expect(
      page.getByRole("heading", { name: "Deal pipeline" }),
    ).toBeVisible();

    // all four deals on entry, one per stage section
    await expect(page.getByTestId("deal-card")).toHaveCount(4);
    await expect(page.locator('[data-deal="jahez"]')).toBeVisible();
    await expect(page.locator('[data-deal="aqar"]')).toBeVisible();

    // public pivot: only the market-screen deal survives
    await page.getByRole("button", { name: "Market Screen (Public)" }).click();
    await expect(page.getByTestId("deal-card")).toHaveCount(1);
    await expect(page.locator('[data-deal="jahez"]')).toBeVisible();
    await expect(page.locator('[data-deal="darb"]')).toHaveCount(0);

    // private side: the three inbound deals, Jahez gone
    await page.getByRole("button", { name: "Inbound (Private)" }).click();
    await expect(page.getByTestId("deal-card")).toHaveCount(3);
    await expect(page.locator('[data-deal="jahez"]')).toHaveCount(0);
    await expect(page.locator('[data-deal="darb"]')).toBeVisible();

    // and back to everything
    await page.getByRole("button", { name: "All", exact: true }).click();
    await expect(page.getByTestId("deal-card")).toHaveCount(4);
  });

  test("Jahez card carries the market-screen origin detail", async ({
    page,
  }) => {
    await page.goto("/deals");
    await expect(
      page
        .locator('[data-deal="jahez"]')
        .getByText("SAHMK/Argaam screen · 2026-07-08"),
    ).toBeVisible();
  });
});

test.describe("Darb workspace (screening)", () => {
  test("scorecard renders 6 criterion rows including the concentration flag", async ({
    page,
  }) => {
    await page.goto("/deals/darb");
    await expect(page.getByTestId("scorecard-row")).toHaveCount(6);

    const warnRow = page
      .getByTestId("scorecard-row")
      .filter({ hasText: "Concentration" });
    await expect(warnRow.getByText("Flag")).toBeVisible();

    // verdict line + anonymized note
    await expect(
      page.getByText(/Recommend advancing to pitch meeting/),
    ).toBeVisible();
    await expect(
      page.getByText("Details anonymized (client confidentiality)."),
    ).toBeVisible();
  });

  test("citation chip opens the PdfPanel at the cited IC Charter page", async ({
    page,
  }) => {
    await page.goto("/deals/darb");
    await page
      .getByRole("button", { name: "Open the IC Charter at page 4" })
      .click();

    const panel = page.locator("aside");
    await expect(
      panel.getByText("Lunar IC Charter & Investment Mandate"),
    ).toBeVisible();
    await expect(panel.getByText(/Page 4/)).toBeVisible();
    // vendored pdfjs worker actually renders the page
    await expect(panel.locator("canvas")).toBeVisible({ timeout: 20000 });
  });

  test("human gate flips the stage badge from Screening to Analysis", async ({
    page,
  }) => {
    await page.goto("/deals/darb");
    const banner = page.getByTestId("stage-banner");
    await expect(banner.getByText("Screening", { exact: true })).toBeVisible();

    await page
      .getByRole("button", { name: "Advance to Analyst Stage" })
      .click();

    await expect(banner.getByText("Analysis", { exact: true })).toBeVisible();
    // the next human gate appears for the new stage
    await expect(
      page.getByRole("button", { name: "Send to IC" }),
    ).toBeVisible();
  });
});

test.describe("Jahez workspace", () => {
  test("Documents tab lists the workspace + Lunar + pack docs (≥6)", async ({
    page,
  }) => {
    await page.goto("/deals/jahez");
    await page.getByRole("tab", { name: "Documents" }).click();

    const rows = page.getByTestId("doc-row");
    expect(await rows.count()).toBeGreaterThanOrEqual(6);
    await expect(page.getByText("Annual Report 2024")).toBeVisible();
    await expect(
      page.getByText("Lunar IC Charter & Investment Mandate"),
    ).toBeVisible();
  });

  test("Leadership tab renders the bio grid (≥10 bios)", async ({ page }) => {
    await page.goto("/deals/jahez");
    await page.getByRole("tab", { name: "Leadership" }).click();

    expect(await page.getByTestId("bio-card").count()).toBeGreaterThanOrEqual(
      10,
    );
    await expect(page.getByText("Chief Financial Officer")).toBeVisible();
  });

  test("overview shows the origin story and verified FY2025 figures", async ({
    page,
  }) => {
    await page.goto("/deals/jahez");
    await expect(
      page.getByText(/Surfaced by SAHMK\/Argaam screen/),
    ).toBeVisible();
    // GMV from model-inputs.json (fy25.gmv = 7,245.2 SAR m) with source caption
    await expect(page.getByText("SAR 7,245.2M")).toBeVisible();
    await expect(
      page.getByText(/Q4 2025 Earnings Results · p\.4/).first(),
    ).toBeVisible();
  });

  test("overview shows the analytics card with rendered bars", async ({
    page,
  }) => {
    await page.goto("/deals/jahez");
    const card = page.getByRole("region", { name: /Financial performance/i });
    await expect(card).toBeVisible();
    // panel ① draws 3 periods × 2 series = 6 <rect> bars (svg rect count > 5)
    await expect
      .poll(() => card.locator("svg rect").count())
      .toBeGreaterThan(5);
    // panel footers carry the source (rule 5: every number is sourced)
    await expect(
      card.getByText(/Q4 2025 Earnings Results/).first(),
    ).toBeVisible();
  });

  test("overview shows the Market Sentiment card with the signal-only disclaimer", async ({
    page,
  }) => {
    await page.goto("/deals/jahez");
    const card = page.getByTestId("sentiment-card");
    await expect(card).toBeVisible();
    await expect(card.getByText("Cautious", { exact: true })).toBeVisible();
    await expect(
      card.getByText("Signal only, not a valuation input"),
    ).toBeVisible();

    // peeking the pack lists the illustrative posts, each clearly tagged.
    await card.getByRole("button", { name: "View the social pack" }).click();
    await expect(
      page.getByText("Illustrative social & forum pack"),
    ).toBeVisible();
    await expect(
      page.getByText("Illustrative demo data").first(),
    ).toBeVisible();
  });

  test("Market Sentiment card shows the disclaimer bilingually (AR)", async ({
    page,
    context,
    baseURL,
  }) => {
    await context.addCookies([
      { name: "faheem_locale", value: "ar", url: baseURL },
    ]);
    await page.goto("/deals/jahez");
    const card = page.getByTestId("sentiment-card");
    await expect(card).toBeVisible();
    await expect(card.getByText("حذر", { exact: true })).toBeVisible();
    await expect(
      card.getByText("مؤشر استرشادي فقط، وليس مدخلاً للتقييم"),
    ).toBeVisible();
  });
});
