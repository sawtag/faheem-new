import { expect, test, type Page } from "@playwright/test";

/**
 * T3.5 acceptance (plan §T3.5), updated for the Data Sources restructure: the
 * page sections by group (Internal · External · Broker Research), each with an
 * Activated / Available split; the "Add source" modal opens/validates/accepts a
 * URL through its MCP path; and the fake OAuth flow ends with the connector
 * shown as Connected. Auth middleware may or may not exist yet (parallel task),
 * setting the session cookie up front makes this spec pass either way.
 *
 * The onboarding takeover itself (welcome -> steps -> assemble -> complete,
 * ONBOARDING_BRIEF.md) is covered end-to-end in e2e/onboarding.spec.ts; the
 * immediate-stepper coverage that used to live here was superseded when
 * /onboarding became a welcome-first full-screen takeover.
 */
test.beforeEach(async ({ context, baseURL }) => {
  await context.addCookies([
    { name: "faheem_session", value: "e2e", url: baseURL },
  ]);
});

function assertNoConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

test.describe("Data Sources page", () => {
  test("renders the three group sections with the Activated/Available split, clean console", async ({
    page,
  }) => {
    const errors = assertNoConsoleErrors(page);
    const response = await page.goto("/connections");
    expect(response?.ok()).toBe(true);

    await expect(
      page.getByRole("heading", { name: "Data Sources", level: 1 }),
    ).toBeVisible();

    // Three group sections, in order (Internal, External, Broker Research).
    await expect(page.getByRole("heading", { level: 2 })).toHaveText([
      "Internal",
      "External",
      "Broker Research",
    ]);

    // Both subsection labels are present (every section has an activated entry).
    await expect(
      page.getByRole("heading", { name: "Activated" }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Available to connect" }).first(),
    ).toBeVisible();

    await expect(
      page.locator(".min-h-16", { hasText: "Saudi Exchange Disclosures" }),
    ).toBeVisible();
    await expect(
      page.locator(".min-h-16", { hasText: "Bloomberg" }),
    ).toBeVisible();

    // SAHMK is live (the composer picker treats it as a connected source), and
    // it carries an API type chip.
    const sahmkRow = page.locator(".min-h-16", { hasText: "SAHMK API" });
    await expect(
      sahmkRow.getByText("Connected", { exact: true }),
    ).toBeVisible();

    // The type chip renders per row (Bloomberg is an API source).
    await expect(
      page
        .locator(".min-h-16", { hasText: "Bloomberg" })
        .getByText("API", { exact: true }),
    ).toBeVisible();

    // Broker Research now has an activated entry: Alinma Capital Research.
    const alinmaRow = page.locator(".min-h-16", { hasText: "Alinma Capital" });
    await expect(
      alinmaRow.getByText("Connected", { exact: true }),
    ).toBeVisible();

    const bloombergRow = page.locator(".min-h-16", { hasText: "Bloomberg" });
    await expect(
      bloombergRow.getByRole("button", { name: "Connect" }),
    ).toBeVisible();

    expect(errors).toEqual([]);
  });

  test("search narrows the catalog and offers 'Add source' when nothing matches", async ({
    page,
  }) => {
    await page.goto("/connections");
    const search = page.getByPlaceholder("Search connectors…");
    await search.fill("bloomberg");
    await expect(
      page.locator(".min-h-16", { hasText: "Bloomberg" }),
    ).toBeVisible();
    await expect(page.locator(".min-h-16", { hasText: "Argaam" })).toHaveCount(
      0,
    );

    await search.fill("zzz-no-such-connector");
    await expect(
      page.getByText("No connectors match 'zzz-no-such-connector'"),
    ).toBeVisible();
  });

  test("Add source modal (MCP path) rejects an invalid URL and accepts a valid one", async ({
    page,
  }) => {
    await page.goto("/connections");
    await page.getByRole("button", { name: "Add source" }).first().click();

    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("Add a data source")).toBeVisible();
    // MCP is the default selected type, so the wizard form is shown.
    await dialog.getByLabel("Name").fill("Lunar Portfolio DB");
    const urlInput = dialog.getByLabel("Remote server URL");
    await urlInput.fill("not-a-url");
    await urlInput.blur();
    await expect(dialog.getByText("Enter a valid HTTPS URL")).toBeVisible();

    await urlInput.fill("https://mcp.internal.lunar.sa");
    await dialog.getByRole("button", { name: "Add connector" }).click();

    await expect(dialog).toBeHidden();
    await expect(
      page.locator(".min-h-16", { hasText: "Lunar Portfolio DB" }),
    ).toBeVisible();
  });

  test("Add source modal shows an MVP-roadmap note for non-MCP types", async ({
    page,
  }) => {
    await page.goto("/connections");
    await page.getByRole("button", { name: "Add source" }).first().click();

    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "Feed" }).click();
    await expect(dialog.getByText(/MVP roadmap/i)).toBeVisible();
    await expect(
      dialog.getByRole("button", { name: "Add connector" }),
    ).toBeDisabled();
  });

  test("fake OAuth flow ends with the connector shown as Connected", async ({
    page,
  }) => {
    await page.goto("/connections");
    const bloombergRow = page.locator(".min-h-16", { hasText: "Bloomberg" });
    await bloombergRow.getByRole("button", { name: "Connect" }).click();

    const dialog = page.getByRole("dialog");
    await expect(
      dialog.getByText("Faheem will get read-only access"),
    ).toBeVisible();
    await dialog.getByRole("button", { name: "Authorize" }).click();

    await expect(
      dialog.getByText("Establishing secure connection…"),
    ).toBeVisible();
    await expect(dialog.getByText("Connected", { exact: true })).toBeVisible({
      timeout: 3000,
    });
    await expect(dialog).toBeHidden({ timeout: 3000 });

    await expect(
      bloombergRow.getByRole("button", { name: "Configure" }),
    ).toBeVisible();
    await expect(
      bloombergRow.getByText("Connected", { exact: true }),
    ).toBeVisible();
  });
});
