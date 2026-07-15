"use client";

import * as React from "react";
import { ChevronDown, CircleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Toggle } from "@/components/ui/toggle";
import { Chip } from "@/components/connections/chip";
import {
  isValidPercent,
  SECTOR_IDS,
  type Drawdown,
  type HoldingPeriod,
  type Liquidity,
  type MandateState,
  type SectorId,
} from "@/components/connections/onboarding/mandate-state";

const HOLDING_OPTIONS: HoldingPeriod[] = ["short", "mid", "long"];
const DRAWDOWN_OPTIONS: Drawdown[] = [15, 20, 25];
const LIQUIDITY_OPTIONS: Liquidity[] = ["quarterly", "semiAnnual", "annual"];

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  /** when set, renders a semantic `<label>` bound to that field's `id` */
  htmlFor?: string;
  children: React.ReactNode;
}) {
  const className = "text-navy mb-2 block text-[0.8125rem] font-semibold";
  return (
    <div>
      {htmlFor ? (
        <label htmlFor={htmlFor} className={className}>
          {label}
        </label>
      ) : (
        <p className={className}>{label}</p>
      )}
      {children}
    </div>
  );
}

export function StepMandate({
  mandate,
  onChange,
  forceShowErrors,
}: {
  mandate: MandateState;
  onChange: (next: MandateState) => void;
  forceShowErrors: boolean;
}) {
  const t = useTranslations("onboarding");
  const [touched, setTouched] = React.useState({
    irr: false,
    concentration: false,
  });

  const irrInvalid =
    (touched.irr || forceShowErrors) && !isValidPercent(mandate.irr);
  const concentrationInvalid =
    (touched.concentration || forceShowErrors) &&
    !isValidPercent(mandate.concentration);

  function toggleSector(id: SectorId) {
    const sectors = new Set(mandate.sectors);
    if (sectors.has(id)) sectors.delete(id);
    else sectors.add(id);
    onChange({ ...mandate, sectors });
  }

  return (
    <div className="mx-auto flex max-w-[560px] flex-col gap-5">
      <Field label={t("mandate.irr")} htmlFor="mandate-irr">
        <div className="max-w-[160px]">
          <Input
            id="mandate-irr"
            inputMode="decimal"
            className="financial"
            value={mandate.irr}
            onChange={(e) => onChange({ ...mandate, irr: e.target.value })}
            onBlur={() => setTouched((s) => ({ ...s, irr: true }))}
            invalid={irrInvalid}
            endSlot={<span className="text-sm font-medium">%</span>}
          />
        </div>
        {irrInvalid && (
          <p className="text-danger mt-1.5 flex items-center gap-1.5 text-[0.8125rem] font-medium">
            <CircleAlert className="size-4 shrink-0" aria-hidden="true" />
            {t("mandate.percentError")}
          </p>
        )}
      </Field>

      <Field label={t("mandate.concentration")} htmlFor="mandate-concentration">
        <div className="max-w-[160px]">
          <Input
            id="mandate-concentration"
            inputMode="decimal"
            className="financial"
            value={mandate.concentration}
            onChange={(e) =>
              onChange({ ...mandate, concentration: e.target.value })
            }
            onBlur={() => setTouched((s) => ({ ...s, concentration: true }))}
            invalid={concentrationInvalid}
            endSlot={<span className="text-sm font-medium">%</span>}
          />
        </div>
        {concentrationInvalid && (
          <p className="text-danger mt-1.5 flex items-center gap-1.5 text-[0.8125rem] font-medium">
            <CircleAlert className="size-4 shrink-0" aria-hidden="true" />
            {t("mandate.percentError")}
          </p>
        )}
      </Field>

      <Field label={t("mandate.holding")}>
        <div className="flex gap-2">
          {HOLDING_OPTIONS.map((opt) => (
            <Chip
              key={opt}
              selected={mandate.holding === opt}
              onClick={() => onChange({ ...mandate, holding: opt })}
            >
              {t(`mandate.holding${cap(opt)}`)}
            </Chip>
          ))}
        </div>
      </Field>

      <Field label={t("mandate.liquidity")}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="min-w-[200px] justify-between"
            >
              {t(`mandate.liquidity${cap(mandate.liquidity)}`)}
              <ChevronDown className="size-4" aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {LIQUIDITY_OPTIONS.map((opt) => (
              <DropdownMenuItem
                key={opt}
                onSelect={() => onChange({ ...mandate, liquidity: opt })}
              >
                {t(`mandate.liquidity${cap(opt)}`)}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </Field>

      <div>
        <label className="text-navy flex items-center gap-3 text-[0.9375rem] font-medium">
          <Toggle
            checked={mandate.compliance}
            onCheckedChange={(compliance) =>
              onChange({ ...mandate, compliance })
            }
          />
          {t("mandate.compliance")}
        </label>
        <p className="text-text-secondary mt-1.5 text-xs font-medium">
          {t("mandate.complianceNote")}
        </p>
      </div>

      <Field label={t("mandate.sectors")}>
        <div className="flex flex-wrap gap-2">
          {SECTOR_IDS.map((id) => (
            <Chip
              key={id}
              selected={mandate.sectors.has(id)}
              onClick={() => toggleSector(id)}
            >
              {t(`mandate.sector.${id}`)}
            </Chip>
          ))}
        </div>
      </Field>

      <Field label={t("mandate.drawdown")}>
        <div className="flex gap-2">
          {DRAWDOWN_OPTIONS.map((opt) => (
            <Chip
              key={opt}
              selected={mandate.drawdown === opt}
              onClick={() => onChange({ ...mandate, drawdown: opt })}
            >
              <span className="financial">{opt}%</span>
            </Chip>
          ))}
        </div>
      </Field>
    </div>
  );
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
