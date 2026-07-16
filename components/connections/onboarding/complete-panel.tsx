"use client";

import * as React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { CheckDraw } from "@/components/connections/check-draw";
import { CountUp } from "@/components/connections/count-up";

/** Onboarding closing card, "this becomes your IC Charter" (design-briefs §2.4).
 *  Four workspace stats count up from real data, then Enter workspace. */
export function CompletePanel({
  systems,
  docs,
  pages,
  agents,
}: {
  systems: number;
  docs: number;
  pages: number;
  agents: number;
}) {
  const t = useTranslations("onboarding");

  // Mark the firm onboarded so the home setup card stops offering setup.
  React.useEffect(() => {
    localStorage.setItem("faheem_onboarding_done", "1");
  }, []);

  const stats = [
    { key: "systems", value: systems },
    { key: "docs", value: docs },
    { key: "pages", value: pages },
    { key: "agents", value: agents },
  ] as const;

  return (
    <div className="flex flex-col items-center text-center">
      <CheckDraw size={48} />
      <h2 className="text-h2 text-navy mt-5 font-extrabold">
        {t("done.title")}
      </h2>
      <p className="text-text-secondary mt-2 max-w-[440px] text-sm">
        {t("done.caption")}
      </p>

      <div className="border-border divide-border rounded-card mt-7 grid w-full max-w-[600px] grid-cols-4 divide-x border">
        {stats.map(({ key, value }) => (
          <div key={key} className="flex flex-col items-center gap-1 px-3 py-4">
            <CountUp
              value={value}
              className="text-navy text-2xl font-extrabold"
            />
            <span className="text-text-secondary text-xs font-medium">
              {t(`stats.${key}`)}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-7 flex items-center gap-3">
        <Button asChild>
          <Link href="/">{t("done.enter")}</Link>
        </Button>
        <Button variant="ghost" asChild>
          <a
            href="/api/documents/lunar-ic-charter"
            target="_blank"
            rel="noopener noreferrer"
          >
            {t("done.open")}
          </a>
        </Button>
      </div>
    </div>
  );
}
