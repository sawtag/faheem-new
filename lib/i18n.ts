import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { DEFAULT_LOCALE, LOCALE_COOKIE, LOCALES } from "@/lib/locale";
import type { Lang } from "@/lib/types";

/** Cookie-based locale, no URL routing, no middleware (AGENTS.md / T0.1 scope). */
export default getRequestConfig(async () => {
  const store = await cookies();
  const cookieValue = store.get(LOCALE_COOKIE)?.value;
  const locale: Lang = LOCALES.includes(cookieValue as Lang)
    ? (cookieValue as Lang)
    : DEFAULT_LOCALE;

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
