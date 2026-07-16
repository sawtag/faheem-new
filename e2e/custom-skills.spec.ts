import { expect, test, type Route } from "@playwright/test";
import { clickUntil, readAudit } from "./helpers";

/**
 * Custom skills acceptance: the Skills page's user-created playbook grid
 * (Add dialog, category picker, Enhance/Undo wand on the Run prefill,
 * delete) plus the audit trail entries the create/delete round-trip
 * appends. The Enhance call is intercepted deterministically (page.route);
 * this is not a live-model test, it only proves the wand→textarea→undo
 * wiring, same convention as e2e/agents.spec.ts's Enhance beat. Reuses
 * `/api/improve` (the composer's Improve route), not a dedicated endpoint.
 */
const SKILL_DESCRIPTION = "Flags unusual swings in working-capital line items.";
const SKILL_PREFILL =
  "Walk through the working-capital movements for this deal and flag anything unusual.";
const ENHANCED_TEXT =
  "Analyze the working-capital movements for this deal across the last four quarters: isolate swings in receivables, payables, and inventory, and flag anything that deviates from the historical pattern with a cited source.";

// Per-viewport unique identity: the two Playwright projects run this spec
// concurrently against ONE shared data/custom-skills.json, so a shared name
// would collide (the store suffixes the duplicate slug with -2 and each test
// would assert against, and delete, the other viewport's skill). The id
// mirrors lib/custom-skills.ts's slugify().
function skillIdentity(projectName: string) {
  const suffix = projectName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return {
    name: `QA Playwright Skill ${projectName}`,
    id: `custom-qa-playwright-skill-${suffix}`,
  };
}

test.beforeEach(async ({ context, baseURL }) => {
  await context.addCookies([
    { name: "faheem_session", value: "e2e-skills", url: baseURL },
  ]);
});

// Safety-net: if a test fails mid-flow (e.g. after Create but before the
// delete step), remove the skill it created so data/custom-skills.json is
// left exactly as this spec found it, regardless of pass/fail.
test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status !== testInfo.expectedStatus) {
    await page.request
      .delete("/api/skills", {
        data: { id: skillIdentity(testInfo.project.name).id },
        headers: { "content-type": "application/json" },
      })
      .catch(() => undefined);
  }
});

test.describe("Skills: custom skill creation", () => {
  test("add → enhance → create → edit → toggle → filter → run → delete, with audit entries", async ({
    page,
  }, testInfo) => {
    const { name: skillName, id: createdId } = skillIdentity(
      testInfo.project.name,
    );
    await page.goto("/skills");
    await expect(page.getByRole("heading", { name: "Skills" })).toBeVisible();

    // open the dialog
    const addTile = page.getByTestId("add-skill-tile");
    await clickUntil(addTile, async () => {
      await expect(page.getByTestId("add-skill-dialog")).toBeVisible();
    });
    const dialog = page.getByTestId("add-skill-dialog");

    // fill the form
    await dialog.getByTestId("skill-name-input").fill(skillName);
    await dialog.getByTestId("skill-category-diligence").click();
    await dialog.getByTestId("skill-description-input").fill(SKILL_DESCRIPTION);
    const prefill = dialog.getByTestId("skill-prefill-input");
    await prefill.fill(SKILL_PREFILL);

    // intercept the enhance call deterministically (reuses /api/improve)
    let improveCalls = 0;
    await page.route("**/api/improve", async (route: Route) => {
      improveCalls += 1;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ improved: ENHANCED_TEXT }),
      });
    });

    // Enhance → textarea shows the fulfilled text, box shows the accent wash
    const enhanceButton = dialog.getByTestId("skill-enhance-button");
    await clickUntil(enhanceButton, async () => {
      await expect(prefill).toHaveValue(ENHANCED_TEXT);
    });
    expect(improveCalls).toBeGreaterThanOrEqual(1);

    // Undo restores the pre-enhance draft
    const undoButton = dialog.getByRole("button", { name: "Undo" });
    await clickUntil(undoButton, async () => {
      await expect(prefill).toHaveValue(SKILL_PREFILL);
    });

    // re-Enhance so the created skill carries the enhanced prefill for the
    // Run assertion below
    await clickUntil(dialog.getByTestId("skill-enhance-button"), async () => {
      await expect(prefill).toHaveValue(ENHANCED_TEXT);
    });

    // Create → dialog closes, card appears with name + Custom badge
    const before = readAudit().length;
    const createButton = dialog.getByTestId("skill-create-button");
    const card = page.getByTestId(`skill-card-${createdId}`);
    await clickUntil(createButton, async () => {
      await expect(card).toBeVisible();
    });
    await expect(page.getByTestId("add-skill-dialog")).toBeHidden();
    await expect(card).toContainText(skillName);
    await expect(card).toContainText("Custom");

    await expect
      .poll(
        () =>
          readAudit().some(
            (e) =>
              e.action === "skill-created" &&
              (e.question ?? "").includes(skillName),
          ),
        { timeout: 10_000 },
      )
      .toBe(true);
    expect(readAudit().length).toBeGreaterThan(before);

    // …and renders on the /audit page
    await page.goto("/audit");
    await expect(page.getByText("Skill created").first()).toBeVisible();

    // edit in place: new description saves via PATCH and lands on the card
    await page.goto("/skills");
    const editedDescription = `Edited description for ${testInfo.project.name}.`;
    await clickUntil(
      page.getByTestId(`custom-skill-edit-${createdId}`),
      async () => {
        await expect(page.getByTestId("add-skill-dialog")).toBeVisible();
      },
    );
    const editDialog = page.getByTestId("add-skill-dialog");
    await expect(editDialog.getByTestId("skill-name-input")).toHaveValue(
      skillName,
    );
    await editDialog
      .getByTestId("skill-description-input")
      .fill(editedDescription);
    await clickUntil(
      editDialog.getByTestId("skill-create-button"),
      async () => {
        await expect(page.getByTestId("add-skill-dialog")).toBeHidden();
      },
    );
    await expect(page.getByTestId(`skill-card-${createdId}`)).toContainText(
      editedDescription,
    );
    await expect
      .poll(
        () =>
          readAudit().some(
            (e) =>
              e.action === "skill-updated" &&
              (e.question ?? "").includes(skillName),
          ),
        { timeout: 10_000 },
      )
      .toBe(true);

    // toggle off: card dims, and the enabled flag persists across a reload
    const skillCard = page.getByTestId(`skill-card-${createdId}`);
    await page.getByTestId(`custom-skill-toggle-${createdId}`).click();
    await expect(skillCard).toHaveAttribute("data-dimmed", "true");
    await expect
      .poll(
        () =>
          readAudit().some(
            (e) =>
              e.action === "skill-toggled" &&
              (e.question ?? "").includes(`${skillName} · disabled`),
          ),
        { timeout: 10_000 },
      )
      .toBe(true);
    await page.reload();
    await expect(page.getByTestId(`skill-card-${createdId}`)).toHaveAttribute(
      "data-dimmed",
      "true",
    );
    await page.getByTestId(`custom-skill-toggle-${createdId}`).click();
    await expect(page.getByTestId(`skill-card-${createdId}`)).toHaveAttribute(
      "data-dimmed",
      "false",
    );

    // category filter: "diligence" keeps the card, another category hides
    // it (add tile stays visible either way), back to All restores it
    await page.goto("/skills");
    await page.getByRole("button", { name: "Diligence", exact: true }).click();
    await expect(page.getByTestId(`skill-card-${createdId}`)).toBeVisible();
    await expect(page.getByTestId("add-skill-tile")).toBeVisible();

    await page.getByRole("button", { name: "Valuation", exact: true }).click();
    await expect(page.getByTestId(`skill-card-${createdId}`)).toHaveCount(0);
    await expect(page.getByTestId("add-skill-tile")).toBeVisible();

    await page.getByRole("button", { name: "All", exact: true }).click();
    await expect(page.getByTestId(`skill-card-${createdId}`)).toBeVisible();

    // Run → lands on a fresh firm-context chat with the prefill pre-filled
    await page.getByTestId(`custom-skill-run-${createdId}`).click();
    await page.waitForURL(/\/chat\/new\?context=firm/);
    const box = page.getByRole("textbox");
    await expect(box).toHaveValue(ENHANCED_TEXT);

    // delete it → card gone, audit grows again
    await page.goto("/skills");
    const deleteButton = page.getByTestId(`custom-skill-delete-${createdId}`);
    await clickUntil(deleteButton, async () => {
      await expect(page.getByTestId(`skill-card-${createdId}`)).toHaveCount(0);
    });

    await expect
      .poll(
        () =>
          readAudit().some(
            (e) =>
              e.action === "skill-deleted" &&
              (e.question ?? "").includes(skillName),
          ),
        { timeout: 10_000 },
      )
      .toBe(true);
  });

  test("Lunar seeds carry their badge, and Copy seeds the dialog without mutating", async ({
    page,
  }) => {
    await page.goto("/skills");
    const seed = page.getByTestId("skill-card-custom-lunar-ic-charter-screen");
    await expect(seed).toBeVisible();
    await expect(seed).toContainText("Lunar");

    // copy a Lunar seed: dialog opens pre-seeded as "<name> (copy)", cancel
    // leaves the store untouched (read-only beat, safe across viewports)
    await clickUntil(
      page.getByTestId("custom-skill-copy-custom-lunar-ic-charter-screen"),
      async () => {
        await expect(page.getByTestId("add-skill-dialog")).toBeVisible();
      },
    );
    const dialog = page.getByTestId("add-skill-dialog");
    await expect(dialog.getByTestId("skill-name-input")).toHaveValue(
      "IC Charter Quick Screen (copy)",
    );
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(dialog).toBeHidden();

    // built-in registry cards stay immutable: copy only, never edit/delete
    const builtIn = page.getByTestId("skill-card-dcf-fcff");
    await expect(builtIn).toBeVisible();
    await expect(page.getByTestId("skill-copy-dcf-fcff")).toBeVisible();
    await expect(builtIn.locator('[data-testid^="custom-skill-"]')).toHaveCount(
      0,
    );
  });
});
