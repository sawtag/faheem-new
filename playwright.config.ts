import { defineConfig, devices } from "@playwright/test";

// PORT override lets parallel worktrees run e2e without racing the main
// tree's dev server on :3000. Default unchanged.
const PORT = Number(process.env.PORT ?? 3000);

// The suite must never append to the git-tracked audit seed
// (data/audit-log.json): the web server copies the seed to this per-port
// temp file and the app writes there (the FAHEEM_AUDIT_PATH override
// lib/audit.ts and /api/audit already honor). Set on process.env so
// e2e/helpers.ts resolves the same file in test workers, which load this
// config too. The specs' "audit grows" assertions are relative, so they
// hold against the copy.
const AUDIT_PATH =
  (process.env.FAHEEM_AUDIT_PATH ??= `/tmp/faheem-e2e-audit-${PORT}.json`);

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "html",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "desktop-1080",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1920, height: 1080 },
      },
    },
    {
      name: "laptop-768",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1366, height: 768 },
      },
    },
  ],
  webServer: {
    // FAHEEM_E2E_PROD=1 runs the suite against the production build — the
    // demo-faithful mode used for the final gates and the dress rehearsal.
    command: `cp data/audit-log.json "$FAHEEM_AUDIT_PATH" && ${
      process.env.FAHEEM_E2E_PROD
        ? "npm run build && npm run start"
        : "npm run dev"
    }`,
    url: `http://localhost:${PORT}`,
    // NEVER reuse a running server: the suite must own its FAHEEM_MODE=cached
    // process. Reusing a dev server (smart/live mode) silently tests the wrong
    // app and poisons golden-path, timing, and audit-count assertions. If the
    // port is busy, failing loudly here is the correct outcome (stop the dev
    // server, or run with PORT=<other> per the note above).
    reuseExistingServer: false,
    timeout: process.env.FAHEEM_E2E_PROD ? 300_000 : 120_000,
    env: {
      FAHEEM_MODE: "cached",
      PORT: String(PORT),
      FAHEEM_AUDIT_PATH: AUDIT_PATH,
    },
  },
});
