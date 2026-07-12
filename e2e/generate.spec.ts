import { expect, test } from "@playwright/test";

/**
 * T4.3 acceptance (plan §T4.3): trigger generation → three file cards land →
 * download links 200 with the right content-type + non-trivial size, and the
 * Library shows all three. `faheem_session` is set defensively (auth
 * middleware may land in a parallel task).
 */
test.beforeEach(async ({ context, baseURL }) => {
  await context.addCookies([
    { name: "faheem_session", value: "e2e-generate", url: baseURL },
  ]);
});

const CONTENT_TYPES: Record<string, string> = {
  "jahez-valuation-model.xlsx":
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "jahez-ic-memo.docx":
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "jahez-board-deck.pptx":
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
};

test("POST /api/generate/all lands all three artifacts, each servable and non-trivial", async ({
  page,
}) => {
  const res = await page.request.post("/api/generate/all");
  expect(res.ok()).toBe(true);
  expect(res.headers()["content-type"]).toContain("text/event-stream");

  const events = (await res.text())
    .split("\n\n")
    .filter((c) => c.trim())
    .map((c) => JSON.parse(c.replace(/^data: /, "")));

  const artifactEvents = events.filter((e) => e.type === "artifact");
  expect(artifactEvents.map((e) => e.artifact)).toEqual([
    "xlsx",
    "docx",
    "pptx",
  ]);
  expect(events.at(-1)).toEqual({ type: "done" });

  for (const evt of artifactEvents) {
    const fileRes = await page.request.get(evt.meta.file);
    expect(fileRes.status(), evt.meta.file).toBe(200);
    const fileName = evt.meta.file.split("/").pop() as string;
    expect(fileRes.headers()["content-type"]).toContain(
      CONTENT_TYPES[fileName],
    );
    const body = await fileRes.body();
    expect(body.length).toBeGreaterThan(10 * 1024);
  }

  // Library now shows the three landed cards.
  await page.goto("/library");
  await expect(page.getByRole("heading", { name: "Library" })).toBeVisible();
  await expect(page.getByText("Jahez — Valuation Model")).toBeVisible();
  await expect(page.getByText("Jahez — IC Memo")).toBeVisible();
  await expect(page.getByText("Jahez — Board Deck")).toBeVisible();
  await expect(page.getByText("Verified · 5 sources")).toHaveCount(3);
});

test("deliverables chat: run completes → deck preview auto-opens with the 8-slide rail; click + arrows switch slides; download servable", async ({
  page,
}) => {
  test.setTimeout(120_000);

  // The deliverables golden question renders GenerationPanel inline in chat.
  const question = "Prepare the IC memo, DCF model, and committee deck.";
  await page.goto(`/chat/new?q=${encodeURIComponent(question)}`);
  await expect(page).toHaveURL(/\/chat\/(?!new)/);

  // The money moment: progress ticks finish → the deck preview slides open on
  // its own (three artifacts × three phases at the demo pace, then the beat).
  const preview = page.getByTestId("artifact-preview");
  await expect(preview).toBeVisible({ timeout: 60_000 });
  await expect(preview.getByText("Jahez — Board Deck")).toBeVisible();
  await expect(
    preview.getByText(/Generated · .* · Lunar Investments/),
  ).toBeVisible();

  // full thumbnail rail — all 8 slides, slide 1 active
  const thumbs = preview.getByRole("button", { name: /^Slide \d$/ });
  await expect(thumbs).toHaveCount(8);
  await expect(preview.getByText("Slide 1 of 8")).toBeVisible();

  // the canvas slide is a real, decoded image (no broken/404 preview)
  const canvasImg = preview.getByRole("img", { name: "Slide 1 of 8" });
  await expect
    .poll(() =>
      canvasImg.evaluate((el) => (el as HTMLImageElement).naturalWidth),
    )
    .toBeGreaterThan(0);

  // click a thumbnail → jumps; arrow key → advances
  await thumbs.nth(2).click();
  await expect(preview.getByText("Slide 3 of 8")).toBeVisible();
  await page.keyboard.press("ArrowDown");
  await expect(preview.getByText("Slide 4 of 8")).toBeVisible();

  // header download points at the generated deck and serves 200
  const download = preview.getByRole("link", { name: "Download file" });
  await expect(download).toHaveAttribute(
    "href",
    "/artifacts/jahez-board-deck.pptx",
  );
  const deckRes = await page.request.get("/artifacts/jahez-board-deck.pptx");
  expect(deckRes.status()).toBe(200);

  // the pre-rendered preview assets themselves are servable
  for (const asset of [
    "deck-01.png",
    "deck-08.png",
    "memo-01.png",
    "model-cover.png",
  ]) {
    const res = await page.request.get(`/artifacts/previews/${asset}`);
    expect(res.status(), asset).toBe(200);
  }

  // close, then re-open from a file card's primary Preview affordance —
  // the model opens on its Cover sheet with the open-in-Excel CTA.
  await preview.getByRole("button", { name: "Close preview" }).click();
  await expect(preview).toBeHidden();
  await page.getByRole("button", { name: "Preview" }).first().click();
  await expect(preview).toBeVisible();
  await expect(preview.getByText("Jahez — Valuation Model")).toBeVisible();
  await expect(
    preview.getByRole("link", { name: "Open in Excel" }),
  ).toBeVisible();
});

test("POST /api/generate/xlsx alone regenerates just that one entry (idempotent, no duplicates)", async ({
  page,
}) => {
  const res = await page.request.post("/api/generate/xlsx");
  expect(res.ok()).toBe(true);
  const events = (await res.text())
    .split("\n\n")
    .filter((c) => c.trim())
    .map((c) => JSON.parse(c.replace(/^data: /, "")));
  expect(events.filter((e) => e.type === "artifact")).toHaveLength(1);

  await page.goto("/library");
  await expect(page.getByText("Jahez — Valuation Model")).toHaveCount(1);
});
