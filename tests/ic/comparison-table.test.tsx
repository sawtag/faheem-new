import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import { ComparisonTable } from "@/components/ic/comparison-table";
import type { Deal, IcMetrics } from "@/lib/types";

// Reduced motion → count-up resolves to the final figure synchronously, so we
// can assert the rendered numbers deterministically (no rAF flake).
vi.mock("motion/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("motion/react")>();
  return { ...actual, useReducedMotion: () => true };
});

const metrics = (over: Partial<IcMetrics> = {}): IcMetrics => ({
  irr: 18.5,
  hurdle: 15,
  expectedReturn: 16.2,
  riskScore: 5,
  mandateFit: "pass",
  compliance: "pass",
  recommendation: { en: "Strongest risk-adjusted case.", ar: "الأقوى." },
  cite: { docId: "thara-analysis", page: 2 },
  ...over,
});

const deal = (id: string, icMetrics?: IcMetrics): Deal => ({
  id,
  name: { en: id, ar: id },
  sector: { en: "Fintech", ar: "تقنية مالية" },
  origin: "inbound",
  stage: icMetrics ? "ic-review" : "analysis",
  statusLine: { en: "", ar: "" },
  ...(icMetrics ? { icMetrics } : {}),
});

function renderTable(columns: Deal[]) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <ComparisonTable columns={columns} onOpenDoc={() => {}} />
    </NextIntlClientProvider>,
  );
}

describe("ComparisonTable", () => {
  it("renders 6 metric rows × 2 deal columns for a both-populated fixture", () => {
    renderTable([
      deal("jahez", metrics({ irr: 17.1, expectedReturn: 16.8, riskScore: 6 })),
      deal("thara-pay", metrics()),
    ]);

    // 6 metric rows → 6 row-headers; metric + 2 deals → 3 column-headers.
    expect(screen.getAllByRole("rowheader")).toHaveLength(6);
    expect(screen.getAllByRole("columnheader")).toHaveLength(3);

    // Delta tone is data-driven: both clear the 15% benchmark.
    expect(screen.getByTestId("ic-irr-delta-thara-pay")).toHaveAttribute(
      "data-tone",
      "above",
    );
    // Count-up settled figure (reduced motion).
    expect(screen.getByText("18.5%")).toBeInTheDocument();
  });

  it("renders a pending column (skeleton + caption) when icMetrics is absent", () => {
    renderTable([deal("jahez"), deal("thara-pay", metrics())]);

    const pending = screen.getByTestId("ic-pending-jahez");
    expect(pending).toHaveTextContent(/metrics pending model sign-off/i);

    // The populated column still shows its pass badges, no fake numbers leak
    // into the pending one.
    expect(screen.getAllByText("Pass")).toHaveLength(2);
    expect(screen.getByTestId("ic-irr-delta-thara-pay")).toBeInTheDocument();
  });
});
