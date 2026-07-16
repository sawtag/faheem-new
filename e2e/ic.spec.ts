import { expect, test } from "@playwright/test";
import { clickUntil, readAudit } from "./helpers";

/**
 * T3.4 acceptance, the Faheem IC room (the closing beat). Session cookie is set
 * defensively (same pattern as governance.spec) so the route is reachable
 * without a fresh login.
 */
test.beforeEach(async ({ context, baseURL }) => {
  await context.addCookies([
    { name: "faheem_session", value: "e2e-test", url: baseURL },
  ]);
});

test.describe("Faheem IC room", () => {
  test("renders both deal columns, both populated (P5a: Jahez model signed off)", async ({
    page,
  }) => {
    await page.goto("/ic");

    await expect(
      page.getByRole("heading", { name: "Investment Committee" }),
    ).toBeVisible();
    await expect(page.getByTestId("ic-comparison-table")).toBeVisible();

    // Both analysis-complete deals get a column.
    await expect(page.getByTestId("ic-col-jahez")).toBeVisible();
    await expect(page.getByTestId("ic-col-thara-pay")).toBeVisible();

    // Thara Pay: 18.5% implied IRR vs the 15% hurdle, positive delta, pass
    // badges, all from deals.json.
    await expect(page.getByText("18.5%")).toBeVisible();
    await expect(page.getByText("vs 15% hurdle")).toBeVisible();
    const tharaDelta = page.getByTestId("ic-irr-delta-thara-pay");
    await expect(tharaDelta).toHaveAttribute("data-tone", "above");
    await expect(tharaDelta).toContainText("350");

    // Jahez: 17.1% implied IRR vs the 15% hurdle, +210bps, pass badges, the
    // model signed off at P5a (jahez-analysis-summary.pdf).
    await expect(page.getByText("17.1%")).toBeVisible();
    const jahezDelta = page.getByTestId("ic-irr-delta-jahez");
    await expect(jahezDelta).toHaveAttribute("data-tone", "above");
    await expect(jahezDelta).toContainText("210");

    // Both columns clear mandate fit + Compliance → 4 "Pass" badges total
    // (scoped to the sheet: the decision cards below repeat the pass lines).
    await expect(
      page.getByTestId("ic-comparison-table").getByText("Pass"),
    ).toHaveCount(4);

    // No pending column left, never fake numbers, but nothing pending either.
    await expect(page.getByTestId("ic-pending-jahez")).not.toBeVisible();
  });

  test("advisory-only disclaimer is visible on load", async ({ page }) => {
    await page.goto("/ic");
    const banner = page.getByTestId("ic-advisory-disclaimer");
    await expect(banner).toBeVisible();
    await expect(banner).toHaveText(
      "Advisory only: the investment decision rests with the committee.",
    );
  });

  test("decision phase: cards carry the verified brief and the materials on the table", async ({
    page,
  }) => {
    await page.goto("/ic");

    await expect(page.getByText("Committee decision")).toBeVisible();
    const jahez = page.getByTestId("ic-decision-card-jahez");
    const thara = page.getByTestId("ic-decision-card-thara-pay");

    // Faheem's pre-decision brief, every line derived from deals.json.
    await expect(jahez).toContainText("Clears the 15% IRR hurdle by 210 bps");
    await expect(jahez).toContainText("Risk score 5.5 / 10: moderate");
    await expect(thara).toContainText("Clears the 15% IRR hurdle by 350 bps");

    // Jahez's landed deliverables sit on the table; Thara has its analysis.
    await expect(jahez).toContainText("Jahez · Valuation Model");
    await expect(jahez).toContainText("Jahez · IC Memo");
    await expect(thara).toContainText("Analysis summary");
  });

  test("decision phase: the artifact sparkle seeds an artifact question into the advisory chat", async ({
    page,
  }) => {
    await page.goto("/ic");
    const composer = page.getByRole("textbox", { name: "Ask Faheem IC…" });

    await clickUntil(
      page.getByRole("button", {
        name: "Ask Faheem IC about Jahez · IC Memo",
      }),
      async () => {
        await expect(composer).toHaveValue(
          "What does the Jahez IC memo recommend, and what evidence supports it?",
          { timeout: 1500 },
        );
      },
    );
  });

  test("decision phase: recording Advance logs the human gate to the audit trail and survives reload", async ({
    page,
  }) => {
    await page.goto("/ic");

    // Choose Advance on Thara Pay → confirm dialog with Faheem's brief.
    const dialog = page.getByTestId("ic-decision-dialog");
    await clickUntil(
      page.getByTestId("ic-decide-advance-thara-pay"),
      async () => {
        await expect(dialog).toBeVisible({ timeout: 1500 });
      },
    );
    await expect(dialog).toContainText("Advance · Thara Pay");
    await expect(dialog).toContainText("Faheem's pre-decision brief");

    const before = readAudit().length;
    await dialog.getByTestId("ic-decision-record").click();
    await expect(dialog).toBeHidden();

    // The card flips to its recorded state…
    const recorded = page.getByTestId("ic-decision-recorded-thara-pay");
    await expect(recorded).toHaveText("Advance");
    await expect(page.getByTestId("ic-decision-card-thara-pay")).toContainText(
      "logged to the audit trail",
    );

    // …the audit trail grows with one committee-decision entry (poll only the
    // slice appended after our click, parallel projects share the log)…
    await expect
      .poll(
        () =>
          readAudit()
            .slice(before)
            .some(
              (e) =>
                e.action === "ic-decision" &&
                (e.question ?? "").includes("Advance · Thara Pay") &&
                e.context === "ic",
            ),
        { timeout: 10_000 },
      )
      .toBe(true);

    // …and the decision persists across a reload (localStorage), then Revise
    // reopens the vote so the demo stays re-runnable.
    await page.reload();
    await expect(page.getByTestId("ic-decision-recorded-thara-pay")).toHaveText(
      "Advance",
    );
    await clickUntil(page.getByRole("button", { name: "Revise" }), async () => {
      await expect(page.getByTestId("ic-decide-advance-thara-pay")).toBeVisible(
        { timeout: 1500 },
      );
    });
  });

  test("a suggested-question pill fills the composer", async ({ page }) => {
    await page.goto("/ic");
    const composer = page.getByRole("textbox", { name: "Ask Faheem IC…" });
    await expect(composer).toHaveValue("");

    // click-until-effect: a click landing before hydration attaches the
    // pill's handler is silently lost under parallel dev-compile load
    await expect(async () => {
      await page
        .getByRole("button", {
          name: "Rank these deals: strongest risk-adjusted case?",
        })
        .click();
      await expect(composer).toHaveValue(
        "Rank these deals: strongest risk-adjusted case?",
        { timeout: 1500 },
      );
    }).toPass({ timeout: 20_000 });
  });
});
