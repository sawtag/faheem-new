"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { Download, FileText, Lock, Sheet, Sparkles, X } from "lucide-react";
import manifest from "@/data/corpus/manifest.json";
import { BASE_ASSUMPTIONS, buildModel } from "@/lib/model/compute";
import { FORMULAS } from "@/lib/model/formulas";
import { buildWorkbook, type WorkbookCell } from "@/lib/model/workbook";
import { getNodeLabel } from "@/components/model/node-label";
import { formatNodeValue } from "@/components/model/format";
import { Formula } from "@/components/model/formula";
import { Badge } from "@/components/ui/badge";
import { stashCitationHighlight } from "@/components/chat/highlight-bus";
import { cn } from "@/lib/utils";
import type { ArtifactMeta, CorpusDoc, Lang } from "@/lib/types";
import type { ModelKey, ValueNode } from "@/lib/model/types";

const PdfPanel = dynamic(() => import("@/components/chat/pdf-panel"), {
  ssr: false,
  loading: () => <div className="bg-card size-full" />,
});

const EASE = [0.4, 0, 0.2, 1] as const;
const DOC_TITLES = new Map(
  (manifest as CorpusDoc[]).map((d) => [d.id, d.title]),
);

const ICON_BTN =
  "text-text-secondary hover:bg-navy-50 hover:text-navy focus-visible:ring-accent focus-visible:ring-offset-card rounded-btn grid size-8 shrink-0 place-items-center transition-colors duration-[var(--duration-fast)] ease-[var(--ease)] outline-none focus-visible:ring-2 focus-visible:ring-offset-2";

/** Per-cell tint by provenance kind, mirroring the workbook's own styling
 * (sourced = warm grey, assumption = gold, computed = plain) and the Live
 * Model grid's vocabulary. */
const KIND_CELL: Record<ValueNode["provenance"]["kind"], string> = {
  sourced: "bg-navy-50/50 hover:bg-navy-50",
  assumption: "bg-warning-50 hover:bg-warning-50 border-warning-700/20",
  computed: "hover:bg-navy-50/60",
};

/**
 * In-app workbook viewer: the generated Jahez valuation model, opened as a
 * side panel beside the chat (same slide-in family as PdfPanel / ArtifactPreview).
 * Sheet tabs across the top, a scrollable spreadsheet grid, and a formula bar
 * that, on cell select, shows the cell's formula + its "Source: doc, p.N"
 * provenance, exactly the comments the .xlsx builder writes.
 *
 * The grid is driven by lib/model/workbook (a client-safe layout) resolved
 * against buildModel().nodes, the SAME engine lib/generate/xlsx.ts builds from,
 * so the on-screen workbook can never drift from the downloadable file. The
 * binary .xlsx is never parsed in the browser.
 */
export function WorkbookPanel({
  meta,
  onClose,
}: {
  meta: ArtifactMeta | null;
  onClose: () => void;
}) {
  return (
    <AnimatePresence mode="wait">
      {meta && <Panel key={meta.id} meta={meta} onClose={onClose} />}
    </AnimatePresence>
  );
}

function Panel({ meta, onClose }: { meta: ArtifactMeta; onClose: () => void }) {
  const t = useTranslations();
  const locale = useLocale() as Lang;
  const reduce = useReducedMotion();

  const nodes = React.useMemo(() => buildModel(BASE_ASSUMPTIONS).nodes, []);
  const sheets = React.useMemo(() => buildWorkbook(), []);

  const [active, setActive] = React.useState(0);
  const [selected, setSelected] = React.useState<ModelKey | null>(null);
  const [openDoc, setOpenDoc] = React.useState<{
    docId: string;
    page: number;
  } | null>(null);

  const rootRef = React.useRef<HTMLElement>(null);
  React.useEffect(() => {
    rootRef.current?.focus({ preventScroll: true });
  }, []);

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Escape") {
      event.preventDefault();
      if (openDoc) setOpenDoc(null);
      else if (selected) setSelected(null);
      else onClose();
    }
  }

  const sheet = sheets[active]!;
  const slideFrom = locale === "ar" ? -28 : 28;

  return (
    <motion.aside
      ref={rootRef}
      initial={reduce ? false : { opacity: 0, x: slideFrom }}
      animate={{ opacity: 1, x: 0 }}
      exit={reduce ? undefined : { opacity: 0, x: slideFrom }}
      transition={{ duration: 0.25, ease: EASE }}
      role="dialog"
      aria-label={meta.name[locale]}
      data-testid="workbook-panel"
      tabIndex={-1}
      onKeyDown={onKeyDown}
      className="border-border bg-card fixed inset-y-0 end-0 z-40 flex w-[54%] max-w-[920px] min-w-[520px] flex-col border-s shadow-[var(--shadow-modal)] outline-none"
    >
      {/* header: kind tile + name + provenance caption + actions */}
      <div className="border-border flex h-16 shrink-0 items-center gap-3 border-b px-4">
        <span className="bg-accent-50 text-accent-700 rounded-btn grid size-9 shrink-0 place-items-center">
          <Sheet className="size-4.5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-navy truncate text-sm font-bold">
            {meta.name[locale]}
          </p>
          <p className="text-text-secondary truncate text-xs">
            {t("generate.workbook.subtitle")}
          </p>
        </div>
        <a
          href={meta.file}
          download
          aria-label={t("generate.preview.downloadFile")}
          title={t("generate.preview.downloadFile")}
          className={ICON_BTN}
        >
          <Download className="size-4" aria-hidden="true" />
        </a>
        <span className="bg-border mx-0.5 h-5 w-px" aria-hidden="true" />
        <button
          type="button"
          onClick={onClose}
          aria-label={t("generate.preview.close")}
          title={t("generate.preview.close")}
          className={ICON_BTN}
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>

      {/* sheet tabs */}
      <div
        role="tablist"
        aria-label={meta.name[locale]}
        className="faheem-scrollbar border-border flex shrink-0 items-center gap-1 overflow-x-auto border-b px-2"
      >
        {sheets.map((s, i) => (
          <button
            key={s.key}
            type="button"
            role="tab"
            aria-selected={i === active}
            onClick={() => {
              setActive(i);
              setSelected(null);
            }}
            className={cn(
              "focus-visible:ring-accent relative -mb-px inline-flex h-10 shrink-0 items-center border-b-2 px-3 text-[0.8125rem] font-semibold whitespace-nowrap transition-colors duration-[var(--duration-fast)] ease-[var(--ease)] outline-none focus-visible:ring-2",
              i === active
                ? "border-accent text-navy"
                : "text-text-secondary hover:text-navy border-transparent",
            )}
          >
            {t(`generate.workbook.tabs.${s.key}`)}
          </button>
        ))}
      </div>

      {/* grid body (numeric-LTR convention: columns read the same both locales).
          Keyed on the sheet so a tab switch remounts the grid and replays the
          enter fade, no exit choreography needed (a wait-mode swap would stall
          on the tall grid). */}
      <div className="bg-navy-50/30 min-h-0 flex-1 overflow-auto p-4" dir="ltr">
        <motion.div
          key={sheet.key}
          initial={reduce ? false : { opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18, ease: EASE }}
        >
          <table className="w-full border-collapse text-sm" role="grid">
            <tbody>
              {sheet.rows.map((row, ri) => (
                <Row
                  key={ri}
                  row={row}
                  nodes={nodes}
                  locale={locale}
                  t={t}
                  selected={selected}
                  onSelect={setSelected}
                />
              ))}
            </tbody>
          </table>
        </motion.div>
      </div>

      {/* formula bar: cell provenance on select, hint otherwise */}
      <FormulaBar
        node={selected ? (nodes[selected] ?? null) : null}
        nodeKey={selected}
        locale={locale}
        t={t}
        onOpenSource={(docId, page) => {
          stashCitationHighlight({ docId, page, quote: "" });
          setOpenDoc({ docId, page });
        }}
      />

      {/* source PDF, stacked above the workbook when a sourced cell is opened */}
      <AnimatePresence>
        {openDoc && (
          <motion.aside
            key="pdf"
            initial={reduce ? false : { opacity: 0, x: slideFrom }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduce ? undefined : { opacity: 0, x: slideFrom }}
            transition={{ duration: 0.25, ease: EASE }}
            className="border-border bg-card absolute inset-y-0 end-0 z-50 w-full border-s shadow-[var(--shadow-modal)]"
          >
            <PdfPanel
              key={openDoc.docId}
              docId={openDoc.docId}
              page={openDoc.page}
              title={DOC_TITLES.get(openDoc.docId)?.[locale] ?? openDoc.docId}
              onClose={() => setOpenDoc(null)}
              onPageChange={(page) =>
                setOpenDoc((d) => (d ? { ...d, page } : d))
              }
            />
          </motion.aside>
        )}
      </AnimatePresence>
    </motion.aside>
  );
}

type Translate = ReturnType<typeof useTranslations>;

function Row({
  row,
  nodes,
  locale,
  t,
  selected,
  onSelect,
}: {
  row: WorkbookCell[];
  nodes: Record<ModelKey, ValueNode>;
  locale: Lang;
  t: Translate;
  selected: ModelKey | null;
  onSelect: (key: ModelKey) => void;
}) {
  const first = row[0];
  if (first && first.type === "section") {
    return (
      <tr>
        <td
          colSpan={first.span}
          className="text-navy border-border bg-navy-50 border-y px-2 pt-3 pb-1.5 text-[0.6875rem] font-bold tracking-[0.06em] uppercase"
        >
          {t(first.labelKey)}
        </td>
      </tr>
    );
  }

  return (
    <tr>
      {row.map((cell, ci) => (
        <Cell
          key={ci}
          cell={cell}
          nodes={nodes}
          locale={locale}
          t={t}
          selected={selected}
          onSelect={onSelect}
        />
      ))}
    </tr>
  );
}

function Cell({
  cell,
  nodes,
  locale,
  t,
  selected,
  onSelect,
}: {
  cell: WorkbookCell;
  nodes: Record<ModelKey, ValueNode>;
  locale: Lang;
  t: Translate;
  selected: ModelKey | null;
  onSelect: (key: ModelKey) => void;
}) {
  if (cell.type === "blank") {
    return <td colSpan={cell.span} aria-hidden="true" />;
  }
  if (cell.type === "section") return null; // handled at the row level

  if (cell.type === "rowLabel") {
    const label = cell.labelKey
      ? t(cell.labelKey)
      : cell.nodeKey
        ? getNodeLabel(cell.nodeKey, t)
        : "";
    return (
      <th
        scope="row"
        className={cn(
          "py-1.5 pe-3 text-start align-middle text-[0.8125rem] font-medium whitespace-nowrap",
          cell.strong ? "text-navy font-semibold" : "text-text-secondary",
        )}
      >
        {label}
      </th>
    );
  }

  if (cell.type === "colHead") {
    const text = cell.text
      ? cell.text
      : cell.labelKey
        ? t(cell.labelKey)
        : cell.nodeKey && nodes[cell.nodeKey]
          ? formatNodeValue(nodes[cell.nodeKey]!, locale, t)
          : "";
    return (
      <th
        scope="col"
        className="text-navy financial bg-navy-50/60 border-border border px-2 py-1.5 text-end align-middle text-[0.75rem] font-bold tabular-nums"
      >
        {text}
      </th>
    );
  }

  // value cell
  const node = nodes[cell.nodeKey];
  if (!node) return <td aria-hidden="true" />;
  const kind = node.provenance.kind;
  const isSelected = selected === cell.nodeKey;

  return (
    <td colSpan={cell.span} className="p-0.5">
      <button
        type="button"
        onClick={() => onSelect(cell.nodeKey)}
        data-testid="workbook-cell"
        data-node-key={cell.nodeKey}
        aria-pressed={isSelected}
        className={cn(
          "border-border rounded-btn focus-visible:ring-accent group relative flex w-full items-center justify-end gap-1 border px-2 py-1.5 transition-colors duration-[var(--duration-fast)] ease-[var(--ease)] outline-none focus-visible:ring-2",
          KIND_CELL[kind],
          isSelected && "ring-accent ring-2",
        )}
      >
        {kind === "sourced" && (
          <Lock
            className={cn(
              "text-navy-400 size-3 shrink-0 transition-opacity duration-[var(--duration-fast)]",
              isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100",
            )}
            aria-hidden="true"
          />
        )}
        <span
          className={cn(
            "text-navy financial text-[0.8125rem] tabular-nums",
            cell.strong ? "font-bold" : "font-semibold",
          )}
        >
          {formatNodeValue(node, locale, t)}
        </span>
      </button>
    </td>
  );
}

function FormulaBar({
  node,
  nodeKey,
  locale,
  t,
  onOpenSource,
}: {
  node: ValueNode | null;
  nodeKey: ModelKey | null;
  locale: Lang;
  t: Translate;
  onOpenSource: (docId: string, page: number) => void;
}) {
  if (!node || !nodeKey) {
    return (
      <div className="border-border text-text-secondary flex h-14 shrink-0 items-center gap-2 border-t px-4 text-xs">
        <Sparkles
          className="text-accent size-3.5 shrink-0"
          aria-hidden="true"
        />
        {t("generate.workbook.selectHint")}
      </div>
    );
  }

  const prov = node.provenance;
  return (
    <div className="border-border bg-card faheem-scrollbar max-h-[42%] shrink-0 space-y-2.5 overflow-y-auto border-t px-4 py-3">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-text-secondary text-[0.6875rem] font-semibold tracking-wide uppercase">
          {getNodeLabel(nodeKey, t)}
        </p>
        <p className="text-navy financial text-base font-bold tabular-nums">
          {formatNodeValue(node, locale, t)}
        </p>
      </div>

      {prov.kind === "computed" && (
        <div className="space-y-1.5">
          <p className="text-text-secondary text-[0.6875rem] font-semibold">
            {t("model.panel.formulaLabel")}
          </p>
          {FORMULAS[prov.formulaId] && (
            <Formula tex={FORMULAS[prov.formulaId]!.katex} />
          )}
          <p className="text-text-secondary text-xs">
            <span className="font-semibold">
              {t("generate.workbook.builtFrom")}:
            </span>{" "}
            {prov.inputs
              .map((k) => getNodeLabel(k, t))
              .filter((_, i) => i < 6)
              .join(", ")}
          </p>
        </div>
      )}

      {prov.kind === "sourced" && (
        <div className="space-y-2">
          <Badge variant="mint" size="sm" className="w-fit">
            <Lock className="size-3" aria-hidden="true" />
            {t("model.panel.sourcedBadge")}
          </Badge>
          <button
            type="button"
            onClick={() => onOpenSource(prov.docId, prov.page)}
            className="border-border bg-navy-50/40 hover:border-navy-300 focus-visible:ring-accent rounded-card flex w-full items-center gap-2 border px-3 py-2 text-start transition-colors duration-[var(--duration-fast)] ease-[var(--ease)] outline-none focus-visible:ring-2"
          >
            <FileText
              className="text-navy size-4 shrink-0"
              aria-hidden="true"
            />
            <span className="text-navy min-w-0 flex-1 truncate text-xs font-medium">
              {t("generate.workbook.sourceComment", {
                doc: DOC_TITLES.get(prov.docId)?.[locale] ?? prov.docId,
                page: prov.page,
              })}
            </span>
            <span className="text-accent-700 shrink-0 text-xs font-semibold">
              {t("model.panel.openSource")}
            </span>
          </button>
        </div>
      )}

      {prov.kind === "assumption" && (
        <div className="space-y-1.5">
          <Badge variant="neutral" size="sm" className="w-fit">
            {t("model.panel.assumptionBadge")}
          </Badge>
          {t.has(`model.rationale.${prov.rationaleKey}`) && (
            <p className="text-text-secondary text-xs leading-relaxed">
              {t(`model.rationale.${prov.rationaleKey}`)}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
