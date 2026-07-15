import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowLeft, LineChart } from "lucide-react";
import { GlyphBackdrop } from "@/components/ui/glyph-backdrop";
import type { Lang, Localized } from "@/lib/types";

/**
 * Tasteful bilingual empty state for companies without a live model (only
 * Jahez has one today) — house empty-state pattern: mono glyph, title,
 * roadmap caption, back link.
 */
export async function ModelEmptyState({
  companyId,
  companyName,
}: {
  companyId: string;
  companyName: Localized;
}) {
  const [t, localeValue] = await Promise.all([getTranslations(), getLocale()]);
  const locale = localeValue as Lang;

  return (
    <main className="mx-auto max-w-[1040px] px-8 pt-10 pb-16">
      <Link
        href={`/deals/${companyId}`}
        className="text-text-secondary hover:text-navy focus-visible:ring-accent focus-visible:ring-offset-bg rounded-btn inline-flex items-center gap-1.5 text-[0.8125rem] font-semibold transition-colors duration-[var(--duration-fast)] ease-[var(--ease)] outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
      >
        <ArrowLeft className="size-4 rtl:-scale-x-100" aria-hidden="true" />
        {t("model.live.empty.back")}
      </Link>

      <div className="relative isolate mt-16 flex flex-col items-center gap-5 text-center">
        <GlyphBackdrop variant="panel" />
        <span className="border-border bg-card text-navy-300 rounded-card grid size-16 place-items-center border shadow-[var(--shadow-card)]">
          <LineChart className="size-7" aria-hidden="true" />
        </span>
        <div className="flex max-w-md flex-col gap-2">
          <h1 className="text-navy text-xl font-bold">
            {t("model.live.empty.title")}
          </h1>
          <p className="text-text-secondary text-sm leading-relaxed">
            {t("model.live.empty.caption", { company: companyName[locale] })}
          </p>
        </div>
      </div>
    </main>
  );
}
