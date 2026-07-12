import { getTranslations } from "next-intl/server";
import { LocaleToggle } from "@/components/locale-toggle";

/**
 * Placeholder home screen (T0.1 scaffold only) — proves the en/ltr <-> ar/rtl
 * cookie switch works end-to-end. Replaced by the real omnibox home in T3.2.
 */
export default async function HomePage() {
  const t = await getTranslations("common");

  return (
    <main>
      <h1>{t("appName")}</h1>
      <p>{t("tagline")}</p>
      <LocaleToggle />
    </main>
  );
}
