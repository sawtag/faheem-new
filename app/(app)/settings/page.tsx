import Link from "next/link";
import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";
import { ArrowRight, KeyRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CountUp } from "@/components/connections/count-up";
import { LocaleToggle } from "@/components/shell/locale-toggle";
import { ModeSection } from "@/components/settings/mode-section";
import { recordedAnswerCount } from "@/lib/ai/cache";
import { resolveMode } from "@/lib/ai/mode";
import manifest from "@/data/corpus/manifest.json";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-text-secondary text-[0.8125rem] font-bold tracking-[0.04em] uppercase">
      {children}
    </h2>
  );
}

/**
 * /settings (settings spec, 2026-07-16): the answer-engine mode switch as the
 * centerpiece, plus environment facts, preferences, and governance copy. All
 * facts resolve server-side per request; only the API key's PRESENCE (a
 * boolean) ever reaches the client, never the value.
 */
export default async function SettingsPage() {
  const t = await getTranslations("settings");
  const store = await cookies();
  const cookieMode = store.get("faheem_mode")?.value;
  const overridden =
    cookieMode === "live" || cookieMode === "auto" || cookieMode === "cached";
  const keyConfigured = Boolean(
    process.env.ANTHROPIC_API_KEY || process.env.FAHEEM_ANTHROPIC_KEY,
  );

  return (
    <main className="mx-auto max-w-[960px] px-8 pt-10 pb-16">
      <h1 className="text-h1 text-navy font-extrabold">{t("title")}</h1>
      <p className="text-text-secondary mt-2 text-[0.9375rem]">
        {t("subtitle")}
      </p>

      <div className="mt-8 flex flex-col gap-10">
        <ModeSection
          initialMode={resolveMode(cookieMode)}
          envDefault={resolveMode(undefined)}
          initiallyOverridden={overridden}
          keyConfigured={keyConfigured}
        />

        <section aria-label={t("environment.label")}>
          <SectionLabel>{t("environment.label")}</SectionLabel>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Card padding="sm" elevated className="flex min-w-0 flex-col">
              <p className="text-text-secondary text-xs font-semibold tracking-[0.04em] uppercase">
                {t("environment.recorded")}
              </p>
              <p className="text-navy mt-1.5 text-2xl font-extrabold">
                <CountUp value={recordedAnswerCount()} />
              </p>
              <p className="text-text-secondary mt-auto pt-2 text-xs">
                {t("environment.recordedCaption")}
              </p>
            </Card>
            <Card padding="sm" elevated className="flex min-w-0 flex-col">
              <p className="text-text-secondary text-xs font-semibold tracking-[0.04em] uppercase">
                {t("environment.corpus")}
              </p>
              <p className="text-navy mt-1.5 text-2xl font-extrabold">
                <CountUp value={manifest.length} />
              </p>
              <p className="text-text-secondary mt-auto pt-2 text-xs">
                {t("environment.corpusCaption")}
              </p>
            </Card>
            <Card padding="sm" elevated className="flex min-w-0 flex-col">
              <p className="text-text-secondary text-xs font-semibold tracking-[0.04em] uppercase">
                {t("environment.apiKey")}
              </p>
              <p className="mt-2">
                <Badge variant={keyConfigured ? "mint" : "warning"}>
                  <KeyRound className="size-3" aria-hidden="true" />
                  {keyConfigured
                    ? t("environment.configured")
                    : t("environment.notConfigured")}
                </Badge>
              </p>
              <p className="text-text-secondary mt-auto pt-2 text-xs">
                {t("environment.apiKeyCaption")}
              </p>
            </Card>
          </div>
        </section>

        <section aria-label={t("preferences.label")}>
          <SectionLabel>{t("preferences.label")}</SectionLabel>
          <Card padding="sm" className="mt-3 flex items-center gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-navy text-sm font-bold">
                {t("preferences.language")}
              </p>
              <p className="text-text-secondary mt-0.5 text-xs">
                {t("preferences.languageCaption")}
              </p>
            </div>
            <LocaleToggle />
          </Card>
        </section>

        <section aria-label={t("governance.label")}>
          <SectionLabel>{t("governance.label")}</SectionLabel>
          <Card padding="sm" className="mt-3">
            <p className="text-text-secondary text-[0.8125rem] leading-relaxed">
              {t("governance.copy")}
            </p>
            <div className="mt-3 flex flex-wrap gap-4">
              <Link
                href="/audit"
                className="text-accent-700 hover:text-accent-800 focus-visible:ring-accent focus-visible:ring-offset-card rounded-btn inline-flex items-center gap-1 text-xs font-semibold outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
              >
                {t("governance.auditLink")}
                <ArrowRight
                  className="size-3 rtl:-scale-x-100"
                  aria-hidden="true"
                />
              </Link>
              <Link
                href="/connections"
                className="text-accent-700 hover:text-accent-800 focus-visible:ring-accent focus-visible:ring-offset-card rounded-btn inline-flex items-center gap-1 text-xs font-semibold outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
              >
                {t("governance.connectionsLink")}
                <ArrowRight
                  className="size-3 rtl:-scale-x-100"
                  aria-hidden="true"
                />
              </Link>
            </div>
          </Card>
        </section>
      </div>
    </main>
  );
}
