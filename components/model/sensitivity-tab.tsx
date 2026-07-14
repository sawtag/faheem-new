"use client";

import { useLocale, useTranslations } from "next-intl";
import { formatNodeValue } from "@/components/model/format";
import {
  GridTable,
  ModelCell,
  useModelCtx,
} from "@/components/model/model-grid";
import { ModelSectionCard } from "@/components/model/model-section-card";
import type { Lang } from "@/lib/types";

const IDX = [0, 1, 2, 3, 4];

/** Muted axis-point header (a node value, non-interactive). */
function AxisValue({ nodeKey }: { nodeKey: string }) {
  const t = useTranslations();
  const locale = useLocale() as Lang;
  const { nodes } = useModelCtx();
  const node = nodes[nodeKey];
  if (!node) return null;
  return (
    <span className="financial text-text-secondary text-xs font-bold tabular-nums">
      {formatNodeValue(node, locale, t)}
    </span>
  );
}

function SensitivityGrid({
  gridKey,
  rowAxis,
  colAxis,
  highlight,
}: {
  gridKey: "grid1" | "grid2";
  rowAxis: string;
  colAxis: string;
  /** [row, col] base cell to ring */
  highlight?: [number, number];
}) {
  const { nodes } = useModelCtx();
  const t = useTranslations();

  // heatmap domain across the 25 live cells
  const values: number[] = [];
  for (const r of IDX)
    for (const c of IDX) values.push(nodes[`${gridKey}.${r}.${c}`]?.value ?? 0);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const tint = (v: number) => {
    const n = max > min ? (v - min) / (max - min) : 0;
    return `color-mix(in srgb, var(--color-accent-200) ${Math.round(n * 62)}%, transparent)`;
  };

  return (
    <GridTable className="text-center">
      <thead>
        <tr>
          <th
            className="text-text-secondary pe-2 pb-1.5 text-start text-[0.6875rem] font-semibold whitespace-nowrap"
            aria-hidden="true"
          >
            {t(`model.live.sensitivity.${gridKey}.colAxis`)}
          </th>
          {IDX.map((c) => (
            <th key={c} className="px-2 pb-1.5 text-end">
              <AxisValue nodeKey={`${colAxis}.${c}`} />
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {IDX.map((r) => (
          <tr key={r}>
            <th
              scope="row"
              className="text-text-secondary pe-3 text-end align-middle text-xs font-semibold whitespace-nowrap"
            >
              <AxisValue nodeKey={`${rowAxis}.${r}`} />
            </th>
            {IDX.map((c) => {
              const key = `${gridKey}.${r}.${c}`;
              const isBase =
                highlight && highlight[0] === r && highlight[1] === c;
              return (
                <ModelCell
                  key={c}
                  nodeKey={key}
                  align="center"
                  style={{ backgroundColor: tint(nodes[key]?.value ?? 0) }}
                  className={
                    isBase
                      ? "[&>[role=button]]:ring-navy [&>[role=button]]:ring-2"
                      : undefined
                  }
                />
              );
            })}
          </tr>
        ))}
      </tbody>
    </GridTable>
  );
}

export function SensitivityTab() {
  const t = useTranslations();
  return (
    <div className="flex flex-col gap-5">
      <p className="text-text-secondary text-[0.8125rem] leading-relaxed">
        {t("model.live.sensitivity.intro")}
      </p>
      <ModelSectionCard
        titleKey="model.live.sensitivity.grid1.title"
        captionKey="model.live.sensitivity.grid1.caption"
        footer={
          <p className="text-text-secondary mt-2 flex items-center gap-1.5 text-[0.6875rem]">
            <span
              className="ring-navy inline-block size-2.5 rounded-[2px] ring-2"
              aria-hidden="true"
            />
            {t("model.live.sensitivity.base")}
          </p>
        }
      >
        <SensitivityGrid
          gridKey="grid1"
          rowAxis="gAxis"
          colAxis="waccAxis"
          highlight={[2, 2]}
        />
      </ModelSectionCard>
      <ModelSectionCard
        titleKey="model.live.sensitivity.grid2.title"
        captionKey="model.live.sensitivity.grid2.caption"
      >
        <SensitivityGrid
          gridKey="grid2"
          rowAxis="takeAxis"
          colAxis="gmvGrowthAxis"
        />
      </ModelSectionCard>
    </div>
  );
}
