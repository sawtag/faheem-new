import { ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";

/**
 * The governance line of the whole demo, made permanent: Faheem advises, the
 * committee decides. Persistent (never dismissible), sits directly under the
 * page title so it is visible without scrolling, human gate #3.
 */
export function AdvisoryDisclaimer() {
  const t = useTranslations("ic");
  return (
    <div
      role="note"
      data-testid="ic-advisory-disclaimer"
      className="bg-navy-50 text-navy-700 rounded-card flex items-center gap-2.5 px-4 py-2.5"
    >
      <ShieldCheck
        className="text-navy size-[18px] shrink-0"
        aria-hidden="true"
      />
      <p className="text-[0.9375rem] font-semibold">{t("disclaimer")}</p>
    </div>
  );
}
