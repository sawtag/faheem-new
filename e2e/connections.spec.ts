import { fileURLToPath } from "node:url";
import { expect, test, type Page } from "@playwright/test";

/**
 * T3.5 acceptance (plan §T3.5), updated for the Data Sources restructure: the
 * page sections by group (Internal · External · Broker Research), each with an
 * Activated / Available split; the "Add source" modal carries a working
 * add-flow for every type (MCP · API · Files · App · Feed); and the fake
 * OAuth flow ends with the connector shown as Connected. Auth middleware may
 * or may not exist yet (parallel task), setting the session cookie up front
 * makes this spec pass either way.
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

  test("API path: masked key with in-field copy + reveal, adds a typed connector", async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/connections");
    await page.getByRole("button", { name: "Add source" }).first().click();

    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "API", exact: true }).click();
    await dialog.getByLabel("Name").fill("Lunar Prices API");
    await dialog.getByLabel("Base URL").fill("https://api.internal.lunar.sa");

    const key = dialog.getByLabel("API key");
    await key.fill("sk_lunar_demo_0000");
    await expect(key).toHaveAttribute("type", "password");
    await dialog.getByRole("button", { name: "Show" }).click();
    await expect(key).toHaveAttribute("type", "text");

    await dialog.getByRole("button", { name: "Copy" }).click();
    await expect(dialog.getByRole("button", { name: "Copied" })).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
      "sk_lunar_demo_0000",
    );

    await dialog.getByRole("button", { name: "Add connector" }).click();
    await expect(dialog).toBeHidden();
    const row = page.locator(".min-h-16", { hasText: "Lunar Prices API" });
    await expect(row).toBeVisible();
    await expect(row.getByText("API", { exact: true })).toBeVisible();
  });

  test("Files path: folder upload through the system picker auto-names the source", async ({
    page,
  }) => {
    await page.goto("/connections");
    await page.getByRole("button", { name: "Add source" }).first().click();

    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "Files", exact: true }).click();
    await expect(
      dialog.getByRole("button", { name: "Choose folder…" }),
    ).toBeVisible();

    // Playwright feeds the directory straight into the hidden webkitdirectory
    // input, standing in for the OS folder picker.
    await dialog
      .locator('input[type="file"]')
      .setInputFiles(
        fileURLToPath(new URL("./fixtures/deal-folder", import.meta.url)),
      );
    await expect(dialog.getByText(/deal-folder · 2 files/)).toBeVisible();
    await expect(dialog.getByLabel("Name")).toHaveValue("deal-folder");

    await dialog.getByRole("button", { name: "Add connector" }).click();
    await expect(dialog).toBeHidden();
    const row = page.locator(".min-h-16", { hasText: "deal-folder" });
    await expect(row).toBeVisible();
    await expect(row.getByText("Files", { exact: true })).toBeVisible();
  });

  test("Files path: an SMB network path requires read-only credentials", async ({
    page,
  }) => {
    await page.goto("/connections");
    await page.getByRole("button", { name: "Add source" }).first().click();

    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "Files", exact: true }).click();
    await dialog.getByRole("button", { name: "Network path" }).click();

    const path = dialog.getByLabel("Folder URL or network path");
    await path.fill("ftp://fileserver/deals");
    await path.blur();
    await expect(
      dialog.getByText("Enter an HTTPS URL or an SMB path"),
    ).toBeVisible();

    await path.fill("smb://fileserver.lunar.sa/deals");
    await expect(dialog.getByText(/SMB network share/)).toBeVisible();
    const pass = dialog.getByLabel("Password");
    await expect(pass).toHaveAttribute("type", "password");

    // Credentials are required for SMB: submitting without them keeps the
    // dialog open. ("Name" must be exact: it substring-matches "Username".)
    await dialog.getByLabel("Name", { exact: true }).fill("Q3 Deal Files");
    await dialog.getByRole("button", { name: "Add connector" }).click();
    await expect(dialog).toBeVisible();

    await dialog.getByLabel("Username").fill("LUNAR\\ali");
    await pass.fill("read-only-secret");
    await dialog.getByRole("button", { name: "Add connector" }).click();
    await expect(dialog).toBeHidden();
    const row = page.locator(".min-h-16", { hasText: "Q3 Deal Files" });
    await expect(row).toBeVisible();
    await expect(row.getByText("Files", { exact: true })).toBeVisible();
  });

  test("Feed and App paths add typed connectors", async ({ page }) => {
    await page.goto("/connections");

    // Feed: URL + refresh cadence; a custom feed lands in External.
    await page.getByRole("button", { name: "Add source" }).first().click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "Feed", exact: true }).click();
    await dialog.getByLabel("Name").fill("Tadawul headlines");
    await dialog
      .getByLabel("Feed URL")
      .fill("https://feeds.argaam.com/markets.rss");
    await dialog.getByRole("button", { name: "Add connector" }).click();
    await expect(dialog).toBeHidden();
    const feedRow = page.locator(".min-h-16", { hasText: "Tadawul headlines" });
    await expect(feedRow).toBeVisible();
    await expect(feedRow.getByText("Feed", { exact: true })).toBeVisible();

    // App: workspace URL + the read-only access note.
    await page.getByRole("button", { name: "Add source" }).first().click();
    await dialog.getByRole("button", { name: "App", exact: true }).click();
    await expect(dialog.getByText(/read-only access/)).toBeVisible();
    await dialog.getByLabel("Name").fill("Lunar Slack");
    await dialog
      .getByLabel("Workspace URL")
      .fill("https://lunar-investments.slack.com");
    await dialog.getByRole("button", { name: "Add connector" }).click();
    await expect(dialog).toBeHidden();
    await expect(
      page.locator(".min-h-16", { hasText: "Lunar Slack" }),
    ).toBeVisible();
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
