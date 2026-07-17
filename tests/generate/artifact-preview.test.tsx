import * as React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import { ArtifactPreview } from "@/components/generate/artifact-preview";
import type { ArtifactMeta } from "@/lib/types";

function meta(kind: ArtifactMeta["kind"]): ArtifactMeta {
  const names: Record<ArtifactMeta["kind"], { en: string; ar: string }> = {
    xlsx: { en: "Jahez · Valuation Model", ar: "جاهز · نموذج التقييم" },
    docx: { en: "Jahez · IC Memo", ar: "جاهز · مذكرة لجنة الاستثمار" },
    pptx: {
      en: "Jahez · Board Deck",
      ar: "جاهز · العرض التقديمي لمجلس الإدارة",
    },
  };
  const files: Record<ArtifactMeta["kind"], string> = {
    xlsx: "jahez-valuation-model.xlsx",
    docx: "jahez-ic-memo.docx",
    pptx: "jahez-board-deck.pptx",
  };
  return {
    id: `jahez-${kind}`,
    kind,
    name: names[kind],
    workspace: "jahez",
    file: `/artifacts/${files[kind]}`,
    createdAt: "2026-07-12T09:00:00.000Z",
    sources: 5,
  };
}

function renderPreview(m: ArtifactMeta | null, onClose = vi.fn()) {
  const view = render(
    <NextIntlClientProvider locale="en" messages={en}>
      <ArtifactPreview meta={m} onClose={onClose} />
    </NextIntlClientProvider>,
  );
  return { ...view, onClose };
}

describe("ArtifactPreview", () => {
  it("renders nothing while closed", () => {
    renderPreview(null);
    expect(screen.queryByTestId("artifact-preview")).not.toBeInTheDocument();
  });

  it("pptx: header, 10-thumbnail rail, click + arrow keys switch the active slide", () => {
    renderPreview(meta("pptx"));

    const panel = screen.getByTestId("artifact-preview");
    expect(panel).toHaveAttribute("role", "dialog");
    expect(screen.getByText("Jahez · Board Deck")).toBeInTheDocument();
    expect(
      screen.getByText("Generated · Jul 12, 2026 · Lunar Investments"),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Download file" })).toHaveAttribute(
      "href",
      "/artifacts/jahez-board-deck.pptx",
    );

    // all 10 slide thumbnails, slide 1 active
    const thumbs = screen.getAllByRole("button", { name: /^Slide \d+$/ });
    expect(thumbs).toHaveLength(10);
    expect(thumbs[0]).toHaveAttribute("aria-current", "true");
    expect(screen.getByText("Slide 1 of 10")).toBeInTheDocument();

    // click a thumbnail → jumps
    fireEvent.click(thumbs[2]!);
    expect(screen.getByText("Slide 3 of 10")).toBeInTheDocument();
    expect(thumbs[2]).toHaveAttribute("aria-current", "true");

    // arrow keys → next / prev, clamped at the ends
    fireEvent.keyDown(panel, { key: "ArrowDown" });
    expect(screen.getByText("Slide 4 of 10")).toBeInTheDocument();
    fireEvent.keyDown(panel, { key: "ArrowUp" });
    fireEvent.keyDown(panel, { key: "ArrowLeft" });
    expect(screen.getByText("Slide 2 of 10")).toBeInTheDocument();
    fireEvent.keyDown(panel, { key: "ArrowUp" });
    fireEvent.keyDown(panel, { key: "ArrowUp" });
    expect(screen.getByText("Slide 1 of 10")).toBeInTheDocument();
  });

  it("escape and the close button both close the panel", () => {
    const { onClose } = renderPreview(meta("pptx"));
    fireEvent.keyDown(screen.getByTestId("artifact-preview"), {
      key: "Escape",
    });
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Close preview" }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("docx: stacked pages with page indicators", () => {
    renderPreview(meta("docx"));
    expect(screen.getAllByText(/^Page \d of 3$/)).toHaveLength(3);
    expect(screen.getByText("Page 1 of 3")).toBeInTheDocument();
    expect(screen.getByText("Page 3 of 3")).toBeInTheDocument();
  });

  it("xlsx: named sheet rail (Cover, DCF, Scenarios & Risk, Sensitivity) + open-in-Excel CTA", () => {
    renderPreview(meta("xlsx"));
    for (const sheet of ["Cover", "DCF", "Scenarios & Risk", "Sensitivity"]) {
      expect(screen.getByRole("button", { name: sheet })).toBeInTheDocument();
    }
    expect(screen.getByRole("link", { name: /Open in Excel/ })).toHaveAttribute(
      "href",
      "/artifacts/jahez-valuation-model.xlsx",
    );
  });

  it("a preview PNG that fails to load flips the body to the download fallback (no broken image)", () => {
    const { container } = renderPreview(meta("pptx"));
    const img = container.querySelector("img");
    expect(img).not.toBeNull();
    fireEvent.error(img!);

    expect(screen.getByText("Preview unavailable")).toBeInTheDocument();
    expect(
      screen.getByText("The file itself is ready, download it below."),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Download$/ })).toHaveAttribute(
      "href",
      "/artifacts/jahez-board-deck.pptx",
    );
    // every preview image is gone, nothing broken left on screen
    expect(container.querySelectorAll("img")).toHaveLength(0);
  });
});
