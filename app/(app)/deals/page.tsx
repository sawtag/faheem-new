import { getTranslations } from "next-intl/server";
import { PipelineBoard } from "@/components/deals/pipeline-board";
import { DEALS } from "@/lib/deals";

/**
 * Deal pipeline board (spec §4 item 4) — origin filter pills over
 * stage-grouped deal cards. Carries the private→public pivot on screen.
 */
export default async function DealsPage() {
  const t = await getTranslations("deals.board");

  return (
    <main className="mx-auto max-w-[1040px] px-8 pt-10 pb-16">
      <header className="mb-8">
        <h1 className="text-h1 text-navy font-extrabold">{t("title")}</h1>
        <p className="text-text-secondary mt-2 text-[0.9375rem]">
          {t("subtitle")}
        </p>
      </header>
      <PipelineBoard deals={DEALS} />
    </main>
  );
}
