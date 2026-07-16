import { expect, test } from "@playwright/test";

/**
 * Agent roster toggles: the only interaction the Agents page offers (the
 * orchestrator picks agents per prompt, so a toggle is a persisted roster
 * preference, never a routing switch). Persistence is localStorage-backed,
 * so it must survive a full reload.
 */
test.beforeEach(async ({ context, baseURL }) => {
  await context.addCookies([
    { name: "faheem_session", value: "e2e-agents", url: baseURL },
  ]);
});

test("a specialist toggle dims the card and persists across reload", async ({
  page,
}) => {
  await page.goto("/agents");
  const card = page.getByTestId("agent-card-valuation");
  await expect(card).toBeVisible();
  await expect(card).toHaveAttribute("data-dimmed", "false");

  const toggle = page.getByRole("switch", { name: "Valuation & Modeling" });
  await toggle.click();
  await expect(card).toHaveAttribute("data-dimmed", "true");

  await page.reload();
  await expect(page.getByTestId("agent-card-valuation")).toHaveAttribute(
    "data-dimmed",
    "true",
  );

  await page.getByRole("switch", { name: "Valuation & Modeling" }).click();
  await expect(page.getByTestId("agent-card-valuation")).toHaveAttribute(
    "data-dimmed",
    "false",
  );

  await page.reload();
  await expect(page.getByTestId("agent-card-valuation")).toHaveAttribute(
    "data-dimmed",
    "false",
  );
});

test("no create, edit, or delete affordance exists on the roster", async ({
  page,
}) => {
  await page.goto("/agents");
  await expect(page.getByTestId("agent-card-valuation")).toBeVisible();
  await expect(page.getByTestId("add-agent-tile")).toHaveCount(0);
  await expect(page.locator('[data-testid^="custom-agent-"]')).toHaveCount(0);
});
