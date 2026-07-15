import { expect, test } from "@playwright/test";

/**
 * Enterprise-flourish acceptance: the workspace Share modal (chip on
 * Enter, role dropdown, success check then close), and the Scheduled Tasks
 * page (un-dimmed nav entry, 3 bilingual rows, cosmetic toggles).
 */
test.beforeEach(async ({ context, baseURL }) => {
  await context.addCookies([
    { name: "faheem_session", value: "e2e", url: baseURL },
  ]);
});

test.describe("Workspace share modal", () => {
  test("opens, adds a chip on Enter, switches role, and auto-closes after the success check", async ({
    page,
  }) => {
    await page.goto("/deals/jahez");

    await page.getByRole("button", { name: "Share" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("Share Jahez")).toBeVisible();
    await expect(dialog.getByText("Ali")).toBeVisible();
    await expect(dialog.getByText("Lunar IC Group")).toBeVisible();

    const recipient = dialog.getByPlaceholder(/press Enter/i);
    await recipient.fill("ali@lunar-inv.sa");
    await recipient.press("Enter");
    await expect(dialog.getByText("ali@lunar-inv.sa")).toBeVisible();
    await expect(recipient).toHaveValue("");

    await dialog.getByRole("button", { name: "Can view" }).click();
    await page.getByRole("menuitem", { name: "Can comment" }).click();
    await expect(
      dialog.getByRole("button", { name: "Can comment" }),
    ).toBeVisible();

    await dialog.getByRole("button", { name: "Share", exact: true }).click();
    await expect(dialog.getByText("Shared")).toBeVisible();
    await expect(dialog).toBeHidden({ timeout: 2000 });
  });
});

test.describe("Scheduled Tasks", () => {
  test("nav entry is no longer dimmed and links to /scheduled", async ({
    page,
  }) => {
    await page.goto("/");
    const link = page.getByRole("link", { name: "Scheduled Tasks" });
    await expect(link).toBeVisible();
    await link.click();
    await expect(page).toHaveURL(/\/scheduled$/);
  });

  test("renders 3 bilingual rows and toggles flip", async ({ page }) => {
    await page.goto("/scheduled");
    await expect(
      page.getByRole("heading", { name: "Scheduled Tasks" }),
    ).toBeVisible();

    const rows = page.getByTestId("scheduled-task-row");
    await expect(rows).toHaveCount(3);
    await expect(page.getByText("Jahez KPI digest")).toBeVisible();
    await expect(
      page.getByText("Quick-commerce news sweep (Keeta/HungerStation/Ninja)"),
    ).toBeVisible();
    await expect(
      page.getByText("Portfolio concentration check vs IC Charter caps"),
    ).toBeVisible();

    const firstToggle = page.getByRole("switch").first();
    await expect(firstToggle).toHaveAttribute("aria-checked", "true");
    await firstToggle.click();
    await expect(firstToggle).toHaveAttribute("aria-checked", "false");
  });

  test("ar locale renders bilingual copy and rtl-flips the schedule arrow", async ({
    page,
    context,
    baseURL,
  }) => {
    await context.addCookies([
      { name: "faheem_locale", value: "ar", url: baseURL },
    ]);
    await page.goto("/scheduled");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(
      page.getByRole("heading", { name: "المهام المجدولة" }),
    ).toBeVisible();
    await expect(page.getByText("ملخص مؤشرات أداء جاهز")).toBeVisible();
    await expect(page.getByTestId("scheduled-task-row")).toHaveCount(3);
  });
});
