import * as React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import { MessageStream } from "@/components/chat/message-stream";
import type { CitationRef } from "@/components/chat/reduce";

const RANK_TABLE = `Here is the ranking:

| Metric | Thara Pay | Jahez |
|---|---|---|
| Implied IRR at entry | 18.5%[[2]] | 17.1%[[3]] |
| Scenario-weighted return | 16.2%[[4]] | 16.8%[[5]] |
| Risk score | 5 / 10[[6]] | 5.5 / 10[[7]] |`;

const CITATIONS: CitationRef[] = [
  {
    n: 2,
    docId: "market-data-comps",
    page: 3,
    quote: "Thara Pay implied IRR 18.5%",
  },
  {
    n: 3,
    docId: "market-data-comps",
    page: 4,
    quote: "Jahez implied IRR 17.1%",
  },
  {
    n: 4,
    docId: "market-data-comps",
    page: 5,
    quote: "Thara Pay weighted 16.2%",
  },
  { n: 5, docId: "market-data-comps", page: 6, quote: "Jahez weighted 16.8%" },
  { n: 6, docId: "lunar-ic-charter", page: 2, quote: "Thara Pay risk 5/10" },
  { n: 7, docId: "lunar-ic-charter", page: 3, quote: "Jahez risk 5.5/10" },
];

function renderStream(
  props: Partial<React.ComponentProps<typeof MessageStream>> = {},
) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <MessageStream
        text={RANK_TABLE}
        citations={CITATIONS}
        onOpenDoc={vi.fn()}
        {...props}
      />
    </NextIntlClientProvider>,
  );
}

describe("AnswerTable", () => {
  it("renders a markdown table as a real <table>", () => {
    renderStream();
    const table = screen.getByTestId("answer-table");
    expect(table.tagName).toBe("TABLE");
    expect(within(table).getByText("Thara Pay")).toBeInTheDocument();
    expect(
      within(table).getByText(/SAR|Implied IRR at entry/),
    ).toBeInTheDocument();
  });

  it("renders [[n]] citation chips inline inside cells (clickable)", async () => {
    const onOpenDoc = vi.fn();
    renderStream({ onOpenDoc });
    const table = screen.getByTestId("answer-table");
    const chip = within(table).getByRole("button", { name: "Open source 2" });
    expect(chip).toHaveTextContent("2");
    await userEvent.click(chip);
    expect(onOpenDoc).toHaveBeenCalledWith("market-data-comps", 3);
  });

  it("right-aligns numeric column headers", () => {
    renderStream();
    const th = screen.getByRole("columnheader", { name: "Thara Pay" });
    expect(th.className).toContain("text-end");
    // the label column stays start-aligned
    expect(
      screen.getByRole("columnheader", { name: "Metric" }).className,
    ).toContain("text-start");
  });

  it("offers a chart toggle that swaps to an SVG while keeping the table (chips) in the DOM", async () => {
    renderStream();
    await userEvent.click(
      screen.getByRole("button", { name: "Show as chart" }),
    );
    expect(screen.getByRole("img", { name: /Bar chart/i })).toBeInTheDocument();
    // table + its citation chip are still present (kept for a11y / sources)
    expect(screen.getByTestId("answer-table")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Open source 2" }),
    ).toBeInTheDocument();
  });

  it("hides the toggle while the answer is still streaming", () => {
    renderStream({ streaming: true });
    expect(screen.getByTestId("answer-table")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Show as chart" }),
    ).not.toBeInTheDocument();
  });

  it("falls back to prose for a malformed (ragged) table", () => {
    const { container } = renderStream({
      text: "| a | b | c |\n|---|---|---|\n| 1 | 2 |\n| 3 | 4 | 5 |",
    });
    expect(screen.queryByTestId("answer-table")).not.toBeInTheDocument();
    expect(container.textContent).toContain("| 1 | 2 |");
  });
});
