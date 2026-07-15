import { expect, test } from "@playwright/test";

test.describe("login", () => {
  test("unauthenticated visit to / redirects to /login", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.ok()).toBe(true);
    await expect(page).toHaveURL(/\/login$/);
  });

  test("submitting non-empty credentials signs in and lands on /", async ({
    page,
    context,
  }) => {
    await page.goto("/login");
    await page.getByLabel(/username/i).fill("ali");
    await page.getByLabel(/password/i).fill("demo");
    await page.getByRole("button", { name: /sign in/i }).click();

    await expect(page).toHaveURL("/");
    const cookies = await context.cookies();
    expect(cookies.some((c) => c.name === "faheem_session")).toBe(true);
  });

  test("empty submit shows an inline error and does not redirect", async ({
    page,
  }) => {
    await page.goto("/login");

    // click-until-effect: a click landing before hydration attaches the
    // form's client-side validation is silently lost under parallel load
    await expect(async () => {
      await page.getByRole("button", { name: /sign in/i }).click();
      await expect(
        page.getByText("Enter your username and password"),
      ).toBeVisible({ timeout: 1500 });
    }).toPass({ timeout: 20_000 });
    await expect(page).toHaveURL(/\/login$/);
  });

  test("ar locale renders rtl with the Arabic heading", async ({
    page,
    context,
    baseURL,
  }) => {
    await context.addCookies([
      { name: "faheem_locale", value: "ar", url: baseURL },
    ]);
    await page.goto("/login");

    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(
      page.getByRole("heading", { name: "تسجيل الدخول إلى فهيم" }),
    ).toBeVisible();
  });
});
