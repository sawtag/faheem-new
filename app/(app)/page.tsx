import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Logo } from "@/components/ui/logo";

/**
 * Minimal home placeholder (T2.2). The real omnibox hero is T3.2's — this only
 * keeps `/` mounting inside the shell with a clean entry into a new chat.
 */
export default async function HomePage() {
  const t = await getTranslations("chat");
  const tShell = await getTranslations("shell");
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
      <Logo variant="vertical" size={48} />
      <div className="max-w-md">
        <h1 className="text-navy text-h2 font-extrabold">{t("empty.title")}</h1>
        <p className="text-text-secondary mt-2 text-[0.9375rem]">
          {t("empty.subtitle")}
        </p>
      </div>
      <Link
        href="/chat/new"
        className="bg-navy text-card hover:bg-navy-800 focus-visible:ring-accent focus-visible:ring-offset-bg rounded-btn inline-flex h-11 items-center px-5 text-base font-extrabold transition-colors duration-[var(--duration-fast)] ease-[var(--ease)] outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
      >
        {tShell("newChat")}
      </Link>
    </div>
  );
}
