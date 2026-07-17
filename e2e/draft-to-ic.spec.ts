import { expect, test } from "@playwright/test";
import { readAudit } from "./helpers";

/**
 * WS-E acceptance (live-model-provenance plan §3), Draft-to-IC. Two
 * surfaces render the same `DraftToIc` modal: the primary trigger under the
 * deliverables panel (right after "Prepare the IC memo…" lands its three
 * artifacts) and the secondary trigger in the IC room header (scoped to
 * Jahez, the one worked model). Both prefill from REAL computeModel()
 * numbers and the actually-generated artifact names, no live model call,
 * fully offline (cached mode).
 */
test.beforeEach(async ({ context, baseURL }) => {
  await context.addCookies([
    { name: "faheem_session", value: "e2e-draft-to-ic", url: baseURL },
  ]);
});

test.describe("Draft to IC", () => {
  test("primary trigger (deliverables panel): prefilled compose modal, mailto href, audit grows", async ({
    page,
  }) => {
    test.setTimeout(120_000);

    const question = "Prepare the IC memo, DCF model, and committee deck.";
    await page.goto(`/chat/new?q=${encodeURIComponent(question)}`);
    await expect(page).toHaveURL(/\/chat\/(?!new)/);

    // the deck preview auto-opens over everything, close it so the
    // Draft-to-IC trigger underneath is clickable.
    const preview = page.getByTestId("artifact-preview");
    await expect(preview).toBeVisible({ timeout: 60_000 });
    await preview.getByRole("button", { name: "Close preview" }).click();
    await expect(preview).toBeHidden();

    const trigger = page.getByRole("button", { name: "Draft email to IC" });
    await expect(trigger).toBeVisible();
    await trigger.click();

    const dialog = page.getByTestId("draft-to-ic-dialog");
    await expect(dialog).toBeVisible();

    // pre-selected recipient chip, the house "Lunar IC Group" alias, not a
    // fabricated named roster.
    await expect(dialog.getByTestId("draft-to-ic-recipients")).toContainText(
      "Lunar IC Group <ic@lunar-inv.sa>",
    );

    // subject prefilled with the company name
    await expect(dialog.getByTestId("draft-to-ic-subject")).toHaveValue(
      "Jahez: IC materials & recommendation",
    );

    // body carries the REAL base-case DCF numbers (matches e2e/model.spec.ts's
    // confirmed base.perShare = 14.36 / weighted IRR = 16.8% / benchmark = 15%)
    // and the three just-landed artifact names.
    const body = dialog.getByTestId("draft-to-ic-body");
    await expect(body).toHaveValue(/SAR 14\.36/);
    await expect(body).toHaveValue(/16\.8%/);
    await expect(body).toHaveValue(/15%/);
    await expect(body).toHaveValue(/The compliance screen passes\./);
    await expect(body).toHaveValue(/- Jahez · Valuation Model/);
    await expect(body).toHaveValue(/- Jahez · IC Memo/);
    await expect(body).toHaveValue(/- Jahez · Board Deck/);
    await expect(body).toHaveValue(/Ali\nLunar Investments/);

    // body is editable
    await body.fill("A hand-edited body for the committee.");
    await expect(body).toHaveValue("A hand-edited body for the committee.");

    // mailto href is well-formed, protocol + encoded subject/body present
    const openInOutlook = dialog.getByTestId("draft-to-ic-open-in-outlook");
    const href = await openInOutlook.getAttribute("href");
    expect(href).toMatch(/^mailto:/);
    expect(href).toContain("subject=Jahez");
    expect(href).toContain(
      encodeURIComponent("A hand-edited body for the committee."),
    );

    // clicking hands off to the mail client (mailto:), the SPA itself never
    // navigates away, and the audit trail grows with one "ic-draft" entry.
    const before = readAudit().length;
    const urlBefore = page.url();
    await openInOutlook.click();
    expect(page.url()).toBe(urlBefore);

    // Poll only entries appended AFTER this click: the two viewport projects
    // run this test in parallel against one shared audit file, so matching
    // the whole log can false-pass on the sibling project's append and then
    // read the length before our own write lands.
    await expect
      .poll(
        () =>
          readAudit()
            .slice(before)
            .some(
              (e) =>
                e.action === "ic-draft" &&
                (e.question ?? "").includes("Jahez: IC materials"),
            ),
        { timeout: 10_000 },
      )
      .toBe(true);
    expect(readAudit().length).toBeGreaterThan(before);

    // …and renders on the /audit page
    await page.goto("/audit");
    await expect(page.getByText("IC email drafted").first()).toBeVisible();
  });

  test("secondary trigger (IC room header, Jahez-scoped): opens the same prefilled modal", async ({
    page,
  }) => {
    await page.goto("/ic");
    await expect(
      page.getByRole("heading", { name: "Investment Committee" }),
    ).toBeVisible();

    const trigger = page.getByRole("button", { name: "Draft email to IC" });
    await expect(trigger).toBeVisible();
    await trigger.click();

    const dialog = page.getByTestId("draft-to-ic-dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByTestId("draft-to-ic-subject")).toHaveValue(
      "Jahez: IC materials & recommendation",
    );
    await expect(dialog.getByTestId("draft-to-ic-body")).toHaveValue(
      /- Jahez · Board Deck/,
    );

    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(dialog).toBeHidden();
  });
});
