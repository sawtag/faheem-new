"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { LOCALE_COOKIE } from "@/lib/locale";
import type { Lang } from "@/lib/types";

/**
 * Placeholder locale toggle (T0.1 scaffold only) — sets the locale cookie
 * and refreshes so the server re-renders with the new `lang`/`dir`.
 */
export function LocaleToggle() {
  const t = useTranslations("common");
  const router = useRouter();

  function toggleLocale() {
    const current = document.documentElement.lang as Lang;
    const next: Lang = current === "ar" ? "en" : "ar";
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000`;
    router.refresh();
  }

  return (
    <button type="button" onClick={toggleLocale}>
      {t("toggleLocale")}
    </button>
  );
}
