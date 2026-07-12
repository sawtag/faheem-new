import { expect, test } from "@playwright/test";
import {
  LOCALE_COOKIE,
  MESSAGE_KEY_LEAK_RE,
  ROUTES,
  SESSION_COOKIE,
  collectConsoleErrors,
  expectNoHorizontalOverflow,
  routeSlug,
} from "./helpers";

/**
 * T5.2 RTL/i18n sweep — every route in the inventory (plan §T5.2), checked in
 * `ar`: `dir="rtl"`, no horizontal overflow, no raw `namespace.key` leaking
 * into rendered text, console free of `MISSING_MESSAGE` warnings, plus a
 * per-route screenshot for the visual pass. The same key-leak + console
 * checks are repeated in `en` (no RTL/overflow/screenshot assertions there —
 * `en` is already covered visually by the per-screen specs).
 *
 * `faheem_session` is set on every route (including the public /login and /)
 * so protected routes render instead of redirecting — a stray cookie on
 * /login is harmless (middleware treats it as a public path regardless).
 */
test.describe("RTL sweep — ar", () => {
  for (const route of ROUTES) {
    test(`${route} — rtl, no overflow, no leaked keys, clean console`, async ({
      page,
      context,
      baseURL,
    }, testInfo) => {
      const consoleErrors = collectConsoleErrors(page);

      await context.addCookies([
        { name: SESSION_COOKIE, value: "e2e-rtl-sweep", url: baseURL },
        { name: LOCALE_COOKIE, value: "ar", url: baseURL },
      ]);

      const response = await page.goto(route);
      expect(response?.ok(), route).toBe(true);
      await page.waitForLoadState("networkidle");

      await expect(page.locator("html")).toHaveAttribute("dir", "rtl");

      await expectNoHorizontalOverflow(page);

      const bodyText = await page.evaluate(() => document.body.innerText);
      const leaked = bodyText.match(MESSAGE_KEY_LEAK_RE);
      expect(
        leaked,
        `leaked message key on ${route}: ${leaked?.[0]}`,
      ).toBeNull();

      const missingMessageErrors = consoleErrors.filter((e) =>
        e.includes("MISSING_MESSAGE"),
      );
      expect(
        missingMessageErrors,
        `MISSING_MESSAGE console errors on ${route}`,
      ).toEqual([]);

      // Project name in the filename — desktop-1080 and laptop-768 both write
      // through this same test, and without it one viewport's screenshot
      // silently clobbers the other's (last one to finish wins the race).
      await page.screenshot({
        path: `test-results/rtl-sweep/${routeSlug(route)}-ar-${testInfo.project.name}.png`,
        fullPage: true,
      });
    });
  }
});

test.describe("i18n sweep — en (key-leak + console only)", () => {
  for (const route of ROUTES) {
    test(`${route} — no leaked keys, clean console`, async ({
      page,
      context,
      baseURL,
    }) => {
      const consoleErrors = collectConsoleErrors(page);

      await context.addCookies([
        { name: SESSION_COOKIE, value: "e2e-i18n-sweep", url: baseURL },
        { name: LOCALE_COOKIE, value: "en", url: baseURL },
      ]);

      const response = await page.goto(route);
      expect(response?.ok(), route).toBe(true);
      await page.waitForLoadState("networkidle");

      const bodyText = await page.evaluate(() => document.body.innerText);
      const leaked = bodyText.match(MESSAGE_KEY_LEAK_RE);
      expect(
        leaked,
        `leaked message key on ${route}: ${leaked?.[0]}`,
      ).toBeNull();

      const missingMessageErrors = consoleErrors.filter((e) =>
        e.includes("MISSING_MESSAGE"),
      );
      expect(
        missingMessageErrors,
        `MISSING_MESSAGE console errors on ${route}`,
      ).toEqual([]);
    });
  }
});
