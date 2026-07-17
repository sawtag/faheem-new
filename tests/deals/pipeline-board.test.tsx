import * as React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import { PipelineBoard } from "@/components/deals/pipeline-board";
import { DEALS } from "@/lib/deals";

// Reduced motion → count-up stats resolve to the final figure synchronously,
// so the rendered numbers assert deterministically (no rAF flake).
vi.mock("motion/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("motion/react")>();
  return { ...actual, useReducedMotion: () => true };
});

function renderBoard() {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <PipelineBoard deals={DEALS} />
    </NextIntlClientProvider>,
  );
}

describe("PipelineBoard", () => {
  it("renders all four stage columns with human-gate markers between them", () => {
    renderBoard();

    for (const stage of ["Screening", "Analysis", "IC Review", "Declined"]) {
      expect(screen.getByRole("region", { name: stage })).toBeInTheDocument();
    }
    // three gates bridge four columns (screening→analysis→ic→decision)
    expect(screen.getAllByTestId("human-gate")).toHaveLength(3);
  });

  it("keeps filtered-out columns visible with an empty-stage slot", async () => {
    renderBoard();
    await userEvent.click(
      screen.getByRole("button", { name: "Market Screen (Public)" }),
    );

    // only Jahez survives the public filter…
    expect(screen.getAllByTestId("deal-card")).toHaveLength(1);
    expect(
      within(screen.getByRole("region", { name: "Analysis" })).getByTestId(
        "deal-card",
      ),
    ).toHaveAttribute("data-deal", "jahez");
    // …and the other three columns show the quiet empty slot, not collapse
    expect(screen.getAllByText("No deals at this stage.")).toHaveLength(3);
  });

  it("shows the screening verdict strip on the screening-stage card", () => {
    renderBoard();
    const darb = screen
      .getAllByTestId("deal-card")
      .find((c) => c.getAttribute("data-deal") === "darb")!;

    // one segment per criterion: Darb's scorecard is 5 pass + 1 warn
    const segments = within(darb).getAllByTestId("screen-segment");
    expect(segments).toHaveLength(6);
    expect(
      segments.filter((s) => s.getAttribute("data-verdict") === "pass"),
    ).toHaveLength(5);
    expect(within(darb).getByText(/5\s+Pass/)).toBeInTheDocument();
    expect(within(darb).getByText(/1\s+Flag/)).toBeInTheDocument();
    expect(within(darb).getByText("vs the IC Charter")).toBeInTheDocument();
  });

  it("shows IRR vs benchmark with a sourced caption on metric-bearing cards", () => {
    renderBoard();
    const jahez = screen
      .getAllByTestId("deal-card")
      .find((c) => c.getAttribute("data-deal") === "jahez")!;

    // Jahez: IRR 17.1% vs 15% benchmark → +210 bps, above tone
    expect(within(jahez).getByText("17.1%")).toBeInTheDocument();
    expect(within(jahez).getByText("15%")).toBeInTheDocument();
    expect(within(jahez).getByTestId("card-irr-delta")).toHaveAttribute(
      "data-tone",
      "above",
    );
    expect(within(jahez).getByTestId("card-irr-delta")).toHaveTextContent(
      "210 bps",
    );
    // rule 5: the figures carry their source caption (analysis summary p.2)
    expect(
      within(jahez).getByText("Analysis summary · p.2"),
    ).toBeInTheDocument();

    // declined cards carry neither evidence strip
    const aqar = screen
      .getAllByTestId("deal-card")
      .find((c) => c.getAttribute("data-deal") === "aqar")!;
    expect(within(aqar).queryByTestId("screen-segment")).toBeNull();
    expect(within(aqar).queryByTestId("card-irr-delta")).toBeNull();
  });
});
