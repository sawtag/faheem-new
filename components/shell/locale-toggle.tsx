"use client";

import { Globe } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { LOCALE_COOKIE } from "@/lib/locale";
import type { Lang } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Language toggle — flips the `faheem_locale` cookie and refreshes so the
 * server re-renders `lang`/`dir`. AppShell crossfades the content region on the
 * locale change (keyed motion), so this control just does the swap.
 */
export function LocaleToggle({ collapsed = false }: { collapsed?: boolean }) {
  const locale = useLocale() as Lang;
  const t = useTranslations("shell");
  const tCommon = useTranslations("common");
  const router = useRouter();

  function toggle() {
    const next: Lang = locale === "ar" ? "en" : "ar";
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000`;
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={t("switchLanguage")}
      title={t("switchLanguage")}
      className={cn(
        "text-text-secondary hover:bg-navy-50 hover:text-navy focus-visible:ring-accent focus-visible:ring-offset-card rounded-pill inline-flex items-center gap-2 text-sm font-semibold transition-colors duration-[var(--duration-fast)] ease-[var(--ease)] outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        collapsed ? "size-9 justify-center" : "px-2.5 py-1.5",
      )}
    >
      <Globe className="size-4 shrink-0" aria-hidden="true" />
      {!collapsed && <span>{tCommon("toggleLocale")}</span>}
    </button>
  );
}
