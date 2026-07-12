"use client";

import * as React from "react";
import { ChartColumnBig, Table2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { AnswerChart } from "@/components/chat/answer-chart";
import {
  classifyTable,
  isDeltaColumn,
  isNumericColumn,
  parseNumericCell,
  type ParsedTable,
} from "@/lib/chart-data";
import type { Lang } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Renders a parsed markdown table as a real, house-styled `<table>`: uppercase
 * hairline header, numeric columns right-aligned (tabular figures), delta /
 * parenthesised negatives tinted danger, `[[n]]` citation chips rendered inline
 * in cells (via the shared `renderCell` — identical to prose). When the table
 * is chartable, a quiet table⇄chart toggle appears; chart mode keeps the table
 * in the DOM (visually hidden) so the citation chips stay accessible.
 */
export function AnswerTable({
  table,
  renderCell,
  streaming = false,
}: {
  table: ParsedTable;
  renderCell: (cell: string) => React.ReactNode;
  streaming?: boolean;
}) {
  const t = useTranslations("chat.table");
  const locale = useLocale() as Lang;
  const [mode, setMode] = React.useState<"table" | "chart">("table");

  const numericCols = React.useMemo(
    () => table.headers.map((_, c) => isNumericColumn(table, c)),
    [table],
  );
  const deltaCols = React.useMemo(
    () => table.headers.map((_, c) => c > 0 && isDeltaColumn(table, c)),
    [table],
  );
  const spec = React.useMemo(() => classifyTable(table), [table]);

  const chartable = spec !== null && !streaming;
  const showChart = chartable && mode === "chart";
  const hasCitations = React.useMemo(
    () => table.rows.some((r) => r.some((c) => /\[\[\d+\]\]/.test(c))),
    [table],
  );

  const cellTone = (cell: string, col: number): boolean => {
    const p = parseNumericCell(cell);
    return p.negative && (deltaCols[col] === true || p.parenthesized);
  };

  const tableEl = (
    <div className="overflow-x-auto">
      <table
        data-testid="answer-table"
        className="financial w-full border-collapse text-sm"
      >
        <thead>
          <tr className="border-border border-b">
            {table.headers.map((h, c) => (
              <th
                key={c}
                scope="col"
                className={cn(
                  "text-text-secondary px-3.5 py-2.5 text-[0.6875rem] font-semibold tracking-[0.04em] uppercase",
                  numericCols[c] && c > 0 ? "text-end" : "text-start",
                )}
              >
                {renderCell(h)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, r) => (
            <tr
              key={r}
              className="border-border hover:bg-navy-50/50 border-b transition-colors duration-[var(--duration-fast)] ease-[var(--ease)] last:border-b-0"
            >
              {row.map((cell, c) => (
                <td
                  key={c}
                  className={cn(
                    "px-3.5 py-2.5 align-top",
                    numericCols[c] && c > 0
                      ? "text-end"
                      : "text-navy text-start font-semibold",
                    cellTone(cell, c) && "text-danger-700",
                  )}
                >
                  {renderCell(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="border-border bg-card rounded-card shadow-card my-4 overflow-hidden border">
      {chartable && (
        <div className="border-border flex items-center justify-end gap-1 border-b px-2 py-1.5">
          <SegButton
            active={mode === "table"}
            onClick={() => setMode("table")}
            label={t("showTable")}
          >
            <Table2 className="size-4" aria-hidden="true" />
          </SegButton>
          <SegButton
            active={mode === "chart"}
            onClick={() => setMode("chart")}
            label={t("showChart")}
          >
            <ChartColumnBig className="size-4" aria-hidden="true" />
          </SegButton>
        </div>
      )}

      {showChart && spec ? (
        <div className="px-3 pt-3 pb-2">
          <AnswerChart spec={spec} lang={locale} />
          {spec.omittedRows > 0 && (
            <p className="text-text-secondary mt-1 px-1 text-xs">
              {t("omitted", {
                shown: spec.categories.length,
                total: spec.categories.length + spec.omittedRows,
              })}
            </p>
          )}
          {hasCitations && (
            <p className="text-text-secondary mt-1 px-1 text-xs italic">
              {t("sourcesInTable")}
            </p>
          )}
          {/* keep the table (and its citation chips) in the DOM for a11y */}
          <div className="sr-only">{tableEl}</div>
        </div>
      ) : (
        tableEl
      )}
    </div>
  );
}

function SegButton({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      title={label}
      className={cn(
        "rounded-btn focus-visible:ring-accent focus-visible:ring-offset-card grid size-7 place-items-center transition-colors duration-[var(--duration-fast)] ease-[var(--ease)] outline-none focus-visible:ring-2 focus-visible:ring-offset-1",
        active
          ? "bg-navy text-card"
          : "text-text-secondary hover:bg-navy-50 hover:text-navy",
      )}
    >
      {children}
    </button>
  );
}
