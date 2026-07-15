"use client";

import * as React from "react";
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { Lock, Minus, Pencil, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Lang } from "@/lib/types";
import type { ModelKey, ValueNode } from "@/lib/model/types";
import { getNodeLabel } from "@/components/model/node-label";
import { formatNodeValue } from "@/components/model/format";

const EASE = [0.4, 0, 0.2, 1] as const;

// ─────────────────────────────── context ───────────────────────────────

export interface LiveModelContextValue {
  nodes: Record<ModelKey, ValueNode>;
  selectedKey: ModelKey | null;
  changedKeys: ReadonlySet<ModelKey>;
  /** bumps on every recompute, re-triggers the changed-cell wash */
  changeNonce: number;
  select: (key: ModelKey) => void;
  setAssumption: (assumptionKey: string, nativeValue: number) => void;
}

const Ctx = React.createContext<LiveModelContextValue | null>(null);

export function useModelCtx(): LiveModelContextValue {
  const v = React.useContext(Ctx);
  if (!v) throw new Error("useModelCtx must be used within <ModelProvider>");
  return v;
}

export const ModelProvider = Ctx.Provider;

// ─────────────────────────────── cell value (count-up) ───────────────────────────────

/**
 * Node value with a count-up: animates from the previously-rendered value to
 * the new one over 400ms whenever it changes (the recompute animation), and
 * counts up from 0 on first mount when `reveal` is set (hero/reveal law).
 * tabular-nums (via `.financial`) so nothing shifts; reduced-motion lands
 * immediately.
 */
export function CellNumber({
  node,
  reveal = false,
  className,
}: {
  node: Pick<ValueNode, "value" | "unit">;
  reveal?: boolean;
  className?: string;
}) {
  const locale = useLocale() as Lang;
  const t = useTranslations();
  const reduce = useReducedMotion();
  const mv = useMotionValue(reveal && !reduce ? 0 : node.value);
  const unit = node.unit;
  const text = useTransform(mv, (v) =>
    formatNodeValue({ value: v, unit }, locale, t),
  );
  const prev = React.useRef(node.value);

  React.useEffect(() => {
    if (reduce) {
      mv.set(node.value);
      prev.current = node.value;
      return;
    }
    if (prev.current === node.value && mv.get() === node.value) return;
    const controls = animate(mv, node.value, { duration: 0.4, ease: EASE });
    prev.current = node.value;
    return () => controls.stop();
  }, [node.value, reduce, mv]);

  return (
    <motion.span className={cn("financial tabular-nums", className)}>
      {text}
    </motion.span>
  );
}

// ─────────────────────────────── assumption editor ───────────────────────────────

const DECIMALS: Record<string, number> = { "%": 1, x: 2, years: 0, score: 0 };

function stepFor(unit: string): number {
  if (unit === "%") return 0.5;
  return 1;
}

/** Percent nodes carry a percent-number value (18 = 18%); Assumptions store
 * decimals (0.18). Everything else is 1:1. */
function toNative(unit: string, display: number): number {
  return unit === "%" ? display / 100 : display;
}

function AssumptionEditor({
  assumptionKey,
  node,
}: {
  assumptionKey: string;
  node: ValueNode;
}) {
  const t = useTranslations();
  const { setAssumption } = useModelCtx();
  const label = getNodeLabel(`assumptions.${assumptionKey}`, t);
  const step = stepFor(node.unit);
  const decimals = DECIMALS[node.unit] ?? 2;

  const commit = (display: number) => {
    if (!Number.isFinite(display)) return;
    setAssumption(assumptionKey, toNative(node.unit, display));
  };

  return (
    <div
      className="relative mt-1.5 flex items-center gap-1"
      dir="ltr"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        aria-label={t("model.live.editor.decrease", { name: label })}
        onClick={() => commit(+(node.value - step).toFixed(4))}
        className="border-warning-700/25 text-warning-700 hover:bg-warning-50 focus-visible:ring-accent rounded-btn grid size-6 shrink-0 place-items-center border outline-none focus-visible:ring-2"
      >
        <Minus className="size-3" aria-hidden="true" />
      </button>
      <input
        type="number"
        step={step}
        aria-label={t("model.live.editor.field", { name: label })}
        value={Number(node.value.toFixed(decimals))}
        onChange={(e) => commit(e.target.valueAsNumber)}
        className="border-warning-700/25 text-navy focus-visible:ring-accent financial rounded-btn h-6 w-14 border bg-transparent text-center text-xs font-bold tabular-nums outline-none focus-visible:ring-2"
      />
      <span
        className="text-warning-700 text-[0.625rem] font-semibold"
        aria-hidden="true"
      >
        {node.unit === "%"
          ? "%"
          : node.unit === "years"
            ? t("model.units.years", { value: "" }).trim()
            : ""}
      </span>
      <button
        type="button"
        aria-label={t("model.live.editor.increase", { name: label })}
        onClick={() => commit(+(node.value + step).toFixed(4))}
        className="border-warning-700/25 text-warning-700 hover:bg-warning-50 focus-visible:ring-accent rounded-btn grid size-6 shrink-0 place-items-center border outline-none focus-visible:ring-2"
      >
        <Plus className="size-3" aria-hidden="true" />
      </button>
    </div>
  );
}

// ─────────────────────────────── model cell ───────────────────────────────

const KIND_STYLE: Record<ValueNode["provenance"]["kind"], string> = {
  assumption:
    "bg-warning-50 hover:bg-warning-50 border-warning-700/20 text-navy",
  sourced: "bg-navy-50/50 hover:bg-navy-50 border-transparent text-navy",
  computed: "bg-card hover:bg-navy-50/60 border-transparent text-navy",
};

/**
 * One selectable model cell. Renders the node's value (count-up on change),
 * the provenance affordance (lock glyph on sourced, edit glyph on assumption),
 * a selection ring, and, when a sourced cell is selected, the "source-locked"
 * caption. Assumption cells reveal an inline stepper/input while selected. It's
 * a role="button" div (not a <button>) so the stepper controls can nest.
 */
export function ModelCell({
  nodeKey,
  editable = true,
  align = "end",
  muted = false,
  style,
  className,
}: {
  nodeKey: ModelKey;
  /** assumption cells only edit where the surface opts in (Assumptions tab) */
  editable?: boolean;
  align?: "start" | "center" | "end";
  /** actual-column dim treatment in the DCF grids */
  muted?: boolean;
  style?: React.CSSProperties;
  className?: string;
}) {
  const t = useTranslations();
  const reduce = useReducedMotion();
  const { nodes, selectedKey, changedKeys, changeNonce, select } =
    useModelCtx();
  const node = nodes[nodeKey];
  const changed = node ? changedKeys.has(nodeKey) : false;

  if (!node) return <td aria-hidden="true" />;

  const kind = node.provenance.kind;
  const selected = selectedKey === nodeKey;
  const isEditableAssumption = editable && kind === "assumption";

  return (
    <td
      className={cn("p-0.5 align-top", className)}
      data-testid="model-cell-td"
    >
      <div
        role="button"
        tabIndex={0}
        onClick={() => select(nodeKey)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            select(nodeKey);
          }
        }}
        data-testid="model-cell"
        data-node-key={nodeKey}
        data-kind={kind}
        aria-pressed={selected}
        className={cn(
          "rounded-btn focus-visible:ring-accent group relative flex w-full cursor-pointer flex-col border px-2 py-1.5 transition-colors duration-[var(--duration-fast)] ease-[var(--ease)] outline-none focus-visible:ring-2",
          align === "end" && "items-end text-end",
          align === "center" && "items-center text-center",
          align === "start" && "items-start text-start",
          KIND_STYLE[kind],
          muted && "opacity-70",
          selected && "ring-accent ring-2",
        )}
        style={style}
      >
        {/* changed-cell wash, a keyed fade re-fires on every recompute */}
        {changed && !reduce && (
          <motion.span
            key={changeNonce}
            aria-hidden="true"
            initial={{ opacity: 0.85 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: EASE }}
            className="rounded-btn bg-accent-200 pointer-events-none absolute inset-0 mix-blend-multiply"
          />
        )}
        <span className="relative flex items-center gap-1">
          {kind === "sourced" && (
            <Lock
              className={cn(
                "text-navy-400 size-3 shrink-0 transition-opacity duration-[var(--duration-fast)]",
                selected ? "opacity-100" : "opacity-0 group-hover:opacity-100",
              )}
              aria-hidden="true"
            />
          )}
          {isEditableAssumption && (
            <Pencil
              className={cn(
                "text-warning-700 size-2.5 shrink-0 transition-opacity duration-[var(--duration-fast)]",
                selected ? "opacity-100" : "opacity-0 group-hover:opacity-100",
              )}
              aria-hidden="true"
            />
          )}
          <CellNumber node={node} className="text-[0.8125rem] font-semibold" />
        </span>

        {isEditableAssumption &&
          selected &&
          node.provenance.kind === "assumption" && (
            <AssumptionEditor
              assumptionKey={node.provenance.assumptionKey}
              node={node}
            />
          )}
        {kind === "sourced" && selected && (
          <span className="text-navy-400 relative mt-0.5 text-[0.625rem] font-medium">
            {t("model.live.cell.locked")}
          </span>
        )}
      </div>
    </td>
  );
}

// ─────────────────────────────── table primitives ───────────────────────────────

/** Numeric grid shell, forced dir="ltr" (finance numeric-LTR convention:
 * year columns read FY23A→FY30E left-to-right in both locales; only labels and
 * page chrome flip RTL). */
export function GridTable({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="overflow-x-auto" dir="ltr">
      <table
        className={cn("w-full border-collapse text-sm", className)}
        role="grid"
      >
        {children}
      </table>
    </div>
  );
}

/** Row-label header cell, the one place row text (possibly Arabic) lives; kept
 * at the inline-start of an otherwise-LTR numeric row. */
export function RowLabel({
  nodeKey,
  fallback,
  strong = false,
}: {
  nodeKey?: ModelKey;
  fallback?: string;
  strong?: boolean;
}) {
  const t = useTranslations();
  const label = nodeKey ? getNodeLabel(nodeKey, t) : (fallback ?? "");
  return (
    <th
      scope="row"
      className={cn(
        "py-1.5 pe-3 text-start align-middle text-[0.8125rem] font-medium whitespace-nowrap",
        strong ? "text-navy font-semibold" : "text-text-secondary",
      )}
    >
      {label}
    </th>
  );
}
