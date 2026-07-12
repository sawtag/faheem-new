import { expect, test } from "@playwright/test";

test("home page loads clean and defaults to ltr", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));

  const response = await page.goto("/");
  expect(response?.ok()).toBe(true);
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
  expect(consoleErrors).toEqual([]);
});

test("faheem_locale=ar cookie flips the document to rtl", async ({
  page,
  context,
  baseURL,
}) => {
  await page.goto("/");
  await context.addCookies([
    { name: "faheem_locale", value: "ar", url: baseURL },
  ]);
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.locator("html")).toHaveAttribute("lang", "ar");
});
