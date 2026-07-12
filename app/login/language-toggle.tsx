"use client";

import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { LOCALE_COOKIE } from "@/lib/locale";
import type { Lang } from "@/lib/types";

/**
 * design-briefs.md §1.2 — top inline-end pill, white 70% opacity on
 * transparent, hover white 100%. The "EN | عربي" label is a fixed bilingual
 * toggle glyph (like an @id or the wordmark) rather than per-locale copy, so
 * it is not routed through next-intl; kept `dir="ltr"` so the separator never
 * reorders under RTL.
 */
export function LanguageToggle() {
  const router = useRouter();
  const locale = useLocale() as Lang;

  function toggleLocale() {
    const next: Lang = locale === "ar" ? "en" : "ar";
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000`;
    router.refresh();
  }

  return (
    <Badge
      asChild
      variant="neutral"
      size="sm"
      className="absolute end-6 top-6 z-20 border-none bg-transparent px-3 py-1.5 text-xs text-white/70 hover:bg-transparent hover:text-white"
    >
      <button type="button" onClick={toggleLocale} dir="ltr">
        EN | عربي
      </button>
    </Badge>
  );
}
