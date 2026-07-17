"use client";

import { useTranslations } from "next-intl";
import { SquarePen } from "lucide-react";
import { YEARS } from "@/lib/model/compute";
import { GridTable, ModelCell, RowLabel } from "@/components/model/model-grid";
import { ModelSectionCard } from "@/components/model/model-section-card";

const FORECAST_YEARS = YEARS.slice(3); // FY26E..FY30E

/** Per-year editable driver grid, one row per family, FY26E..FY30E columns.
 * Row labels use the family-level series part-label (a row spans every
 * forecast year, so the per-year ", FY26E" suffix would be wrong). */
function PerYearGrid({ rows }: { rows: string[] }) {
  const t = useTranslations();
  return (
    <GridTable>
      <thead>
        <tr>
          <th aria-hidden="true" />
          {FORECAST_YEARS.map((y) => (
            <th
              key={y}
              className="text-accent-700 financial px-2 pb-1.5 text-end text-xs font-bold tabular-nums"
            >
              {y}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row}>
            <RowLabel fallback={t(`model.nodes.series.${row}`)} />
            {FORECAST_YEARS.map((_, i) => (
              <ModelCell key={i} nodeKey={`assumptions.${row}.${i}`} />
            ))}
          </tr>
        ))}
      </tbody>
    </GridTable>
  );
}

/** Vertical label→editable-cell list for scalar assumptions. */
function ScalarGroup({ keys }: { keys: string[] }) {
  return (
    <GridTable>
      <tbody>
        {keys.map((key) => (
          <tr key={key} className="border-border/60 border-b last:border-0">
            <RowLabel nodeKey={`assumptions.${key}`} />
            <ModelCell nodeKey={`assumptions.${key}`} className="w-32" />
          </tr>
        ))}
      </tbody>
    </GridTable>
  );
}

export function AssumptionsTab() {
  const t = useTranslations();

  return (
    <div className="flex flex-col gap-5">
      <p className="text-text-secondary flex items-center gap-2 text-[0.8125rem] leading-relaxed">
        <SquarePen
          className="text-warning-700 size-4 shrink-0"
          aria-hidden="true"
        />
        {t("model.live.assumptions.intro")}
      </p>

      <ModelSectionCard
        titleKey="model.live.assumptions.groups.drivers.title"
        captionKey="model.live.assumptions.groups.drivers.caption"
      >
        <PerYearGrid
          rows={["ordersGrowth", "aovGrowth", "netRevRate", "ebitdaMargin"]}
        />
      </ModelSectionCard>

      <ModelSectionCard
        titleKey="model.live.assumptions.groups.scenario.title"
        captionKey="model.live.assumptions.groups.scenario.caption"
      >
        <PerYearGrid rows={["bullRevDelta", "bearRevDelta"]} />
      </ModelSectionCard>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <ModelSectionCard
          titleKey="model.live.assumptions.groups.conversion.title"
          captionKey="model.live.assumptions.groups.conversion.caption"
        >
          <ScalarGroup keys={["dnaRate", "capexRate", "nwcRate"]} />
        </ModelSectionCard>

        <ModelSectionCard
          titleKey="model.live.assumptions.groups.discount.title"
          captionKey="model.live.assumptions.groups.discount.caption"
        >
          <ScalarGroup keys={["spread", "zakat"]} />
        </ModelSectionCard>

        <ModelSectionCard
          titleKey="model.live.assumptions.groups.terminal.title"
          captionKey="model.live.assumptions.groups.terminal.caption"
        >
          <ScalarGroup keys={["g", "gBull", "gBear"]} />
        </ModelSectionCard>

        <ModelSectionCard
          titleKey="model.live.assumptions.groups.weighting.title"
          captionKey="model.live.assumptions.groups.weighting.caption"
        >
          <ScalarGroup
            keys={[
              "probBull",
              "probBase",
              "probBear",
              "bullMarginDelta",
              "bearMarginDelta",
              "ebitdaMarginTerminal",
            ]}
          />
        </ModelSectionCard>

        <ModelSectionCard
          titleKey="model.live.assumptions.groups.risk.title"
          captionKey="model.live.assumptions.groups.risk.caption"
        >
          <div className="flex flex-col gap-3">
            {/* read-only composite: click to drill the peak-weighted formula
                and the six P×I weights below it */}
            <GridTable>
              <tbody>
                <tr className="border-border border-b">
                  <RowLabel nodeKey="riskScore" strong />
                  <ModelCell
                    nodeKey="riskScore"
                    editable={false}
                    className="w-32"
                  />
                </tr>
              </tbody>
            </GridTable>
            <ScalarGroup
              keys={[
                "holdYears",
                "riskWeights.0",
                "riskWeights.1",
                "riskWeights.2",
                "riskWeights.3",
                "riskWeights.4",
                "riskWeights.5",
              ]}
            />
          </div>
        </ModelSectionCard>
      </div>
    </div>
  );
}
