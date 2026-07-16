import { expect, test } from "@playwright/test";

/**
 * /settings (settings spec, 2026-07-16): the answer-engine switch writes the
 * `faheem_mode` cookie the chat route re-reads per request; reset clears the
 * override. The e2e app runs with FAHEEM_MODE=cached, so the environment
 * default is Cached. `faheem_session` satisfies the auth gate.
 */
test.beforeEach(async ({ context, baseURL }) => {
  await context.addCookies([
    { name: "faheem_session", value: "e2e-settings", url: baseURL },
  ]);
});

test.describe("settings", () => {
  test("sidebar General routes to /settings with the three mode cards", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "General" }).click();

    await expect(page).toHaveURL(/\/settings$/);
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
    await expect(page.getByRole("radio")).toHaveCount(3);
    // environment tiles render their facts
    await expect(page.getByText("Recorded answers")).toBeVisible();
    await expect(page.getByText("Corpus documents")).toBeVisible();
  });

  test("mode switch writes the cookie; reset clears the override", async ({
    page,
    context,
  }) => {
    await page.goto("/settings");

    await page.getByRole("radio", { name: /^Live/ }).click();
    await expect(page.getByText("Effective mode: Live")).toBeVisible();
    await expect(page.getByText("your override")).toBeVisible();
    let cookies = await context.cookies();
    expect(cookies.find((c) => c.name === "faheem_mode")?.value).toBe("live");

    await page
      .getByRole("button", { name: "Reset to environment default" })
      .click();
    await expect(page.getByText("environment default")).toBeVisible();
    cookies = await context.cookies();
    expect(cookies.find((c) => c.name === "faheem_mode")).toBeUndefined();
  });

  test("ar locale renders the settings page rtl", async ({
    page,
    context,
    baseURL,
  }) => {
    await context.addCookies([
      { name: "faheem_locale", value: "ar", url: baseURL },
    ]);
    await page.goto("/settings");

    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(
      page.getByRole("heading", { name: "الإعدادات" }),
    ).toBeVisible();
  });
});
