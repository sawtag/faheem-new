import type { Metadata } from "next";
import { cookies } from "next/headers";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import { Amiri, IBM_Plex_Sans_Arabic, Inter, Lora } from "next/font/google";
import { DEFAULT_LOCALE, LOCALE_COOKIE, LOCALES } from "@/lib/locale";
import type { Lang } from "@/lib/types";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const lora = Lora({ subsets: ["latin"], variable: "--font-lora" });
const plexArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex-arabic",
});
const amiri = Amiri({
  subsets: ["arabic"],
  weight: ["400", "700"],
  variable: "--font-amiri",
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("common");
  return {
    title: "Faheem · Lunar Investments",
    description: t("description"),
  };
}

async function resolveLocale(): Promise<Lang> {
  const store = await cookies();
  const value = store.get(LOCALE_COOKIE)?.value;
  return LOCALES.includes(value as Lang) ? (value as Lang) : DEFAULT_LOCALE;
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = await resolveLocale();
  const messages = await getMessages();
  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <html
      lang={locale}
      dir={dir}
      className={`${inter.variable} ${lora.variable} ${plexArabic.variable} ${amiri.variable}`}
    >
      {/* font vars must live on <html>: Tailwind @theme var() chains resolve at :root */}
      <body>
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
