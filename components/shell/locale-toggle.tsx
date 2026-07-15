"use client";

import { Globe } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { LOCALE_COOKIE } from "@/lib/locale";
import type { Lang } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Language toggle, flips the `faheem_locale` cookie and refreshes so the
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
        // bordered chip: reads clickable on the rail's tinted footer band
        "border-border bg-card text-text-secondary hover:border-navy-300 hover:text-navy focus-visible:ring-accent focus-visible:ring-offset-card rounded-pill inline-flex items-center gap-1.5 border text-xs font-semibold shadow-[var(--shadow-card)] transition-colors duration-[var(--duration-fast)] ease-[var(--ease)] outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        collapsed ? "size-8 justify-center" : "px-2.5 py-1",
      )}
    >
      <Globe className="size-3.5 shrink-0" aria-hidden="true" />
      {!collapsed && <span>{tCommon("toggleLocale")}</span>}
    </button>
  );
}
