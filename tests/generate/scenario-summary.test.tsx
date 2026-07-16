import * as React from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import { ScenarioSummary } from "@/components/generate/scenario-summary";
import { BASE_ASSUMPTIONS, buildModel } from "@/lib/model/compute";

describe("ScenarioSummary (the DCF beat's computed strip)", () => {
  const { result } = buildModel(BASE_ASSUMPTIONS);

  function renderStrip() {
    return render(
      <NextIntlClientProvider locale="en" messages={en}>
        <ScenarioSummary />
      </NextIntlClientProvider>,
    );
  }

  it("shows the three scenario tiles with the engine's IRRs (no drift from lib/model)", () => {
    renderStrip();
    for (const label of ["Bear", "Base", "Bull"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    for (const scenario of [result.bear, result.base, result.bull]) {
      const irr = `${(scenario.irr * 100).toFixed(1)}%`;
      expect(
        screen.getAllByText((text) => text.includes(irr)).length,
      ).toBeGreaterThan(0);
    }
  });

  it("shows the probability-weighted per-share value against the close", () => {
    renderStrip();
    const weighted = `SAR ${result.weightedPerShare.toFixed(2)}`;
    const close = `SAR ${result.price.toFixed(2)}`;
    expect(
      screen.getAllByText((text) => text.includes(weighted)).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText((text) => text.includes(close)).length,
    ).toBeGreaterThan(0);
  });

  it("links to the Live Model page", () => {
    renderStrip();
    const link = screen.getByRole("link", { name: /live model/i });
    expect(link).toHaveAttribute("href", "/deals/jahez/model");
  });
});
