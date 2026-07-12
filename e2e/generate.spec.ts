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
