import type { Lang } from "@/lib/types";

/**
 * Locale constants shared between server (request config, layout) and
 * client (locale toggle) code. Kept isolated from lib/i18n.ts so this
 * module never pulls `next/headers` into a client bundle.
 */
export const LOCALE_COOKIE = "faheem_locale";
export const DEFAULT_LOCALE: Lang = "en";
export const LOCALES: Lang[] = ["en", "ar"];
