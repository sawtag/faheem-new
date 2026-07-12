import { expect, test } from "@playwright/test";
import { ensureSampleFixture } from "../tests/fixtures/make-pdf";

/**
 * "Upload any PDF and ask about it" — the demo's answer to "is this hardcoded?".
 * Runs against the CACHED e2e server (no API key), so the live Files-API leg is
 * skipped: the upload is still saved, registered, viewable, and attachable. This
 * spec proves the two judge-visible guarantees under cached mode:
 *   1. composer paperclip → the doc becomes a # chip; asking with it attached
 *      yields the graceful bilingual "switch to live (⌘.)" error (never a crash,
 *      never a hallucinated answer).
 *   2. Documents-tab drop-zone → the uploaded doc opens in the SAME PdfPanel via
 *      the documents route (served by upload-id).
 * (The live end — real citations grounded in the uploaded PDF — is smoke-tested
 * by hand with a key; impossible to assert here without one.)
 */
const FIXTURE = ensureSampleFixture();

test.beforeEach(async ({ context, baseURL }) => {
  await context.addCookies([
    {
      name: "faheem_session",
      value: "1",
      url: baseURL ?? "http://localhost:3000",
    },
  ]);
});

test("composer attach → # chip → cached-mode ask yields switch-to-live", async ({
  page,
}) => {
  await page.goto("/chat/seed-jahez-revenue");

  // attach the fixture PDF through the (real) paperclip file input
  await page.getByTestId("composer-file-input").setInputFiles(FIXTURE);

  // it lands as a pre-attached # chip (filename → "sample note")
  await expect(page.getByText(/sample note/i)).toBeVisible({ timeout: 15000 });

  // ask about it in cached mode → the graceful bilingual "switch to live" error
  await page.getByRole("textbox").fill("What does this uploaded note say?");
  await page.getByRole("button", { name: "Send" }).click();

  await expect(page.getByText(/switch to live mode/i)).toBeVisible({
    timeout: 15000,
  });
});

test("Documents-tab drop-zone → uploaded row → opens in the viewer", async ({
  page,
}) => {
  await page.goto("/deals/jahez");

  await page.getByRole("tab", { name: "Documents" }).click();

  // upload through the drop-zone's file input
  await page.getByTestId("documents-file-input").setInputFiles(FIXTURE);

  // the uploaded row appears with the "Uploaded" badge
  const row = page.getByTestId("uploaded-doc-row");
  await expect(row).toBeVisible({ timeout: 15000 });
  await expect(row.getByText(/uploaded/i)).toBeVisible();

  // "Open" streams the runtime PDF via the documents route (served by upload-id)
  const [docResponse] = await Promise.all([
    page.waitForResponse((r) => /\/api\/documents\/upload-/.test(r.url())),
    row.getByRole("button", { name: "Open" }).click(),
  ]);
  expect(docResponse.status()).toBe(200);
  expect(docResponse.headers()["content-type"]).toContain("application/pdf");

  // the shared PdfPanel slides in and paginates the uploaded PDF (deep-linked p1)
  await expect(page.getByText(/page\s*1/i)).toBeVisible({ timeout: 20000 });
});
