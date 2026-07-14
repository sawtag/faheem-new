"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { motion } from "motion/react";
import { ChevronRight, FileText, Lock } from "lucide-react";
import manifest from "@/data/corpus/manifest.json";
import { RATIONALE } from "@/lib/model/compute";
import { FORMULAS } from "@/lib/model/formulas";
import { stashCitationHighlight } from "@/components/chat/highlight-bus";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CorpusDoc, Lang } from "@/lib/types";
import type { ModelKey, Provenance, ValueNode } from "@/lib/model/types";
import { getNodeLabel } from "@/components/model/node-label";
import { formatNodeValue } from "@/components/model/format";
import { Formula } from "@/components/model/formula";
import { ProvenanceChip } from "@/components/model/provenance-chip";

const EASE = [0.4, 0, 0.2, 1] as const;
const DOC_TITLES = new Map(
  (manifest as CorpusDoc[]).map((d) => [d.id, d.title]),
);

type Translate = ReturnType<typeof useTranslations>;

export interface MethodologyPanelProps {
  /** the node the panel opens on */
  nodeKey: ModelKey;
  /** the full provenance node graph (buildModel(...).nodes) */
  nodes: Record<ModelKey, ValueNode>;
  /** fired whenever the panel drills into a different node (chip click or
   * breadcrumb navigation) — the panel manages its own breadcrumb trail, this
   * is a notify-only hook for embedders that want to mirror the selection */
  onNavigate?: (key: ModelKey) => void;
  /** sourced leaves call this instead of opening a PdfPanel themselves — the
   * panel stashes the citation highlight (reusing the existing chat
   * mechanism) and leaves actually mounting/positioning PdfPanel to the
   * embedder, since that differs between a chat pane and a Live Model sheet */
  onOpenSource?: (docId: string, page: number) => void;
  className?: string;
}

/**
 * Progressive-disclosure provenance explainer for a single ModelKey:
 * computed → explainer + KaTeX formula + drillable input chips; sourced →
 * doc + page + "open source" (reuses the citation-highlight bus); assumption
 * → value + badge + analyst rationale. Recursing into a chip re-renders the
 * panel on the new node with a breadcrumb trail back.
 */
export function MethodologyPanel({
  nodeKey,
  nodes,
  onNavigate,
  onOpenSource,
  className,
}: MethodologyPanelProps) {
  const t = useTranslations();
  const locale = useLocale() as Lang;
  const [trail, setTrail] = React.useState<ModelKey[]>([nodeKey]);
  const rootRef = React.useRef(nodeKey);

  React.useEffect(() => {
    if (rootRef.current !== nodeKey) {
      rootRef.current = nodeKey;
      setTrail([nodeKey]);
    }
  }, [nodeKey]);

  const current = trail[trail.length - 1] ?? nodeKey;
  const node = nodes[current];

  const goTo = React.useCallback(
    (key: ModelKey) => {
      setTrail((prev) => [...prev, key]);
      onNavigate?.(key);
    },
    [onNavigate],
  );

  const goToIndex = React.useCallback((i: number) => {
    setTrail((prev) => prev.slice(0, i + 1));
  }, []);

  if (!node) return null; // provenance invariants guarantee every key resolves

  return (
    <div
      className={cn("flex flex-col gap-4", className)}
      data-testid="methodology-panel"
    >
      {trail.length > 1 && (
        <nav
          aria-label={t("model.panel.title")}
          className="flex flex-wrap items-center gap-0.5 text-xs"
        >
          {trail.map((key, i) => {
            const isLast = i === trail.length - 1;
            return (
              <React.Fragment key={key}>
                {i > 0 && (
                  <ChevronRight
                    className="text-text-secondary size-3 shrink-0 rtl:-scale-x-100"
                    aria-hidden="true"
                  />
                )}
                <button
                  type="button"
                  onClick={() => goToIndex(i)}
                  disabled={isLast}
                  className={cn(
                    "rounded-btn px-1.5 py-0.5 font-semibold transition-colors duration-[var(--duration-fast)] ease-[var(--ease)]",
                    isLast
                      ? "text-navy"
                      : "text-text-secondary hover:text-navy cursor-pointer",
                  )}
                >
                  {getNodeLabel(key, t)}
                </button>
              </React.Fragment>
            );
          })}
        </nav>
      )}

      <motion.div
        key={current}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: EASE }}
        className="flex flex-col gap-4"
      >
        <header className="flex flex-col gap-1">
          <p className="text-text-secondary text-xs font-semibold tracking-wide uppercase">
            {getNodeLabel(current, t)}
          </p>
          <p className="financial text-navy text-2xl font-bold">
            {formatNodeValue(node, locale, t)}
          </p>
        </header>

        {node.provenance.kind === "computed" && (
          <ComputedView
            provenance={node.provenance}
            nodes={nodes}
            locale={locale}
            t={t}
            onDrill={goTo}
          />
        )}
        {node.provenance.kind === "sourced" && (
          <SourcedView
            provenance={node.provenance}
            locale={locale}
            t={t}
            onOpenSource={onOpenSource}
          />
        )}
        {node.provenance.kind === "assumption" && (
          <AssumptionView provenance={node.provenance} t={t} />
        )}
      </motion.div>
    </div>
  );
}

function ComputedView({
  provenance,
  nodes,
  locale,
  t,
  onDrill,
}: {
  provenance: Extract<Provenance, { kind: "computed" }>;
  nodes: Record<ModelKey, ValueNode>;
  locale: Lang;
  t: Translate;
  onDrill: (key: ModelKey) => void;
}) {
  const formula = FORMULAS[provenance.formulaId];

  return (
    <div className="flex flex-col gap-4">
      {formula && (
        <>
          <p className="text-text-secondary text-sm leading-relaxed">
            {t(formula.explainerKey)}
          </p>
          <div>
            <p className="text-text-secondary mb-1 text-xs font-semibold">
              {t("model.panel.formulaLabel")}
            </p>
            <Formula tex={formula.katex} />
          </div>
        </>
      )}
      <div>
        <p className="text-text-secondary mb-2 text-xs font-semibold">
          {t("model.panel.inputsLabel")}
        </p>
        <div className="flex flex-wrap gap-2">
          {provenance.inputs.map((key, i) => {
            const inputNode = nodes[key];
            if (!inputNode) return null;
            return (
              <ProvenanceChip
                key={key}
                label={getNodeLabel(key, t)}
                value={formatNodeValue(inputNode, locale, t)}
                kind={inputNode.provenance.kind}
                index={i}
                onClick={() => onDrill(key)}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

function SourcedView({
  provenance,
  locale,
  t,
  onOpenSource,
}: {
  provenance: Extract<Provenance, { kind: "sourced" }>;
  locale: Lang;
  t: Translate;
  onOpenSource?: (docId: string, page: number) => void;
}) {
  const title = DOC_TITLES.get(provenance.docId)?.[locale] ?? provenance.docId;

  return (
    <div className="flex flex-col gap-3">
      <Badge variant="mint" size="sm" className="w-fit">
        <Lock className="size-3" aria-hidden="true" />
        {t("model.panel.sourcedBadge")}
      </Badge>
      <div className="border-border bg-navy-50/40 rounded-card flex items-center justify-between gap-3 border p-3">
        <div className="flex min-w-0 items-center gap-2">
          <FileText className="text-navy size-4 shrink-0" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-navy truncate text-sm font-semibold">{title}</p>
            <p className="financial text-text-secondary text-xs">
              {t("model.panel.page", { page: provenance.page })}
            </p>
          </div>
        </div>
        <Button
          variant="primary"
          size="sm"
          className="h-9 shrink-0 px-3 text-xs"
          onClick={() => {
            stashCitationHighlight({
              docId: provenance.docId,
              page: provenance.page,
              quote: provenance.quote ?? "",
            });
            onOpenSource?.(provenance.docId, provenance.page);
          }}
        >
          {t("model.panel.openSource")}
        </Button>
      </div>
      <p className="text-text-secondary text-xs">
        {t("model.panel.lockedNote")}
      </p>
    </div>
  );
}

function AssumptionView({
  provenance,
  t,
}: {
  provenance: Extract<Provenance, { kind: "assumption" }>;
  t: Translate;
}) {
  const hasRationale =
    provenance.rationaleKey in RATIONALE &&
    t.has(`model.rationale.${provenance.rationaleKey}`);

  return (
    <div className="flex flex-col gap-3">
      <Badge variant="neutral" size="sm" className="w-fit">
        {t("model.panel.assumptionBadge")}
      </Badge>
      {hasRationale && (
        <div>
          <p className="text-text-secondary mb-1 text-xs font-semibold">
            {t("model.panel.rationaleLabel")}
          </p>
          <p className="text-text-secondary text-sm leading-relaxed">
            {t(`model.rationale.${provenance.rationaleKey}`)}
          </p>
        </div>
      )}
      <p className="text-text-secondary text-xs">
        {t("model.panel.editableNote")}
      </p>
    </div>
  );
}
