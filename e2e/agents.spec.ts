import { expect, test, type Route } from "@playwright/test";
import { clickUntil, readAudit } from "./helpers";

/**
 * Custom agents acceptance: the Agents page's user-created roster (Add
 * dialog, Enhance wand + Undo, delete) plus the audit trail entries the
 * create/delete round-trip appends. The Enhance call is intercepted
 * deterministically (page.route); this is not a live-model test, it only
 * proves the wand→textarea→undo wiring, same convention as
 * e2e/model.spec.ts's conversational-edit beat.
 */
const AGENT_ROLE = "QA specialist";
const AGENT_DESCRIPTION =
  "Tests newly built product surfaces for regressions before every release train.";
const ENHANCED_TEXT =
  "You are a meticulous QA specialist for Faheem. You test new agent workflows end-to-end, verify UI states render correctly in both supported languages, and flag any regression before release. Your output is a short, evidence-led pass/fail note citing exactly what you checked. You never invent facts outside the given scope.";

// Per-viewport unique identity: the two Playwright projects run this spec
// concurrently against ONE shared data/custom-agents.json, so a shared name
// would collide (the store suffixes the duplicate slug with -2 and each test
// would assert against, and delete, the other viewport's agent). The id
// mirrors lib/custom-agents.ts's slugify().
function agentIdentity(projectName: string) {
  const suffix = projectName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return {
    name: `QA Playwright Agent ${projectName}`,
    id: `custom-qa-playwright-agent-${suffix}`,
  };
}

test.beforeEach(async ({ context, baseURL }) => {
  await context.addCookies([
    { name: "faheem_session", value: "e2e-agents", url: baseURL },
  ]);
});

// Safety-net: if a test fails mid-flow (e.g. after Create but before the
// delete step), remove the agent it created so data/custom-agents.json is
// left exactly as this spec found it, regardless of pass/fail.
test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status !== testInfo.expectedStatus) {
    await page.request
      .delete("/api/agents", {
        data: { id: agentIdentity(testInfo.project.name).id },
        headers: { "content-type": "application/json" },
      })
      .catch(() => undefined);
  }
});

test.describe("Agents: custom agent creation", () => {
  test("add → enhance → undo → re-enhance → create → delete, with audit entries", async ({
    page,
  }, testInfo) => {
    const { name: agentName, id: createdId } = agentIdentity(
      testInfo.project.name,
    );
    await page.goto("/agents");
    await expect(
      page.getByRole("heading", { name: "Your agents" }),
    ).toBeVisible();

    // open the dialog
    const addTile = page.getByTestId("add-agent-tile");
    await clickUntil(addTile, async () => {
      await expect(page.getByTestId("add-agent-dialog")).toBeVisible();
    });
    const dialog = page.getByTestId("add-agent-dialog");

    // fill the form
    await dialog.getByTestId("agent-name-input").fill(agentName);
    await dialog.getByTestId("agent-role-input").fill(AGENT_ROLE);
    const description = dialog.getByTestId("agent-description-input");
    await description.fill(AGENT_DESCRIPTION);

    // intercept the enhance call deterministically
    let enhanceCalls = 0;
    await page.route("**/api/agents/enhance", async (route: Route) => {
      enhanceCalls += 1;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ enhanced: ENHANCED_TEXT }),
      });
    });

    // Enhance → textarea shows the fulfilled text, box shows the accent wash
    const enhanceButton = dialog.getByTestId("agent-enhance-button");
    await clickUntil(enhanceButton, async () => {
      await expect(description).toHaveValue(ENHANCED_TEXT);
    });
    expect(enhanceCalls).toBeGreaterThanOrEqual(1);

    // Undo restores the pre-enhance draft
    const undoButton = dialog.getByRole("button", { name: "Undo" });
    await clickUntil(undoButton, async () => {
      await expect(description).toHaveValue(AGENT_DESCRIPTION);
    });

    // re-Enhance
    await clickUntil(dialog.getByTestId("agent-enhance-button"), async () => {
      await expect(description).toHaveValue(ENHANCED_TEXT);
    });

    // Create → dialog closes, card appears with name + Custom badge
    const before = readAudit().length;
    const createButton = dialog.getByTestId("agent-create-button");
    const card = page.getByTestId(`agent-card-${createdId}`);
    await clickUntil(createButton, async () => {
      await expect(card).toBeVisible();
    });
    await expect(page.getByTestId("add-agent-dialog")).toBeHidden();
    await expect(card).toContainText(agentName);
    await expect(card).toContainText("Custom");

    await expect
      .poll(
        () =>
          readAudit().some(
            (e) =>
              e.action === "agent-created" &&
              (e.question ?? "").includes(agentName),
          ),
        { timeout: 10_000 },
      )
      .toBe(true);
    expect(readAudit().length).toBeGreaterThan(before);

    // …and renders on the /audit page
    await page.goto("/audit");
    await expect(page.getByText("Agent created").first()).toBeVisible();

    // delete it → card gone, audit grows again
    await page.goto("/agents");
    const deleteButton = page.getByTestId(`custom-agent-delete-${createdId}`);
    await clickUntil(deleteButton, async () => {
      await expect(page.getByTestId(`agent-card-${createdId}`)).toHaveCount(0);
    });

    await expect
      .poll(
        () =>
          readAudit().some(
            (e) =>
              e.action === "agent-deleted" &&
              (e.question ?? "").includes(agentName),
          ),
        { timeout: 10_000 },
      )
      .toBe(true);
  });
});
