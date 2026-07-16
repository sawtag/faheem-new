import { expect, test } from "@playwright/test";
import { clickUntil, collectConsoleErrors } from "./helpers";

/**
 * Task E acceptance (ONBOARDING_BRIEF.md): the day-one onboarding takeover,
 * the full welcome -> steps(0..2) -> assemble -> complete state machine,
 * driven end-to-end from the home setup card through "Enter workspace".
 * Supersedes the old immediate-stepper coverage that used to live in
 * connections.spec.ts (that page has been reworked into a welcome-first
 * takeover, see onboarding-flow.tsx).
 */
test.beforeEach(async ({ context, baseURL }) => {
  await context.addCookies([
    { name: "faheem_session", value: "e2e", url: baseURL },
  ]);
});

test("home shows the setup card, dismiss X hides it on a fresh session", async ({
  page,
}) => {
  await page.goto("/");

  const setupCard = page.getByText("Set up your workspace");
  await expect(setupCard).toBeVisible();

  await page.getByRole("button", { name: "Dismiss setup" }).click();

  await expect(setupCard).not.toBeVisible();
});

test("full day-one takeover: home -> welcome -> connect -> agents -> mandate -> assemble -> complete -> home", async ({
  page,
}) => {
  const errors = collectConsoleErrors(page);

  await test.step("home: Start setup", async () => {
    await page.goto("/");
    await clickUntil(page.getByRole("link", { name: "Start setup" }), () =>
      expect(page).toHaveURL("/onboarding", { timeout: 3000 }),
    );
  });

  await test.step("welcome renders, no sidebar nav", async () => {
    await expect(page.getByText("Welcome to Faheem")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /Lunar Investments/ }),
    ).toBeVisible();
    // the takeover sits outside the app shell: no sidebar <nav>
    await expect(page.locator("nav")).toHaveCount(0);
    await page.getByRole("button", { name: "Begin setup" }).click();
  });

  await test.step("step 1, Connect: three group sections + live counter", async () => {
    await expect(page.getByText("Step 1 of 3")).toBeVisible();
    await expect(page.getByText("External market data")).toBeVisible();
    await expect(page.getByText("Broker research")).toBeVisible();
    await expect(page.getByText("Internal systems")).toBeVisible();
    await expect(page.getByText(/of \d+ systems connected/)).toBeVisible();
  });

  const total =
    await test.step("connect one connector via the OAuth modal", async () => {
      const totalText = await page
        .getByText(/of \d+ systems connected/)
        .innerText();
      const total = Number(totalText.match(/of (\d+) systems/)?.[1]);
      expect(total).toBeGreaterThan(0);

      // ".rounded-card" also matches the big outer step Card wrapping the
      // whole grid (it too contains "Bloomberg" text somewhere in its
      // subtree), so take the LAST match, the innermost, most specific card.
      const bloombergRow = page
        .locator(".rounded-card", { hasText: "Bloomberg" })
        .last();
      await bloombergRow.getByRole("button", { name: "Connect" }).click();

      const dialog = page.getByRole("dialog");
      await dialog.getByRole("button", { name: "Authorize" }).click();
      await expect(dialog).toBeHidden({ timeout: 3000 });
      // the onboarding wizard card swaps the Connect button for a bare check
      // (no "Connected" text like the Connections page row), so assert the
      // button is gone and the live counter advanced instead.
      await expect(
        bloombergRow.getByRole("button", { name: "Connect" }),
      ).toHaveCount(0);
      return total;
    });

  await test.step("Connect recommended: counter reaches the total", async () => {
    await page.getByRole("button", { name: "Connect recommended" }).click();
    await expect(
      page.getByText(`${total} of ${total} systems connected`),
    ).toBeVisible({
      timeout: 5000,
    });
    await expect(
      page.getByRole("button", { name: "Connect recommended" }),
    ).toHaveCount(0);
    await page.getByRole("button", { name: "Continue" }).click();
  });

  await test.step("step 2, Agents: registry-driven grid", async () => {
    await expect(page.getByText("Step 2 of 3")).toBeVisible();
    await expect(page.getByText("Screening Agent")).toBeVisible();
    await page.getByRole("button", { name: "Continue" }).click();
  });

  await test.step("step 3, Mandate: defaults are valid", async () => {
    await expect(page.getByText("Step 3 of 3")).toBeVisible();
    await expect(page.getByLabel("Target IRR benchmark")).toHaveValue("15");
    await page.getByRole("button", { name: "Create IC Charter" }).click();
  });

  await test.step("assemble: stages appear and complete", async () => {
    await expect(page.getByText("Assembling your workspace")).toBeVisible();
    await expect(page.getByText(/Indexing \d+ documents/)).toBeVisible();
    // full choreography is ~3.5s (assemble-panel.tsx), the completion card
    // follows automatically with no user action
    await expect(
      page.getByRole("heading", { name: "Your IC Charter is ready" }),
    ).toBeVisible({ timeout: 8000 });
  });

  await test.step("complete: four stats, Enter workspace", async () => {
    await expect(page.getByText("Systems connected")).toBeVisible();
    await expect(page.getByText("Documents indexed")).toBeVisible();
    await expect(page.getByText("Pages indexed")).toBeVisible();
    await expect(page.getByText("Agents active")).toBeVisible();

    await clickUntil(page.getByRole("link", { name: "Enter workspace" }), () =>
      expect(page).toHaveURL("/", { timeout: 3000 }),
    );
  });

  await test.step("home: setup card is gone", async () => {
    await expect(page.getByText("Set up your workspace")).not.toBeVisible();
  });

  expect(errors).toEqual([]);
});
