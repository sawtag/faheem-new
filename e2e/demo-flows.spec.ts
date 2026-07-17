import { expect, test } from "@playwright/test";
import { clickUntil } from "./helpers";

/**
 * The five judge-facing demo prompts (2026-07-16 wave), one serial run in
 * FAHEEM_MODE=cached, each fired the way the presenter fires it: ⌘K palette
 * from Home, exact recorded text, then the flow's own money moment:
 *
 *  1. portfolio-top3  → firm chat answer, cited to lunar-public-book
 *  2. darb-memo       → generation turn, docx-only, Darb memo preview pages
 *  3. dcf-scenarios   → generation turn, xlsx-only, ScenarioSummary strip +
 *                       named sheet rail (Cover / DCF / Scenarios & Risk /
 *                       Sensitivity)
 *  4. committee-deck  → generation turn, pptx-only, slide preview auto-opens
 *  5. ic-macro-thara  → IC room advisor answer, cited to gastat-macro-pack,
 *                       advisory-only closing line
 *
 * Screenshots land in e2e-screens/ for the pre-demo review.
 */

const SHOT = { dir: "e2e-screens" };

async function openPaletteAndPick(
  page: import("@playwright/test").Page,
  id: string,
) {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  // under full-suite load the Ctrl+K listener can mount a beat after the
  // heading paints; re-press instead of failing on the first race
  const entry = page.getByTestId(`palette-item-${id}`);
  await expect(async () => {
    if (!(await entry.isVisible())) await page.keyboard.press("Control+k");
    await expect(entry).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 20_000 });
  await entry.click();
  await expect(entry).not.toBeVisible();
}

test("five demo flows: palette to money moment, fully cached", async ({
  page,
}) => {
  test.setTimeout(300_000);

  await test.step("login", async () => {
    await page.goto("/login");
    await page.getByLabel(/username/i).fill("ali");
    await page.getByLabel(/password/i).fill("demo");
    await clickUntil(page.getByRole("button", { name: /sign in/i }), () =>
      expect(page).toHaveURL("/", { timeout: 3000 }),
    );
  });

  await test.step("1. portfolio-top3: cited firm answer", async () => {
    await openPaletteAndPick(page, "portfolio-top3");
    await expect(page).toHaveURL(/\/chat\/new\?context=firm/);
    const box = page.getByRole("textbox");
    await expect(box).toHaveValue(/top 3 positions/);
    // both pinned doc chips landed
    await expect(page.getByText("Public Equities Book Review")).toBeVisible();
    await expect(page.getByText(/IC Charter/)).toBeVisible();
    await box.press("Enter");

    // cached replay: stages, then the streamed answer with the real numbers
    await expect(page.getByText("Al Rajhi Bank").first()).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText(/SAR 588\.0/).first()).toBeVisible();
    await expect(page.getByText(/TRIM at least SAR 35\.1M/)).toBeVisible();
    // citations resolve: open chip [1], PdfPanel shows the new doc with the
    // cited passage highlighted in the text layer (rule 5)
    await page.getByRole("button", { name: "Open source 1" }).last().click();
    const panel = page.locator("aside");
    await expect(panel.getByText("Public Equities Book Review")).toBeVisible();
    await expect(panel.locator("canvas")).toBeVisible({ timeout: 20_000 });
    await expect(panel.getByTestId("citation-highlight").first()).toBeVisible({
      timeout: 20_000,
    });
    await page.screenshot({
      path: `${SHOT.dir}/1-portfolio-top3.png`,
      fullPage: false,
    });
    await page.keyboard.press("Escape");
  });

  await test.step("2. darb-memo: docx generation + pages preview", async () => {
    await openPaletteAndPick(page, "darb-memo");
    await expect(page).toHaveURL(/\/chat\/new\?context=workspace/);
    const box = page.getByRole("textbox");
    await expect(box).toHaveValue(/IC memo on Darb/);
    await box.press("Enter");

    // single docx row builds, lands as a file card, preview auto-opens
    await expect(page.getByText("Darb Screening Memo").first()).toBeVisible({
      timeout: 60_000,
    });
    const preview = page.getByTestId("artifact-preview");
    await expect(preview).toBeVisible({ timeout: 20_000 });
    await expect(
      preview.getByRole("img", { name: /page 1 of/i }),
    ).toBeVisible();
    await page.screenshot({ path: `${SHOT.dir}/2-darb-memo.png` });
    await page.keyboard.press("Escape");
    await expect(preview).not.toBeVisible();
  });

  await test.step("3. dcf-scenarios: xlsx + scenario strip + sheet rail", async () => {
    await openPaletteAndPick(page, "dcf-scenarios");
    const box = page.getByRole("textbox");
    await expect(box).toHaveValue(/Run the DCF on Jahez out to 2031/);
    await box.press("Enter");

    // the workbook builds, the live workbook side panel auto-opens: real
    // sheet tabs and cells from the client-safe engine, not a PNG rail
    const workbook = page.getByTestId("workbook-panel");
    await expect(workbook).toBeVisible({ timeout: 90_000 });
    for (const sheet of [
      "Assumptions",
      "DCF",
      "Scenarios & Risk",
      "Sensitivity",
      "Comps",
    ]) {
      await expect(workbook.getByRole("tab", { name: sheet })).toBeVisible();
    }
    await expect(
      workbook.getByRole("link", { name: "Download file" }),
    ).toBeVisible();
    // step through to the Scenarios sheet, cells render from buildModel
    await workbook.getByRole("tab", { name: "Scenarios & Risk" }).click();
    await expect(workbook.getByTestId("workbook-cell").first()).toBeVisible();
    await page.screenshot({ path: `${SHOT.dir}/3-dcf-preview.png` });
    await page.keyboard.press("Escape");
    await expect(workbook).not.toBeVisible();

    // the ScenarioSummary strip: three tiles + weighted value, same engine
    await expect(
      page.getByText("Scenario summary", { exact: false }),
    ).toBeVisible();
    for (const label of ["Bear", "Base", "Bull"]) {
      await expect(page.getByText(label, { exact: true })).toBeVisible();
    }
    await expect(page.getByText(/Probability-weighted/)).toBeVisible();
    await expect(page.getByRole("link", { name: /live model/i })).toBeVisible();
    await page.screenshot({ path: `${SHOT.dir}/3b-scenario-strip.png` });
  });

  await test.step("4. committee-deck: pptx generation + slide preview", async () => {
    await openPaletteAndPick(page, "committee-deck");
    const box = page.getByRole("textbox");
    await expect(box).toHaveValue(/committee deck for Monday's IC/);
    await box.press("Enter");

    const preview = page.getByTestId("artifact-preview");
    await expect(preview).toBeVisible({ timeout: 60_000 });
    // full 8-slide rail
    await expect(
      preview.getByRole("button", { name: /slide 8/i }),
    ).toBeVisible();
    await page.screenshot({ path: `${SHOT.dir}/4-committee-deck.png` });
    await page.keyboard.press("Escape");
  });

  await test.step("5. ic-macro-thara: IC room advisor answer", async () => {
    await openPaletteAndPick(page, "ic-macro-thara");
    await expect(page).toHaveURL(/\/ic/);
    // the IC chat composer picked up the prefill; submit it
    const box = page.getByRole("textbox").last();
    await expect(box).toHaveValue(/Before we vote on Thara Pay/, {
      timeout: 10_000,
    });
    await box.press("Enter");

    await expect(page.getByText(/digital economy/).first()).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText(/15\.6%/).first()).toBeVisible();
    await expect(
      page.getByText(/Advisory only: the investment decision rests/).first(),
    ).toBeVisible();
    await page.screenshot({ path: `${SHOT.dir}/5-ic-macro.png` });
  });
});
