import fs from "node:fs";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { expect, test } from "@playwright/test";
import { clickUntil, readAudit } from "./helpers";

/**
 * Company template ("tagged template") acceptance — Library page's upload /
 * tag-catalog / replace / remove flow.
 *
 * IMPORTANT: the template slot is SINGLE and shared (data/company-template.json
 * + data/company-template/ic-memo.docx), and the two Playwright viewport
 * projects (playwright.config.ts) run every spec concurrently — a second
 * project mutating the same slot mid-test would race this one. So the test
 * itself calls `test.skip(condition, description)` gated on
 * `testInfo.project.name` (mirrors the single-slot-store caveat documented on
 * e2e/agents.spec.ts, but there the store is keyed per-agent-id so
 * per-viewport identity was enough; here there's only one slot, so the fix is
 * to just not run the mutating flow twice — desktop-1080 only).
 */
const FIXTURE_NAME = "sample-template-fixture.docx";
const UNKNOWN_TAG = "companySpecificLegalEntity";

async function buildFixtureBytes(): Promise<Buffer> {
  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            children: [
              new TextRun(
                "Recommendation: {{recommendation}} at {{perShare}} per share.",
              ),
            ],
          }),
          new Paragraph({
            children: [new TextRun(`Entity: {{${UNKNOWN_TAG}}}`)],
          }),
        ],
      },
    ],
  });
  return Packer.toBuffer(doc);
}

test.beforeEach(async ({ context, baseURL }) => {
  await context.addCookies([
    { name: "faheem_session", value: "e2e-company-template", url: baseURL },
  ]);
});

// Safety-net: if a test fails mid-flow (e.g. after Upload but before Remove),
// clear the single-slot store so data/company-template.json is left exactly
// as this spec found it, regardless of pass/fail.
test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status !== testInfo.expectedStatus) {
    await page.request.delete("/api/template").catch(() => undefined);
  }
});

test.describe("Library — company template", () => {
  test("tags dialog → upload → matched badge → audit entry → remove", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "desktop-1080",
      "single-slot store — run mutations on one viewport only",
    );

    await page.goto("/library");
    await expect(
      page.getByRole("heading", { name: "Company template" }),
    ).toBeVisible();

    // starts empty — the dashed upload tile is showing, no card
    await expect(page.getByTestId("template-card")).toHaveCount(0);

    // "View available tags" → dialog lists known tags with live example values
    await clickUntil(page.getByTestId("template-open-tags"), async () => {
      await expect(page.getByTestId("template-tags-dialog")).toBeVisible();
    });
    const dialog = page.getByTestId("template-tags-dialog");
    await expect(dialog.getByText("{{perShare}}")).toBeVisible();
    await expect(dialog.getByText("{{recommendation}}")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();

    // build the fixture at runtime (no binary committed) and upload it
    const fixturePath = testInfo.outputPath(FIXTURE_NAME);
    fs.writeFileSync(fixturePath, await buildFixtureBytes());

    const before = readAudit().length;
    await page.getByTestId("template-upload-input").setInputFiles(fixturePath);

    const card = page.getByTestId("template-card");
    await expect(card).toBeVisible({ timeout: 15000 });
    await expect(card).toContainText(FIXTURE_NAME);
    await expect(card).toContainText("2 tags matched");
    // the unknown tag stays visible as an honest warning, never silently dropped
    await expect(card).toContainText(UNKNOWN_TAG);

    await expect
      .poll(
        () =>
          readAudit().some(
            (e) =>
              e.action === "template-uploaded" &&
              (e.question ?? "").includes(FIXTURE_NAME),
          ),
        { timeout: 10_000 },
      )
      .toBe(true);
    expect(readAudit().length).toBeGreaterThan(before);

    // …and renders on the /audit page
    await page.goto("/audit");
    await expect(page.getByText("Template uploaded").first()).toBeVisible();

    // remove it → back to the empty upload-tile state
    await page.goto("/library");
    await clickUntil(page.getByTestId("template-remove"), async () => {
      await expect(page.getByTestId("template-card")).toHaveCount(0);
    });
    await expect(page.getByTestId("template-upload-tile")).toBeVisible();

    await expect
      .poll(
        () =>
          readAudit().some(
            (e) =>
              e.action === "template-removed" &&
              (e.question ?? "").includes(FIXTURE_NAME),
          ),
        { timeout: 10_000 },
      )
      .toBe(true);
  });
});
