import fs from "node:fs";
import path from "node:path";
import type { Locator, Page } from "@playwright/test";
import { expect } from "@playwright/test";

/**
 * Shared Playwright helpers. Cookie names are duplicated as literals (not
 * imported from lib/locale.ts) to match the convention already established by
 * the per-screen specs (login.spec.ts, home.spec.ts, deals.spec.ts, …).
 */
export const SESSION_COOKIE = "faheem_session";
export const LOCALE_COOKIE = "faheem_locale";
export const AUDIT_LOG = path.join(process.cwd(), "data/audit-log.json");

export function readAudit(): Array<{
  action?: string;
  question?: string;
  context?: string;
}> {
  try {
    return JSON.parse(fs.readFileSync(AUDIT_LOG, "utf-8"));
  } catch {
    return [];
  }
}

/** Full route inventory (plan §T5.2 / messages/*.json namespaces). */
export const ROUTES = [
  "/",
  "/login",
  "/dashboard",
  "/deals",
  "/deals/darb",
  "/deals/jahez",
  "/deals/jahez/model",
  "/ic",
  "/agents",
  "/library",
  "/audit",
  "/connections",
  "/onboarding",
  "/chat/seed-jahez-revenue",
  "/chat/seed-darb-screening",
  "/chat/seed-ic-prep",
] as const;

/**
 * Namespaced i18n keys (messages/en.json top-level namespaces), if any of
 * these leak into rendered text un-translated (e.g. "chat.thinking"), next-intl
 * fell back to the raw key instead of resolving a message.
 */
export const MESSAGE_KEY_LEAK_RE =
  /\b(shell|chat|home|deals|ic|agents|library|audit|connections|onboarding|login|generate|dashboard|sentiment)\.[a-z]/i;

/**
 * The single recorded demo-cache fixture (T2.2), read at test setup rather
 * than hardcoded, so the golden path always asks the exact question the
 * cached SSE transcript was recorded for.
 */
export function loadDemoCacheFixture(): {
  question: string;
  lang: "en" | "ar";
  context: { kind: string; companyId?: string };
} {
  // Pick the T2.2 chat fixture EXPLICITLY, demo-cache now holds all six
  // recorded goldens, so "first file" grabs the wrong request (regression:
  // it selected the ic-rank golden and filled it into the Jahez workspace →
  // guaranteed cache miss). This fixture is the only jahez-workspace entry
  // with no docIds/agent and the plain ", GMV, take rate, AOV" phrasing.
  const dir = path.join(process.cwd(), "data/demo-cache");
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".json"))) {
    const req = JSON.parse(
      fs.readFileSync(path.join(dir, file), "utf-8"),
    ).request;
    if (
      req.lang === "en" &&
      req.context?.companyId === "jahez" &&
      !req.docIds &&
      !req.agent &&
      req.question.startsWith("Break down Jahez's FY2025 unit economics, GMV")
    ) {
      return req;
    }
  }
  throw new Error(
    `chat fixture (T2.2 unit-economics entry) not found in ${dir}`,
  );
}

/** `/deals/darb` -> `deals-darb`, `/` -> `home`. Used for screenshot filenames. */
export function routeSlug(route: string): string {
  if (route === "/") return "home";
  return route.replace(/^\//, "").replace(/\//g, "-");
}

/** No horizontal scrollbar, the RTL flip must not blow out any layout. */
export async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const el = document.scrollingElement;
          return el ? el.scrollWidth - el.clientWidth : 0;
        }),
      { timeout: 8000 },
    )
    .toBeLessThanOrEqual(1);
}

/**
 * Click `locator`, retrying the click itself if `check` doesn't pass shortly
 * after, not just retrying `check` alone. This machine runs the suite at
 * high parallelism (16 workers), and a click that lands in the beat right
 * after `page.goto()`, before React has finished hydrating that DOM node,
 * is silently swallowed (the element is visible/stable/enabled, so
 * Playwright's own actionability checks pass; there's just no listener
 * attached yet). A plain `await locator.click(); await expect(check)` then
 * waits out its whole timeout for a state change that will never arrive,
 * because the click itself never took effect. Re-issuing the click on every
 * retry, not just re-checking, is what makes this self-healing.
 */
export async function clickUntil(
  locator: Locator,
  check: () => Promise<void>,
  timeout = 20_000,
): Promise<void> {
  await expect(async () => {
    await locator.click();
    await check();
  }).toPass({ timeout, intervals: [300, 600, 1200, 2500] });
}

/** Collects console `error` messages + uncaught page errors for later filtering. */
export function collectConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(err.message));
  return errors;
}
