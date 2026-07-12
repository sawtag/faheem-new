import { defineConfig, devices } from "@playwright/test";

// PORT override lets parallel worktrees run e2e without racing the main
// tree's dev server on :3000 (reuseExistingServer would silently test the
// WRONG build). Default unchanged.
const PORT = Number(process.env.PORT ?? 3000);

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
    command: "npm run dev",
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: { FAHEEM_MODE: "cached", PORT: String(PORT) },
  },
});
