import { expect, test } from "@playwright/test";

/**
 * T3.6 acceptance — Agents / Library / Audit Trail (the governance beat).
 * `faheem_session` is set defensively: the auth middleware lands in a
 * parallel task, but once it does these routes should still be reachable
 * without a fresh login prompt.
 */
test.beforeEach(async ({ context, baseURL }) => {
  await context.addCookies([
    { name: "faheem_session", value: "e2e-test", url: baseURL },
  ]);
});

test.describe("Agents page", () => {
  test("renders all 10 registry entries, bilingual, with AR names verbatim", async ({
    page,
  }) => {
    await page.goto("/agents");
    await expect(page.getByRole("heading", { name: "Agents" })).toBeVisible();

    // Stage 1 + Stage 2 (orchestrator + 7 specialists) + Stage 3 = 10 entries.
    const enNames = [
      "Screening Agent",
      "Orchestrator / Planner",
      "Research & Sourcing",
      "Document Intelligence",
      "Valuation & Modeling",
      "Comparables & Precedents",
      "Risk & Portfolio Monitoring",
      "Deliverable Writing",
      "Verification & Compliance",
      "Faheem IC",
    ];
    for (const name of enNames) {
      await expect(page.getByText(name, { exact: true })).toBeVisible();
    }

    // AR names verbatim (design-briefs §3.2 / spec §4 item 8).
    await expect(page.getByText("وكيل الفرز", { exact: true })).toBeVisible();
    await expect(
      page.getByText("التحقق والامتثال", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("فهيم — مستشار لجنة الاستثمار", { exact: true }),
    ).toBeVisible();
  });

  test("toggles flip and dim the card content", async ({ page }) => {
    await page.goto("/agents");
    const card = page.getByTestId("agent-card-screening");
    const toggle = card.getByRole("switch");

    await expect(toggle).toHaveAttribute("aria-checked", "true");
    await expect(card).toHaveAttribute("data-dimmed", "false");

    await toggle.click();

    await expect(toggle).toHaveAttribute("aria-checked", "false");
    await expect(card).toHaveAttribute("data-dimmed", "true");
  });

  test("shows exactly 3 human-gate markers", async ({ page }) => {
    await page.goto("/agents");
    await expect(page.getByRole("separator")).toHaveCount(3);
    await expect(
      page.getByRole("separator", { name: "Human gate — the analyst decides" }),
    ).toBeVisible();
    await expect(
      page.getByRole("separator", {
        name: "Human gate — the committee decides",
      }),
    ).toBeVisible();
  });
});

test.describe("Library page", () => {
  test("renders the empty state, or the artifact grid if data/artifacts.json exists", async ({
    page,
  }) => {
    await page.goto("/library");
    await expect(page.getByRole("heading", { name: "Library" })).toBeVisible();

    const emptyState = page.getByText("No artifacts yet");
    const hasEmptyState = await emptyState.isVisible().catch(() => false);

    if (hasEmptyState) {
      await expect(
        page.getByText(
          "Generated memos, models, and board decks will land here.",
        ),
      ).toBeVisible();
      await expect(
        page.getByRole("link", { name: "Ask Faheem to prepare an IC memo" }),
      ).toBeVisible();
    } else {
      // artifacts.json is present (e.g. authored by T4.3) — cards render instead.
      await expect(page.getByText("Verified ·").first()).toBeVisible();
    }
  });
});

test.describe("Audit trail", () => {
  test("shows at least 20 seeded rows, newest first", async ({ page }) => {
    await page.goto("/audit");
    await expect(
      page.getByRole("heading", { name: "Audit trail" }),
    ).toBeVisible();

    const rows = page.locator('[role="row"]').filter({
      hasNot: page.locator('[role="columnheader"]'),
    });
    await expect
      .poll(async () => rows.count(), { timeout: 10_000 })
      .toBeGreaterThanOrEqual(20);
  });

  test("keeps Western digits in the citations column when switching to Arabic", async ({
    page,
    context,
    baseURL,
  }) => {
    await page.goto("/audit");
    await context.addCookies([
      { name: "faheem_locale", value: "ar", url: baseURL },
    ]);
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");

    const rows = page.locator('[role="row"]').filter({
      hasNot: page.locator('[role="columnheader"]'),
    });
    await expect.poll(async () => rows.count()).toBeGreaterThanOrEqual(20);

    const rowsText = await rows.allInnerTexts();
    const hasArabicIndicDigit = rowsText.some((t) => /[٠-٩]/.test(t));
    expect(hasArabicIndicDigit).toBe(false);
    expect(rowsText.some((t) => /[0-9]/.test(t))).toBe(true);
  });
});
