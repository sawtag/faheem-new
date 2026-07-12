import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

/**
 * Flagship chat acceptance (FAHEEM_MODE=cached). Opens the seeded Jahez chat,
 * asks the recorded fixture question, and verifies the full beat: stages →
 * collapse → streamed answer → citation chip → PdfPanel at the cited page →
 * Sources accordion. Plus the two hard guarantees: zero off-host requests
 * (pdfjs worker vendored locally, landmine #3) and a grown audit trail.
 */
const QUESTION =
  "Break down Jahez's FY2025 unit economics — GMV, take rate, AOV, and why did net income compress 61%?";
const AUDIT_LOG = path.join(process.cwd(), "data/audit-log.json");

function readAudit(): Array<{ question?: string; context?: string }> {
  try {
    return JSON.parse(fs.readFileSync(AUDIT_LOG, "utf-8"));
  } catch {
    return [];
  }
}

test.beforeEach(async ({ context, baseURL }) => {
  await context.addCookies([
    {
      name: "faheem_session",
      value: "1",
      url: baseURL ?? "http://localhost:3000",
    },
  ]);
});

test("cached stream → citation → PDF → sources, offline & audited", async ({
  page,
}) => {
  const offHost: string[] = [];
  page.on("request", (req) => {
    const url = req.url();
    if (!/^https?:\/\//.test(url)) return; // ignore data:/blob:/ws:
    const host = new URL(url).hostname;
    if (host !== "localhost" && host !== "127.0.0.1") offHost.push(url);
  });

  await page.goto("/chat/seed-jahez-revenue");

  // seeded history renders (chat title in the header)
  await expect(
    page.getByRole("heading", { name: /FY2025 revenue quality review/i }),
  ).toBeVisible();

  const before = readAudit().length;

  // ask the recorded fixture question
  await page.getByRole("textbox").fill(QUESTION);
  await page.getByRole("button", { name: "Send" }).click();

  // stages ran and collapsed to a one-line seconds summary (live-turn only)
  await expect(page.getByText(/\d+ agents · \d+s/)).toBeVisible({
    timeout: 15000,
  });

  // the answer streamed a fixture-only figure (AOV) + the verified badge
  await expect(page.getByText(/64\.9/)).toBeVisible();
  await expect(
    page.getByText(/Verified.*5 sources cited/).last(),
  ).toBeVisible();

  // click the streamed answer's citation chip [1] → PdfPanel opens at fy25-er p4
  await page.getByRole("button", { name: "Open source 1" }).last().click();
  const panel = page.locator("aside");
  await expect(panel.getByText("Q4 2025 Earnings Results")).toBeVisible();
  await expect(panel.getByText(/Page 4/)).toBeVisible();
  // the vendored worker actually renders the page (no CDN, works offline)
  await expect(panel.locator("canvas")).toBeVisible({ timeout: 20000 });

  // Sources accordion lists the citations (its header carries the source
  // count, e.g. "5 Sources" — distinct from the composer's "Sources" picker)
  await page
    .getByRole("button", { name: /\d+ Sources/ })
    .last()
    .click();
  await expect(page.getByText(/Average Order Value 64\.9/)).toBeVisible();

  // audit trail grew with this exact entry
  await expect
    .poll(
      () =>
        readAudit().some(
          (e) => e.question === QUESTION && e.context === "workspace:jahez",
        ),
      { timeout: 10000 },
    )
    .toBe(true);
  expect(readAudit().length).toBeGreaterThan(before);

  // ZERO requests to any non-localhost host (fail on unpkg/cdnjs/jsdelivr)
  expect(offHost, `off-host requests:\n${offHost.join("\n")}`).toEqual([]);
});
