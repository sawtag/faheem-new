import { expect, test, type Page } from "@playwright/test";

/**
 * T3.5 acceptance (plan §T3.5): the onboarding stepper completes end-to-end,
 * the "Add custom MCP" modal opens/validates/accepts a URL, and the fake
 * OAuth modal flow ends with the connector shown as Connected. Auth
 * middleware may or may not exist yet (parallel task) — setting the session
 * cookie up front makes this spec pass either way.
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

test.describe("Connections page", () => {
  test("renders the Connected and Available catalog, clean console", async ({
    page,
  }) => {
    const errors = assertNoConsoleErrors(page);
    const response = await page.goto("/connections");
    expect(response?.ok()).toBe(true);

    await expect(
      page.getByRole("heading", { name: "Connections", level: 1 }),
    ).toBeVisible();
    await expect(
      page.locator(".min-h-16", { hasText: "Saudi Exchange Disclosures" }),
    ).toBeVisible();
    await expect(
      page.locator(".min-h-16", { hasText: "Argaam" }),
    ).toBeVisible();
    await expect(
      page.locator(".min-h-16", { hasText: "Bloomberg" }),
    ).toBeVisible();

    const sahmkRow = page.locator(".min-h-16", { hasText: "SAHMK API" });
    await expect(
      sahmkRow.getByRole("button", { name: "Connect" }),
    ).toBeVisible();

    expect(errors).toEqual([]);
  });

  test("search narrows the catalog and offers 'Add custom MCP' when nothing matches", async ({
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

  test("Add custom MCP modal rejects an invalid URL and accepts a valid one", async ({
    page,
  }) => {
    await page.goto("/connections");
    await page.getByRole("button", { name: "Add custom MCP" }).first().click();

    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("Add custom MCP connector")).toBeVisible();

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

  test("fake OAuth flow ends with the connector shown as Connected", async ({
    page,
  }) => {
    await page.goto("/connections");
    const sahmkRow = page.locator(".min-h-16", { hasText: "SAHMK API" });
    await sahmkRow.getByRole("button", { name: "Connect" }).click();

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
      sahmkRow.getByRole("button", { name: "Configure" }),
    ).toBeVisible();
    await expect(
      sahmkRow.getByText("Connected", { exact: true }),
    ).toBeVisible();
  });
});

test.describe("Onboarding stepper", () => {
  test("completes end-to-end: Connect -> Agents & skills -> Mandate -> IC Charter", async ({
    page,
  }) => {
    const errors = assertNoConsoleErrors(page);
    await page.goto("/onboarding");

    await expect(
      page.getByRole("heading", { name: "Connect & Configure" }),
    ).toBeVisible();
    await expect(page.getByText("Step 1 of 3")).toBeVisible();

    // Step 1 — Connect: pre-connected rows show a check, others show Connect,
    // and the dashed "Add custom MCP" card is the last grid cell.
    await expect(page.getByText("Lunar Data Room")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Add custom MCP" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Continue" }).click();

    // Step 2 — Agents & skills: registry-driven toggle grid, default ON.
    await expect(page.getByText("Step 2 of 3")).toBeVisible();
    await expect(page.getByText("Screening Agent")).toBeVisible();
    await expect(page.getByText("@screening")).toBeVisible();
    const firstToggle = page.getByRole("switch").first();
    await expect(firstToggle).toHaveAttribute("aria-checked", "true");
    await page.getByRole("button", { name: "Continue" }).click();

    // Step 3 — Mandate & risk: prefilled to Lunar's real mandate values.
    await expect(page.getByText("Step 3 of 3")).toBeVisible();
    await expect(page.getByLabel("Target IRR hurdle")).toHaveValue("15");
    await expect(page.getByLabel("Max single-name concentration")).toHaveValue(
      "10",
    );
    await page.getByRole("button", { name: "Create IC Charter" }).click();

    // Completion card — the closing "this becomes your IC Charter" beat.
    await expect(
      page.getByRole("heading", { name: "Your IC Charter is ready" }),
    ).toBeVisible();
    const charterLink = page.getByRole("link", {
      name: "Open IC Charter (PDF)",
    });
    await expect(charterLink).toHaveAttribute(
      "href",
      "/api/documents/lunar-ic-charter",
    );
    await expect(
      page.getByRole("link", { name: "Go to Home" }),
    ).toHaveAttribute("href", "/");

    expect(errors).toEqual([]);
  });

  test("Back navigates to the previous step without losing Connect state", async ({
    page,
  }) => {
    await page.goto("/onboarding");
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByText("Step 2 of 3")).toBeVisible();

    await page.getByRole("button", { name: "Back" }).click();
    await expect(page.getByText("Step 1 of 3")).toBeVisible();
    await expect(page.getByText("Lunar Data Room")).toBeVisible();
  });
});
