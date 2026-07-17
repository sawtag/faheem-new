import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import manifest from "@/data/corpus/manifest.json";
import { RiskBreakdown } from "@/components/deals/risk-breakdown";
import type { CorpusDoc } from "@/lib/types";

// radix Popover positions its content via floating-ui, which needs
// ResizeObserver (absent in jsdom).
class RO {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal("ResizeObserver", RO);

const titleEn = (id: string) =>
  (manifest as CorpusDoc[]).find((d) => d.id === id)!.title.en;

function renderBreakdown(props: {
  score: number;
  companyId: string;
  cite: { docId: string; page: number };
}) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <RiskBreakdown {...props}>
        <span>{props.score} / 10</span>
      </RiskBreakdown>
    </NextIntlClientProvider>,
  );
}

describe("RiskBreakdown", () => {
  it("computed variant (Jahez): six register rows, the deals.json composite, and the formula", async () => {
    renderBreakdown({
      score: 5.5,
      companyId: "jahez",
      cite: { docId: "jahez-analysis-summary", page: 2 },
    });

    await userEvent.click(screen.getByTestId("risk-breakdown-trigger"));
    const content = await screen.findByTestId("risk-breakdown-content");

    // leads with the qualitative band, supported by the number (5.5 → moderate)
    expect(within(content).getByText("Moderate risk")).toBeInTheDocument();
    expect(screen.getByTestId("risk-composite-result")).toHaveTextContent(
      "5.5 / 10",
    );

    // the six probability × impact rows, with a localized row name
    expect(screen.getAllByTestId("risk-register-row")).toHaveLength(6);
    expect(
      within(content).getByText("Price-war margin compression"),
    ).toBeInTheDocument();

    // the peak-weighted formula, its result, and the honesty + assumption notes
    expect(
      within(content).getByText("Peak-weighted composite"),
    ).toBeInTheDocument();
    expect(within(content).getByText("= 5.5 / 10")).toBeInTheDocument();
    expect(
      within(content).getByText(/editable in the Live Model/i),
    ).toBeInTheDocument();
    expect(within(content).getByText(/firm-specific/i)).toBeInTheDocument();

    // the number is sourced to the analysis doc; the framing to Lunar's appetite
    expect(
      within(content).getByText(new RegExp(titleEn("jahez-analysis-summary"))),
    ).toBeInTheDocument();
    expect(
      within(content).getByText(new RegExp(titleEn("lunar-risk-appetite"))),
    ).toBeInTheDocument();
  });

  it("sourced variant (Thara Pay): doc + page, scale note, no register table", async () => {
    renderBreakdown({
      score: 5,
      companyId: "thara-pay",
      cite: { docId: "thara-analysis", page: 2 },
    });

    await userEvent.click(screen.getByTestId("risk-breakdown-trigger"));
    const content = await screen.findByTestId("risk-breakdown-content");

    expect(
      within(content).getByText("Quantified risk score"),
    ).toBeInTheDocument();
    // no invented breakdown: the register table is absent
    expect(within(content).queryByTestId("risk-register")).toBeNull();
    expect(screen.queryAllByTestId("risk-register-row")).toHaveLength(0);
    // the 1-10 scale note and the source doc + page
    expect(
      within(content).getByText(/higher score means more risk/i),
    ).toBeInTheDocument();
    expect(
      within(content).getByText(new RegExp(titleEn("thara-analysis"))),
    ).toBeInTheDocument();
  });
});
