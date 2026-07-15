import * as React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";

// react-pdf needs a real pdfjs worker + canvas; the maximize toggle under test
// is pure React state, so the viewer internals are stubbed out.
vi.mock("react-pdf", () => ({
  Document: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="pdf-doc">{children}</div>
  ),
  Page: () => <div data-testid="pdf-page" />,
  pdfjs: { GlobalWorkerOptions: {} },
}));
vi.mock("react-pdf/dist/Page/TextLayer.css", () => ({}));

// jsdom has no ResizeObserver (the panel uses it for fit-width tracking)
class RO {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal("ResizeObserver", RO);

import PdfPanel from "@/components/chat/pdf-panel";

function renderPanel(onClose = vi.fn()) {
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <PdfPanel
        docId="fy25-er"
        page={4}
        title="FY2025 Earnings Release"
        onClose={onClose}
        onPageChange={() => {}}
      />
    </NextIntlClientProvider>,
  );
  return onClose;
}

describe("PdfPanel maximize toggle", () => {
  it("expands to a fixed full-viewport overlay and back, icon labels toggling", async () => {
    const user = userEvent.setup();
    renderPanel();

    const expand = screen.getByRole("button", { name: "Expand" });
    const root = expand.closest("div.bg-card") as HTMLElement;
    expect(root.className).not.toContain("fixed");

    await user.click(expand);
    const restore = screen.getByRole("button", { name: "Exit full screen" });
    expect(restore).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Expand" }),
    ).not.toBeInTheDocument();
    expect(root.className).toContain("fixed");
    expect(root.className).toContain("inset-0");

    await user.click(restore);
    expect(screen.getByRole("button", { name: "Expand" })).toBeInTheDocument();
    expect(root.className).not.toContain("fixed");
  });

  it("Escape restores from maximized without closing the panel; X still closes", async () => {
    const user = userEvent.setup();
    const onClose = renderPanel();

    await user.click(screen.getByRole("button", { name: "Expand" }));
    await user.keyboard("{Escape}");
    expect(screen.getByRole("button", { name: "Expand" })).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Expand" }));
    await user.click(screen.getByRole("button", { name: "Close document" }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
