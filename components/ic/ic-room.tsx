"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { ComparisonTable } from "@/components/ic/comparison-table";
import { AdvisoryDisclaimer } from "@/components/ic/advisory-disclaimer";
import { IcChatPanel } from "@/components/ic/ic-chat-panel";
import { GlyphBackdrop } from "@/components/ui/glyph-backdrop";
import manifest from "@/data/corpus/manifest.json";
import type { CorpusDoc, Deal, Lang } from "@/lib/types";
import { formatDate, formatPercent } from "@/lib/utils";

const PdfPanel = dynamic(() => import("@/components/chat/pdf-panel"), {
  ssr: false,
  loading: () => <div className="bg-card size-full" />,
});

const DOC_TITLES = new Map(
  (manifest as CorpusDoc[]).map((d) => [d.id, d.title]),
);

interface OpenDoc {
  docId: string;
  page: number;
}

/**
 * The Faheem IC room — the demo's closing beat. A Bloomberg-terminal committee
 * sheet (ComparisonTable) beside the advisory chat, under a permanent
 * advisory-only banner. Owns the shared PdfPanel so both the recommendation
 * cite chips and the chat citations open the same document viewer.
 */
export function IcRoom({
  columns,
  dateISO,
}: {
  columns: Deal[];
  dateISO: string;
}) {
  const t = useTranslations("ic");
  const locale = useLocale() as Lang;
  const reduce = useReducedMotion();

  const [openDoc, setOpenDoc] = React.useState<OpenDoc | null>(null);
  const onOpenDoc = React.useCallback(
    (docId: string, page: number) => setOpenDoc({ docId, page }),
    [],
  );

  const hurdle = columns.find((d) => d.icMetrics)?.icMetrics?.hurdle;
  const subtitle = t("subtitle", {
    date: formatDate(dateISO, locale),
    count: String(columns.length),
    hurdle:
      hurdle != null ? formatPercent(hurdle, locale, { decimals: 0 }) : "",
  });

  const openDocTitle = openDoc
    ? (DOC_TITLES.get(openDoc.docId)?.[locale] ?? openDoc.docId)
    : "";
  const slideFrom = locale === "ar" ? -32 : 32;

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      className="relative flex h-screen flex-col"
    >
      <header className="relative isolate shrink-0 px-8 pt-8 pb-5">
        <GlyphBackdrop variant="panel" />
        <h1 className="text-navy relative z-10 font-serif text-[2.125rem] leading-tight font-semibold">
          {t("title")}
        </h1>
        <p className="text-text-secondary relative z-10 mt-1.5 text-[0.9375rem]">
          {subtitle}
        </p>
      </header>

      <div className="shrink-0 px-8">
        <AdvisoryDisclaimer />
      </div>

      <div className="border-border mt-6 flex min-h-0 flex-1 border-t">
        <section className="flex min-w-0 flex-1 flex-col overflow-y-auto px-8 py-6">
          {/* my-auto centres the sheet + note in the tall column so a six-row
             table doesn't leave the page half-empty at 1080, while still
             scrolling top-aligned when the viewport is short. */}
          <div className="my-auto">
            <ComparisonTable columns={columns} onOpenDoc={onOpenDoc} />
            <p className="text-text-secondary mt-4 text-xs leading-relaxed">
              {t("tableNote")}
            </p>
          </div>
        </section>
        <aside className="border-border w-[23rem] shrink-0 border-s xl:w-[26rem]">
          <IcChatPanel onOpenDoc={onOpenDoc} />
        </aside>
      </div>

      <AnimatePresence>
        {openDoc && (
          <>
            <motion.div
              key="scrim"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
              onClick={() => setOpenDoc(null)}
              className="bg-navy-950/10 absolute inset-0 z-20"
            />
            <motion.aside
              key="pdf"
              initial={{ opacity: 0, x: slideFrom }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: slideFrom }}
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
              className="border-border bg-card absolute inset-y-0 end-0 z-30 w-[45%] max-w-[640px] min-w-[400px] border-s shadow-[var(--shadow-modal)]"
            >
              <PdfPanel
                key={openDoc.docId}
                docId={openDoc.docId}
                page={openDoc.page}
                title={openDocTitle}
                onClose={() => setOpenDoc(null)}
                onPageChange={(page) =>
                  setOpenDoc((d) => (d ? { ...d, page } : d))
                }
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
