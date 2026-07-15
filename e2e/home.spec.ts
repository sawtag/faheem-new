import { expect, test } from "@playwright/test";

/**
 * T3.2 acceptance (plan §T3.2): the omnibox home. A quick-action pill prefills
 * the composer, submitting hands off to `/chat/new?q=…`, the quiet overnight-
 * activity line links to `/audit`, and the Arabic hero renders RTL with the
 * name in emerald. The session cookie is set up front so the auth middleware
 * lets `/` through.
 */
test.beforeEach(async ({ context, baseURL }) => {
  await context.addCookies([
    { name: "faheem_session", value: "e2e", url: baseURL },
  ]);
});

test("quick-action pill prefills the composer and focuses it", async ({
  page,
}) => {
  await page.goto("/");

  const box = page.getByRole("textbox");
  await expect(box).toHaveValue("");

  // click-until-effect: a click landing before hydration attaches the pill's
  // handler is silently lost under parallel dev-compile load
  await expect(async () => {
    await page.getByRole("button", { name: "Run DCF" }).click();
    // the full analyst prompt lands in the composer…
    await expect(box).toHaveValue(/Gordon terminal value/, { timeout: 1500 });
  }).toPass({ timeout: 20_000 });
  // …and it is focused, ready to send
  await expect(box).toBeFocused();
});

test("submitting the composer hands off to /chat/new?q=…", async ({ page }) => {
  await page.goto("/");

  const seen: string[] = [];
  page.on("framenavigated", (frame) => {
    if (frame === page.mainFrame()) seen.push(frame.url());
  });

  const box = page.getByRole("textbox");
  await box.fill("Summarize Jahez's FY2025 results");
  await box.press("Enter");

  // lands somewhere under /chat/, having gone THROUGH /chat/new?q=…
  await page.waitForURL(/\/chat\//);
  expect(seen.some((u) => /\/chat\/new\?q=/.test(u))).toBe(true);
});

test("the overnight-activity line renders and links to /audit", async ({
  page,
}) => {
  await page.goto("/");

  await expect(
    page.getByText("4 agent tasks completed overnight"),
  ).toBeVisible();

  const link = page.getByRole("link", { name: "View activity" });
  await expect(link).toHaveAttribute("href", "/audit");
  await link.click();

  await expect(page).toHaveURL(/\/audit$/);
});

test("ar locale renders the RTL hero with the name in emerald", async ({
  page,
  context,
  baseURL,
}) => {
  await context.addCookies([
    { name: "faheem_locale", value: "ar", url: baseURL },
  ]);
  await page.goto("/");

  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.locator("html")).toHaveAttribute("lang", "ar");

  const heading = page.getByRole("heading", { level: 1 });
  await expect(heading).toContainText("كيف يخدمك فهيم اليوم");

  // the two-tone treatment: the analyst's name is emerald (--color-accent #07966F)
  const name = heading.locator("span", { hasText: "علي" });
  await expect(name).toHaveCSS("color", "rgb(7, 150, 111)");
});
