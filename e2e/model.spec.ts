import { expect, test, type Page } from "@playwright/test";
import { clickUntil, readAudit } from "./helpers";

/**
 * WS-B acceptance — the Live Model surface (Jahez).
 * Base-case values render straight from the engine; editing an assumption
 * recomputes in-browser (outputs move, "N values updated" chip appears); a
 * computed cell's Methodology drills its input chain to a sourced leaf, whose
 * "Open source" mounts the PdfPanel at the cited page (highlight machinery is
 * covered elsewhere — here we assert the panel opens on the right page).
 */
test.beforeEach(async ({ context, baseURL }) => {
  await context.addCookies([
    { name: "faheem_session", value: "e2e-test", url: baseURL },
  ]);
});

test.describe("Live Model — Jahez", () => {
  test("workspace links to the model; tabs render real base-case values", async ({
    page,
  }) => {
    // discoverable from the workspace
    await page.goto("/deals/jahez");
    await clickUntil(
      page.getByRole("link", { name: "Live Model" }),
      async () => {
        await expect(page).toHaveURL(/\/deals\/jahez\/model$/);
      },
    );

    // serif workspace title + hero
    await expect(
      page.getByRole("heading", { level: 1, name: "Jahez" }),
    ).toBeVisible();

    // scenario strip: base per-share = SAR 14.36 (engine spot-check)
    await expect(
      page.locator('[data-node-key="base.perShare"]').first(),
    ).toContainText("14.36");

    // DCF tab: WACC build shows 13.3%
    await page.getByRole("tab", { name: "DCF" }).click();
    await expect(page.locator('[data-node-key="wacc"]')).toContainText("13.3%");

    // Sensitivity tab: the 5×5 grids render live cells
    await page.getByRole("tab", { name: "Sensitivity" }).click();
    await expect(page.locator('[data-node-key="grid1.2.2"]')).toBeVisible();
  });

  test("editing an assumption recomputes outputs and shows the diff chip", async ({
    page,
  }) => {
    await page.goto("/deals/jahez/model");

    const perShare = page.locator('[data-node-key="base.perShare"]').first();
    await expect(perShare).toContainText("14.36");

    // select the FY26E order-growth assumption cell → inline stepper appears
    const driver = page.locator('[data-node-key="assumptions.ordersGrowth.0"]');
    await clickUntil(driver, async () => {
      await expect(driver.getByRole("spinbutton")).toBeVisible();
    });
    await driver.getByRole("button", { name: /Increase/i }).click();

    // outputs moved off the base value; the recompute chip surfaced
    await expect(perShare).not.toContainText("14.36");
    await expect(page.getByTestId("diff-chip")).toBeVisible();

    // Reset-to-base restores the base case
    await page.getByRole("button", { name: /Reset to base/i }).click();
    await expect(perShare).toContainText("14.36");
  });

  test("Methodology drills a computed cell to its sourced leaf and opens the PDF", async ({
    page,
  }) => {
    await page.goto("/deals/jahez/model");
    await page.getByRole("tab", { name: "DCF" }).click();

    // open Methodology on WACC (computed)
    await clickUntil(page.locator('[data-node-key="wacc"]'), async () => {
      await expect(page.getByTestId("methodology-sheet")).toBeVisible();
    });
    const sheet = page.getByTestId("methodology-sheet");
    await expect(sheet.getByText("WACC").first()).toBeVisible();

    // drill WACC → Cost of equity → Risk-free rate (a sourced leaf)
    await sheet.getByRole("button", { name: /Cost of equity/i }).click();
    await sheet.getByRole("button", { name: /Risk-free rate/i }).click();

    // sourced leaf → open its source PDF
    await sheet.getByRole("button", { name: "Open source" }).click();

    // the PdfPanel mounts on the cited page (rf → market-data snapshot, p.2)
    await expect(
      page.getByText("Market Data & Comparables Snapshot"),
    ).toBeVisible();
    await expect(page.getByText(/Page 2/)).toBeVisible();
    await expect(page.locator("aside canvas").last()).toBeVisible({
      timeout: 20000,
    });
  });
});

/**
 * WS-C acceptance — conversational edit + agent-team choreography, cached mode
 * (scripted parser, fully offline). A suggested chip drives the whole beat:
 * POST /api/model-edit → the specialist team plays in the Agent Activity
 * language → Valuation's completed stage applies the recompute → the diff chip
 * + updated recommendation land → the audit trail grows. A source-locked chip
 * degrades gracefully (Critical Review raises the lock; values never move).
 */
function trackOffHost(page: Page): string[] {
  const offHost: string[] = [];
  page.on("request", (req) => {
    const url = req.url();
    if (!/^https?:\/\//.test(url)) return; // ignore data:/blob:/ws:
    const host = new URL(url).hostname;
    if (host !== "localhost" && host !== "127.0.0.1") offHost.push(url);
  });
  return offHost;
}

test.describe("Live Model — conversational edit (WS-C)", () => {
  test("suggested chip → choreography → recompute + diff chip + audit trail, offline", async ({
    page,
  }) => {
    const offHost = trackOffHost(page);
    await page.goto("/deals/jahez/model");

    const perShare = page.locator('[data-node-key="base.perShare"]').first();
    await expect(perShare).toContainText("14.36");
    const before = readAudit().length;

    // pick the scripted chip — "Raise FY26 order growth to 20%"
    await clickUntil(page.getByTestId("edit-chip-growth"), async () => {
      await expect(page.getByTestId("edit-choreography")).toBeVisible();
    });

    // the team plays in order; compliance is visibly skipped (no leverage change)
    await expect(page.getByTestId("edit-stage-valuation")).toBeVisible();
    await expect(page.getByTestId("edit-stage-critical-review")).toBeVisible();
    await expect(page.getByTestId("edit-stage-compliance")).toHaveAttribute(
      "data-status",
      "skipped",
    );
    await expect(page.getByTestId("edit-stage-writing")).toBeVisible();

    // Valuation's completed stage applied the edit: outputs moved + diff chip
    await expect(perShare).not.toContainText("14.36");
    await expect(page.getByTestId("diff-chip")).toBeVisible();

    // the recomputed one-line recommendation (house-formatted, real numbers)
    const rec = page.getByTestId("edit-recommendation");
    await expect(rec).toBeVisible();
    await expect(rec).toContainText("SAR");
    await expect(rec).toContainText("%");

    // audit trail grew with the old→new model-edit entry
    await expect
      .poll(
        () =>
          readAudit().some(
            (e) =>
              e.action === "model-edit" &&
              (e.question ?? "").includes("ordersGrowth.0"),
          ),
        { timeout: 10000 },
      )
      .toBe(true);
    expect(readAudit().length).toBeGreaterThan(before);

    // …and renders on the /audit page
    await page.goto("/audit");
    await expect(page.getByText("Model edit").first()).toBeVisible();
    await expect(page.getByText(/ordersGrowth\.0/).first()).toBeVisible();

    // fully offline: zero non-localhost requests (cached mode never calls out)
    expect(offHost, `off-host requests:\n${offHost.join("\n")}`).toEqual([]);
  });

  test("source-locked chip → Critical Review raises the lock, values unchanged", async ({
    page,
  }) => {
    const offHost = trackOffHost(page);
    await page.goto("/deals/jahez/model");

    const perShare = page.locator('[data-node-key="base.perShare"]').first();
    await expect(perShare).toContainText("14.36");

    // "Change FY25 revenue to SAR 2 billion" — a sourced actual
    await clickUntil(page.getByTestId("edit-chip-locked"), async () => {
      await expect(page.getByTestId("edit-choreography")).toBeVisible();
    });

    await expect(
      page.getByTestId("edit-stage-critical-review"),
    ).toHaveAttribute("data-status", "flagged");
    const locked = page.getByTestId("edit-source-locked");
    await expect(locked).toBeVisible();
    await expect(locked).toContainText(/source-locked/i);

    // the model never moved; no recommendation pretends otherwise
    await expect(perShare).toContainText("14.36");
    await expect(page.getByTestId("edit-recommendation")).toHaveCount(0);

    // the blocked attempt is still audited
    await expect
      .poll(
        () =>
          readAudit().some((e) =>
            (e.question ?? "").includes("source-locked (blocked): revenue"),
          ),
        { timeout: 10000 },
      )
      .toBe(true);

    expect(offHost, `off-host requests:\n${offHost.join("\n")}`).toEqual([]);
  });
});
