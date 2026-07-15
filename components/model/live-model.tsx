"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowLeft, RotateCcw, Sparkles, X } from "lucide-react";
import manifest from "@/data/corpus/manifest.json";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MethodologyPanel } from "@/components/model/methodology-panel";
import { AssumptionsTab } from "@/components/model/assumptions-tab";
import { EditComposer } from "@/components/model/edit-composer";
import { DcfTab } from "@/components/model/dcf-tab";
import { SensitivityTab } from "@/components/model/sensitivity-tab";
import { ModelCell, ModelProvider } from "@/components/model/model-grid";
import { useLiveModel } from "@/components/model/use-live-model";
import { cn, formatPercent, formatSAR } from "@/lib/utils";
import type { CorpusDoc, Lang, Localized } from "@/lib/types";
import type { ModelKey } from "@/lib/model/types";

const PdfPanel = dynamic(() => import("@/components/chat/pdf-panel"), {
  ssr: false,
  loading: () => <div className="bg-card size-full" />,
});

const EASE = [0.4, 0, 0.2, 1] as const;
const DOC_TITLES = new Map(
  (manifest as CorpusDoc[]).map((d) => [d.id, d.title]),
);

/** Count-up from 0 on reveal, then animate value→value on recompute. */
function HeroNumber({
  value,
  format,
}: {
  value: number;
  format: (v: number) => string;
}) {
  const reduce = useReducedMotion();
  const mv = useMotionValue(reduce ? value : 0);
  const text = useTransform(mv, (v) => format(v));
  React.useEffect(() => {
    if (reduce) {
      mv.set(value);
      return;
    }
    const controls = animate(mv, value, { duration: 0.4, ease: EASE });
    return () => controls.stop();
  }, [value, reduce, mv]);
  return <motion.span className="financial tabular-nums">{text}</motion.span>;
}

/** "N values updated" chip, mounts fresh per recompute (keyed on nonce) and
 * self-dismisses; no setState in an effect body. */
function DiffChip({ label }: { label: string }) {
  const [shown, setShown] = React.useState(true);
  React.useEffect(() => {
    const id = setTimeout(() => setShown(false), 2600);
    return () => clearTimeout(id);
  }, []);
  return (
    <AnimatePresence>
      {shown && (
        <motion.span
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.2, ease: EASE }}
          data-testid="diff-chip"
          className="bg-accent-50 text-accent-700 financial rounded-pill inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold tabular-nums"
        >
          <Sparkles className="size-3.5" aria-hidden="true" />
          {label}
        </motion.span>
      )}
    </AnimatePresence>
  );
}

function ScenarioStripCard({
  scenario,
}: {
  scenario: "bull" | "base" | "bear";
}) {
  const t = useTranslations();
  const locale = useLocale() as Lang;
  const { outputs } = useLiveModelCtx();
  const prob = outputs.nodes[`assumptions.prob${cap(scenario)}`];
  return (
    <div className="border-border bg-card rounded-card flex flex-col gap-2 border p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-navy text-xs font-bold">
          {t(`model.nodes.scenarios.${scenario}`)}
        </span>
        {prob && (
          <span className="text-text-secondary financial text-[0.625rem] tabular-nums">
            {t("model.live.strip.weight", {
              value: formatPercent(prob.value, locale, { decimals: 0 }),
            })}
          </span>
        )}
      </div>
      <table className="w-full" dir="ltr">
        <tbody>
          <tr>
            <th
              scope="row"
              className="text-text-secondary pe-2 text-start text-[0.625rem] font-medium whitespace-nowrap"
            >
              {t("model.live.strip.perShare")}
            </th>
            <ModelCell nodeKey={`${scenario}.perShare`} className="w-24" />
          </tr>
          <tr>
            <th
              scope="row"
              className="text-text-secondary pe-2 text-start text-[0.625rem] font-medium whitespace-nowrap"
            >
              {t("model.live.strip.irr")}
            </th>
            <ModelCell nodeKey={`${scenario}.irr`} className="w-24" />
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// A thin context so the strip cards can read `outputs` without prop-drilling.
const LiveOutputsCtx = React.createContext<ReturnType<
  typeof useLiveModel
> | null>(null);
function useLiveModelCtx() {
  const v = React.useContext(LiveOutputsCtx);
  if (!v) throw new Error("useLiveModelCtx outside provider");
  return v;
}

export function LiveModel({
  companyId,
  companyName,
}: {
  companyId: string;
  companyName: Localized;
}) {
  const t = useTranslations();
  const locale = useLocale() as Lang;
  const model = useLiveModel();
  const { outputs, reset, isBase, lastDiff, changedKeys, setAssumption } =
    model;

  const [selectedKey, setSelectedKey] = React.useState<ModelKey | null>(null);
  const [openDoc, setOpenDoc] = React.useState<{
    docId: string;
    page: number;
  } | null>(null);

  const select = React.useCallback((key: ModelKey) => setSelectedKey(key), []);

  const nodes = outputs.nodes;
  const perShare = nodes["base.perShare"]!;
  const weightedIrr = nodes.weightedReturn!;
  const upside = nodes["base.upside"]!;
  const price = nodes.price!;
  const slideFrom = locale === "ar" ? -28 : 28;

  const docTitle = (docId: string) => DOC_TITLES.get(docId)?.[locale] ?? docId;

  return (
    <LiveOutputsCtx.Provider value={model}>
      <ModelProvider
        value={{
          nodes,
          selectedKey,
          changedKeys,
          changeNonce: lastDiff.nonce,
          select,
          setAssumption,
        }}
      >
        <motion.main
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: EASE }}
          className={cn(
            "max-w-[1180px] px-8 pt-10 pb-20 transition-[margin] duration-[var(--duration)] ease-[var(--ease)]",
            // master-detail: reflow left so the sheet never covers the toolbar
            selectedKey || openDoc ? "ms-8 me-[440px]" : "mx-auto",
          )}
        >
          <Link
            href={`/deals/${companyId}`}
            className="text-text-secondary hover:text-navy focus-visible:ring-accent focus-visible:ring-offset-bg rounded-btn inline-flex items-center gap-1.5 text-[0.8125rem] font-semibold transition-colors duration-[var(--duration-fast)] ease-[var(--ease)] outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          >
            <ArrowLeft className="size-4 rtl:-scale-x-100" aria-hidden="true" />
            {t("model.live.back")}
          </Link>

          {/* header + hero */}
          <header className="mt-5 flex flex-wrap items-end justify-between gap-6">
            <div className="min-w-0">
              <p className="text-accent-700 mb-1 flex items-center gap-1.5 text-xs font-bold tracking-[0.08em] uppercase">
                <Sparkles className="size-3.5" aria-hidden="true" />
                {t("model.live.eyebrow")}
              </p>
              <h1
                className="text-navy font-serif text-4xl leading-tight font-bold"
                style={{
                  fontFamily:
                    "var(--font-lora), var(--font-amiri), Georgia, serif",
                }}
              >
                {companyName[locale]}
              </h1>
              <p className="text-text-secondary mt-1.5 text-[0.8125rem]">
                {t("model.live.hero.recomputes")}
              </p>
            </div>

            <div className="flex items-end gap-8">
              <div className="flex flex-col">
                <span className="text-text-secondary text-xs font-semibold tracking-wide uppercase">
                  {t("model.live.hero.perShare")}
                </span>
                <span className="text-navy text-3xl font-extrabold">
                  <HeroNumber
                    value={perShare.value}
                    format={(v) =>
                      formatSAR(v, locale, { unit: "abs", decimals: 2 })
                    }
                  />
                </span>
                <span className="text-text-secondary financial mt-0.5 text-[0.6875rem] tabular-nums">
                  {t("model.live.hero.vsPrice", {
                    price: formatSAR(price.value, locale, {
                      unit: "abs",
                      decimals: 2,
                    }).replace("SAR ", ""),
                    upside: formatPercent(upside.value, locale, {
                      signed: true,
                    }),
                  })}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-text-secondary text-xs font-semibold tracking-wide uppercase">
                  {t("model.live.hero.weightedIrr")}
                </span>
                <span className="text-accent-700 text-3xl font-extrabold">
                  <HeroNumber
                    value={weightedIrr.value}
                    format={(v) => formatPercent(v, locale, { decimals: 1 })}
                  />
                </span>
              </div>
            </div>
          </header>

          {/* scenario strip + toolbar */}
          <div className="mt-6 flex flex-wrap items-stretch justify-between gap-4">
            <div className="grid min-w-0 flex-1 grid-cols-1 gap-3 sm:grid-cols-3">
              <ScenarioStripCard scenario="bear" />
              <ScenarioStripCard scenario="base" />
              <ScenarioStripCard scenario="bull" />
            </div>
            <div className="flex items-center gap-3">
              {lastDiff.nonce > 0 && (
                <DiffChip
                  key={lastDiff.nonce}
                  label={t("model.live.diff", { count: lastDiff.count })}
                />
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={reset}
                disabled={isBase}
                startIcon={
                  <RotateCcw
                    className="size-3.5 rtl:-scale-x-100"
                    aria-hidden="true"
                  />
                }
              >
                {t("model.live.reset")}
              </Button>
            </div>
          </div>

          {/* conversational edit, WS-C */}
          <EditComposer model={model} companyId={companyId} />

          {/* tabs */}
          <Tabs defaultValue="assumptions" className="mt-8">
            <TabsList>
              <TabsTrigger value="assumptions">
                {t("model.live.tabs.assumptions")}
              </TabsTrigger>
              <TabsTrigger value="dcf">{t("model.live.tabs.dcf")}</TabsTrigger>
              <TabsTrigger value="sensitivity">
                {t("model.live.tabs.sensitivity")}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="assumptions" className="mt-6">
              <AssumptionsTab />
            </TabsContent>
            <TabsContent value="dcf" className="mt-6">
              <DcfTab />
            </TabsContent>
            <TabsContent value="sensitivity" className="mt-6">
              <SensitivityTab />
            </TabsContent>
          </Tabs>
        </motion.main>

        {/* methodology side sheet */}
        <AnimatePresence>
          {selectedKey && (
            <motion.aside
              key="methodology"
              initial={{ opacity: 0, x: slideFrom }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: slideFrom }}
              transition={{ duration: 0.25, ease: EASE }}
              className="border-border bg-card fixed inset-y-0 end-0 z-40 flex w-[420px] max-w-[92vw] flex-col border-s shadow-[var(--shadow-modal)]"
              data-testid="methodology-sheet"
            >
              <div className="border-border flex h-14 shrink-0 items-center justify-between border-b px-4">
                <p className="text-navy text-sm font-bold">
                  {t("model.live.panel.title")}
                </p>
                <button
                  type="button"
                  onClick={() => setSelectedKey(null)}
                  aria-label={t("model.live.panel.close")}
                  className="text-text-secondary hover:bg-navy-50 hover:text-navy focus-visible:ring-accent focus-visible:ring-offset-card rounded-btn grid size-8 place-items-center outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-5">
                <MethodologyPanel
                  nodeKey={selectedKey}
                  nodes={nodes}
                  onNavigate={setSelectedKey}
                  onOpenSource={(docId, page) => setOpenDoc({ docId, page })}
                />
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* source PDF, drilled from a sourced leaf, sits above the sheet */}
        <AnimatePresence>
          {openDoc && (
            <motion.aside
              key="pdf"
              initial={{ opacity: 0, x: slideFrom }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: slideFrom }}
              transition={{ duration: 0.25, ease: EASE }}
              className="border-border bg-card fixed inset-y-0 end-0 z-50 w-[44%] max-w-[640px] min-w-[400px] border-s shadow-[var(--shadow-modal)]"
            >
              <PdfPanel
                key={openDoc.docId}
                docId={openDoc.docId}
                page={openDoc.page}
                title={docTitle(openDoc.docId)}
                onClose={() => setOpenDoc(null)}
                onPageChange={(page) =>
                  setOpenDoc((d) => (d ? { ...d, page } : d))
                }
              />
            </motion.aside>
          )}
        </AnimatePresence>
      </ModelProvider>
    </LiveOutputsCtx.Provider>
  );
}
