import { expect, test, type Page } from "@playwright/test";
import goldenQuestions from "../data/golden-questions.json" with { type: "json" };
import skillsData from "../data/skills.json" with { type: "json" };

// Registry cards only: the grid can also hold user-created custom skills
// (e2e/custom-skills.spec.ts runs concurrently against the same shared
// store), so registry counts must exclude `skill-card-custom-*`.
function registryCards(page: Page) {
  return page.locator(
    '[data-testid^="skill-card-"]:not([data-testid^="skill-card-custom-"])',
  );
}

/**
 * Skills Library acceptance, the finance-grade analyst-playbook catalog.
 * Card anatomy, filter pills, per-card toggle dim, and the two Run flavors:
 * `goldenId` skills fire the exact ⌘K-palette golden-bus insert (byte-
 * identical to data/golden-questions.json, same cache key); `prefill` skills
 * land on a fresh firm-context chat with ad hoc text pre-filled, unsent.
 */
const qa2 = goldenQuestions.find((q) => q.id === "qa2")!;
const tradingComps = skillsData.find((s) => s.id === "trading-comps")! as {
  run: { prefill: { en: string; ar: string } };
};

test.beforeEach(async ({ context, baseURL }) => {
  await context.addCookies([
    { name: "faheem_session", value: "e2e-test", url: baseURL },
  ]);
});

test.describe("Skills page", () => {
  test("renders all 10 registry entries, bilingual", async ({
    page,
    context,
    baseURL,
  }) => {
    await page.goto("/skills");
    await expect(page.getByRole("heading", { name: "Skills" })).toBeVisible();
    await expect(registryCards(page)).toHaveCount(10);
    await expect(
      page.getByText("DCF, FCFF Build", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Covenant Sweep", { exact: true }),
    ).toBeVisible();

    await context.addCookies([
      { name: "faheem_locale", value: "ar", url: baseURL },
    ]);
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.getByText("فحص الامتثال", { exact: true })).toBeVisible();
    await expect(
      page.getByText("ملاءمة التفويض", { exact: true }),
    ).toBeVisible();
  });

  test("category filter pills narrow the grid", async ({ page }) => {
    await page.goto("/skills");
    await expect(registryCards(page)).toHaveCount(10);

    await page.getByRole("button", { name: "Valuation", exact: true }).click();
    await expect(registryCards(page)).toHaveCount(4);
    await expect(page.getByTestId("skill-card-dcf-fcff")).toBeVisible();
    await expect(page.getByTestId("skill-card-ic-memo")).toHaveCount(0);

    await page.getByRole("button", { name: "All", exact: true }).click();
    await expect(registryCards(page)).toHaveCount(10);
  });

  test("Run on a prefill skill lands on a fresh chat with the composer pre-filled, unsent", async ({
    page,
  }) => {
    // KNOWN UPSTREAM BUG (not in this page's code, components/chat/chat-view.tsx
    // is out of this task's file ownership, see AGENTS.md "stay in your lane"):
    // ChatView's golden-selection effect (lines ~190-203) calls
    // takeGoldenSelection() on every run, including the FIRST run on a fresh
    // `/chat/new` mount where `chat` is still the initial `undefined`, so the
    // pending selection published by run-skill.ts's publishGoldenSelection()
    // (immediately before router.push) is consumed and discarded before `chat`
    // resolves one render later. The effect's own comment ("`take()` catches a
    // selection published just before `/chat/new` navigation completes")
    // describes the intended behavior, which the current effect ordering does
    // not deliver. Reproduced directly against a running dev server (not just
    // in this spec), confirmed independent of this page: navigating the ⌘K
    // palette itself (components/demo/palette.tsx) from any page where
    // `currentPageContext()` returns something other than the target context
    // (e.g. Home, Agents, Library, any page that isn't already the exact
    // matching /chat/[id]) hits the same path and would drop the selection
    // too; the only reason demo-controls.spec.ts is green today is that its
    // one scenario is already on the matching chat page (the `subscribe`
    // branch, not `take`). Minimal fix: guard the effect with `if (!chat)
    // return;` before calling takeGoldenSelection(), so the pending value
    // isn't consumed until `chat` is actually resolved.
    await page.goto("/skills");
    await page.getByTestId("skill-run-trading-comps").click();
    await page.waitForURL(/\/chat\/new\?context=firm/);

    const box = page.getByRole("textbox");
    await expect(box).toHaveValue(tradingComps.run.prefill.en);
  });

  test("Run on risk-scorecard fires the exact recorded qa2 request into the Jahez workspace chat", async ({
    page,
  }) => {
    // Same upstream bug as the prefill test above, see that test's comment.
    await page.goto("/skills");
    await page.getByTestId("skill-run-risk-scorecard").click();
    await page.waitForURL(/\/chat\/new\?context=workspace%3Ajahez/);

    const box = page.getByRole("textbox");
    await expect(box).toHaveValue(qa2.request.question);
  });

  test("compliance-screen's Run button carries a bilingual 'runs in Arabic' hint", async ({
    page,
  }) => {
    await page.goto("/skills");
    await expect(
      page
        .getByTestId("skill-card-compliance-screen")
        .getByText("Runs in Arabic"),
    ).toBeVisible();
  });

  test("covenant-sweep shows a roadmap badge instead of a Run button", async ({
    page,
  }) => {
    await page.goto("/skills");
    const card = page.getByTestId("skill-card-covenant-sweep");
    await expect(page.getByTestId("skill-run-covenant-sweep")).toHaveCount(0);
    await expect(card.getByText("MVP roadmap")).toBeVisible();
  });

  test("the per-card toggle flips and dims the card without disabling Run", async ({
    page,
  }) => {
    await page.goto("/skills");
    const card = page.getByTestId("skill-card-mandate-fit");
    const toggle = card.getByRole("switch");

    await expect(toggle).toHaveAttribute("aria-checked", "true");
    await expect(card).toHaveAttribute("data-dimmed", "false");

    await toggle.click();

    await expect(toggle).toHaveAttribute("aria-checked", "false");
    await expect(card).toHaveAttribute("data-dimmed", "true");
    await expect(page.getByTestId("skill-run-mandate-fit")).toBeEnabled();
  });
});
