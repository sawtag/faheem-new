import Link from "next/link";
import { Minus } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { CheckDraw } from "@/components/connections/check-draw";
import { CountUp } from "@/components/connections/count-up";
import type { MandateState } from "@/components/connections/onboarding/mandate-state";

/** Onboarding closing card — "this becomes your IC Charter" (design-briefs §2.4). */
export function CompletePanel({ mandate }: { mandate: MandateState }) {
  const t = useTranslations("onboarding");

  return (
    <div className="flex h-full flex-col items-center justify-center py-8 text-center">
      <CheckDraw size={48} />
      <h2 className="text-h2 text-navy mt-5 font-extrabold">
        {t("done.title")}
      </h2>
      <p className="text-text-secondary mt-2 max-w-[420px] text-sm">
        {t("done.caption")}
      </p>

      <div className="border-border divide-border rounded-card mt-6 grid w-full max-w-[480px] grid-cols-3 divide-x border">
        <div className="flex flex-col items-center gap-1 px-4 py-4">
          <CountUp
            value={Number(mandate.irr)}
            suffix="%"
            className="text-navy text-xl font-extrabold"
          />
          <span className="text-text-secondary text-xs font-medium">
            {t("mandate.irr")}
          </span>
        </div>
        <div className="flex flex-col items-center gap-1 px-4 py-4">
          <CountUp
            value={Number(mandate.concentration)}
            suffix="%"
            className="text-navy text-xl font-extrabold"
          />
          <span className="text-text-secondary text-xs font-medium">
            {t("mandate.concentration")}
          </span>
        </div>
        <div className="flex flex-col items-center gap-1 px-4 py-4">
          {mandate.shariah ? (
            <CheckDraw size={20} />
          ) : (
            <Minus className="text-text-secondary size-5" aria-hidden="true" />
          )}
          <span className="text-text-secondary text-xs font-medium">
            {t("mandate.shariah")}
          </span>
        </div>
      </div>

      <div className="mt-6 flex items-center gap-3">
        <Button asChild>
          <a
            href="/api/documents/lunar-ic-charter"
            target="_blank"
            rel="noopener noreferrer"
          >
            {t("done.open")}
          </a>
        </Button>
        <Button variant="ghost" asChild>
          <Link href="/">{t("done.home")}</Link>
        </Button>
      </div>
    </div>
  );
}
