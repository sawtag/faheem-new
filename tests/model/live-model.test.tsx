import * as React from "react";
import { beforeAll, describe, expect, it } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import ar from "@/messages/ar.json";
import { LiveModel } from "@/components/model/live-model";

// Force reduced motion so every count-up lands on its value immediately,
// deterministic value assertions, no rAF flakiness.
beforeAll(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: query.includes("prefers-reduced-motion"),
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }),
  });
});

const NAME = { en: "Jahez", ar: "جاهز" };

function renderModel(locale: "en" | "ar" = "en") {
  const messages = locale === "en" ? en : ar;
  return render(
    <NextIntlClientProvider locale={locale} messages={messages}>
      <LiveModel companyId="jahez" companyName={NAME} />
    </NextIntlClientProvider>,
  );
}

function cell(container: HTMLElement, key: string): HTMLElement {
  const el = container.querySelector<HTMLElement>(`[data-node-key="${key}"]`);
  if (!el) throw new Error(`no cell for ${key}`);
  return el;
}

describe("LiveModel, base render", () => {
  it("renders base-case numbers straight from the engine", () => {
    const { container } = renderModel();
    // scenario strip is always mounted, base per-share = SAR 14.36
    expect(cell(container, "base.perShare").textContent).toContain("14.36");
    expect(cell(container, "bull.perShare").textContent).toContain("19.24");
    expect(cell(container, "bear.perShare").textContent).toContain("10.03");
  });
});

describe("LiveModel, assumption edit → recompute", () => {
  it("editing an assumption cell recomputes outputs and surfaces the diff chip", async () => {
    const user = userEvent.setup();
    const { container } = renderModel();

    const before = cell(container, "base.perShare").textContent;
    expect(before).toContain("14.36");

    // select the FY26E order-growth assumption cell, then step it up
    await user.click(cell(container, "assumptions.ordersGrowth.0"));
    const editorCell = cell(container, "assumptions.ordersGrowth.0");
    const inc = within(editorCell).getByRole("button", { name: /Increase/i });
    await user.click(inc);

    // outputs moved and the "N values updated" chip appeared
    await waitFor(() => {
      expect(cell(container, "base.perShare").textContent).not.toBe(before);
    });
    expect(screen.getByTestId("diff-chip")).toBeInTheDocument();
  });
});

describe("LiveModel, sourced cells are locked", () => {
  it("a sourced cell shows the lock affordance and offers NO edit control", async () => {
    const user = userEvent.setup();
    const { container } = renderModel();

    await user.click(screen.getByRole("tab", { name: "DCF" }));

    const priceCell = await waitFor(() => cell(container, "price"));
    expect(priceCell).toHaveAttribute("data-kind", "sourced");

    await user.click(priceCell);
    // locked caption, and crucially no numeric input to edit it
    expect(within(priceCell).queryByRole("spinbutton")).toBeNull();
    expect(
      within(priceCell).getByText(en.model.live.cell.locked),
    ).toBeInTheDocument();
  });

  it("an assumption cell DOES offer an edit control", async () => {
    const user = userEvent.setup();
    const { container } = renderModel();
    const c = cell(container, "assumptions.ordersGrowth.0");
    expect(c).toHaveAttribute("data-kind", "assumption");
    await user.click(c);
    expect(within(c).getByRole("spinbutton")).toBeInTheDocument();
  });
});

describe("LiveModel, Methodology panel", () => {
  it("opens on cell click on that cell's node", async () => {
    const user = userEvent.setup();
    const { container } = renderModel();

    await user.click(screen.getByRole("tab", { name: "DCF" }));
    await user.click(await waitFor(() => cell(container, "wacc")));

    const sheet = await screen.findByTestId("methodology-sheet");
    // the panel heads on the clicked node, WACC, and renders its formula
    expect(within(sheet).getAllByText("WACC").length).toBeGreaterThan(0);
    expect(
      within(sheet).getByText(en.model.formulas.wacc as string),
    ).toBeInTheDocument();
  });
});

describe("LiveModel, reset", () => {
  it("Reset-to-base returns outputs to the base case", async () => {
    const user = userEvent.setup();
    const { container } = renderModel();

    await user.click(cell(container, "assumptions.ordersGrowth.0"));
    await user.click(
      within(cell(container, "assumptions.ordersGrowth.0")).getByRole(
        "button",
        { name: /Increase/i },
      ),
    );
    await waitFor(() => {
      expect(cell(container, "base.perShare").textContent).not.toContain(
        "14.36",
      );
    });

    await user.click(screen.getByRole("button", { name: /Reset to base/i }));
    await waitFor(() => {
      expect(cell(container, "base.perShare").textContent).toContain("14.36");
    });
  });
});

describe("LiveModel, Arabic", () => {
  it("renders under ar without leaking i18n keys and keeps the grid body LTR", () => {
    const { container } = renderModel("ar");
    // no raw model.* keys leaked into rendered text
    expect(container.textContent).not.toMatch(/model\.[a-zA-Z.]+/);
    // numeric grids stay LTR (finance convention); Western digits preserved
    expect(container.querySelectorAll('[dir="ltr"]').length).toBeGreaterThan(0);
    expect(cell(container, "base.perShare").textContent).toContain("14.36");
  });
});
