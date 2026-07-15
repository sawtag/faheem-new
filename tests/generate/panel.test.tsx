import * as React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import { GenerationPanel } from "@/components/generate/generation-panel";
import type { ArtifactMeta } from "@/lib/types";
import type { GenerateEvent } from "@/components/generate/protocol";

function renderPanel() {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <GenerationPanel workspace="jahez" />
    </NextIntlClientProvider>,
  );
}

/** A ReadableStream the test drives frame-by-frame, mirroring the real SSE wire. */
function fakeStream() {
  let controller!: ReadableStreamDefaultController<Uint8Array>;
  const stream = new ReadableStream<Uint8Array>({
    start(c) {
      controller = c;
    },
  });
  const encoder = new TextEncoder();
  return {
    stream,
    push(event: GenerateEvent) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
    },
    close() {
      controller.close();
    },
  };
}

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

afterEach(() => vi.unstubAllGlobals());

describe("GenerationPanel", () => {
  it("advances rows through the phase choreography, then renders file cards with the sources caption", async () => {
    const fake = fakeStream();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        expect(url).toBe("/api/generate/all");
        return { body: fake.stream } as unknown as Response;
      }),
    );

    renderPanel();

    // pending rows render before any stage event
    expect(screen.getByText("Valuation Model")).toBeInTheDocument();
    expect(screen.getByText("IC Memo")).toBeInTheDocument();
    expect(screen.getByText("Board Deck")).toBeInTheDocument();

    fake.push({
      type: "stage",
      artifact: "xlsx",
      phase: "assembling",
      status: "start",
    });
    expect(
      await screen.findByText("Assembling model inputs"),
    ).toBeInTheDocument();

    fake.push({
      type: "stage",
      artifact: "xlsx",
      phase: "assembling",
      status: "done",
    });
    fake.push({
      type: "stage",
      artifact: "xlsx",
      phase: "building",
      status: "start",
    });
    expect(
      await screen.findByText("Building the workbook"),
    ).toBeInTheDocument();

    fake.push({
      type: "stage",
      artifact: "xlsx",
      phase: "building",
      status: "done",
    });
    fake.push({
      type: "stage",
      artifact: "xlsx",
      phase: "writing",
      status: "start",
    });
    expect(await screen.findByText("Writing file")).toBeInTheDocument();

    fake.push({
      type: "artifact",
      artifact: "xlsx",
      meta: meta("xlsx"),
      sizeBytes: 48_128,
    });
    expect(
      await screen.findByText("Jahez · Valuation Model"),
    ).toBeInTheDocument();
    expect(screen.getByText("47 KB")).toBeInTheDocument();

    fake.push({
      type: "artifact",
      artifact: "docx",
      meta: meta("docx"),
      sizeBytes: 20_480,
    });
    fake.push({
      type: "artifact",
      artifact: "pptx",
      meta: meta("pptx"),
      sizeBytes: 512_000,
    });
    fake.push({ type: "done" });
    fake.close();

    expect(await screen.findByText("Jahez · IC Memo")).toBeInTheDocument();
    // findAll, once the run completes the deck preview auto-opens (below) and
    // its header repeats the deck name, so a single-match query would throw.
    expect(
      (await screen.findAllByText("Jahez · Board Deck")).length,
    ).toBeGreaterThanOrEqual(1);

    // all three cards carry the real "Verified · N sources" caption
    expect(screen.getAllByText("Verified · 5 sources")).toHaveLength(3);

    // download + open-in-workspace affordances
    const downloadLinks = screen.getAllByRole("link", { name: "Download" });
    expect(downloadLinks).toHaveLength(3);
    expect(downloadLinks[0]).toHaveAttribute(
      "href",
      "/artifacts/jahez-valuation-model.xlsx",
    );

    const workspaceLinks = screen.getAllByRole("link", {
      name: "Open in workspace",
    });
    expect(workspaceLinks).toHaveLength(3);
    expect(workspaceLinks[0]).toHaveAttribute(
      "href",
      "/deals/jahez?tab=artifacts",
    );

    // every landed card carries the primary Preview affordance
    expect(screen.getAllByRole("button", { name: "Preview" })).toHaveLength(3);

    // the money moment: the completed "all" run AUTO-OPENS the deck preview
    // (400ms beat after the last card lands) with the full 8-thumbnail rail.
    const preview = await screen.findByTestId("artifact-preview", undefined, {
      timeout: 2500,
    });
    expect(
      within(preview).getAllByRole("button", { name: /^Slide \d$/ }),
    ).toHaveLength(8);
    expect(within(preview).getByText("Slide 1 of 8")).toBeInTheDocument();
  });

  it("shows an inline error on a row without blocking the others", async () => {
    const fake = fakeStream();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ body: fake.stream }) as unknown as Response),
    );

    renderPanel();

    fake.push({
      type: "error",
      artifact: "docx",
      message: "boom",
    });
    expect(
      await screen.findByText("Couldn't generate this file. Try again."),
    ).toBeInTheDocument();

    // the other two rows are unaffected, still pending
    expect(screen.getByText("Valuation Model")).toBeInTheDocument();
    expect(screen.getByText("Board Deck")).toBeInTheDocument();

    fake.push({ type: "done" });
    fake.close();
  });
});
