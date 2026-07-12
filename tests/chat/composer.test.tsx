import * as React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import { Composer } from "@/components/chat/composer";
import type { ChatContext } from "@/lib/types";

function renderComposer(props: {
  context: ChatContext;
  onSubmit: (p: unknown) => void;
  companyName?: string;
}) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <Composer lang="en" {...props} />
    </NextIntlClientProvider>,
  );
}

afterEach(() => vi.unstubAllGlobals());

describe("Composer @ typeahead", () => {
  it("filters agents, inserts a chip, and sets ChatRequest.agent", async () => {
    const onSubmit = vi.fn();
    renderComposer({ context: { kind: "firm" }, onSubmit });
    const box = screen.getByRole("textbox");

    await userEvent.type(box, "@rese");
    const option = await screen.findByRole("button", {
      name: /Research & Sourcing/,
    });
    await userEvent.click(option);

    // the chip (its unique Remove button) confirms the @-mention was inserted
    expect(
      await screen.findByRole("button", { name: "Remove" }),
    ).toBeInTheDocument();

    await userEvent.type(box, "revenue quality{Enter}");
    expect(onSubmit).toHaveBeenCalledWith({
      question: "revenue quality",
      agent: "research",
      docIds: undefined,
    });
  });
});

describe("Composer # typeahead", () => {
  it("filters docs, inserts a chip, and sets ChatRequest.docIds", async () => {
    const onSubmit = vi.fn();
    renderComposer({
      context: { kind: "workspace", companyId: "jahez" },
      companyName: "Jahez",
      onSubmit,
    });
    const box = screen.getByRole("textbox");

    await userEvent.type(box, "#fy25-er");
    const option = await screen.findByRole("button", {
      name: /Q4 2025 Earnings Results/,
    });
    await userEvent.click(option);

    await userEvent.type(box, "unit economics{Enter}");
    expect(onSubmit).toHaveBeenCalledWith({
      question: "unit economics",
      agent: undefined,
      docIds: ["fy25-er"],
    });
  });
});

describe("Composer Improve wand", () => {
  it("swaps the textarea with the improved prompt and Undo restores it", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        json: async () => ({
          improved: "Analyze Jahez FY2025 revenue quality, with citations.",
        }),
      })),
    );
    const onSubmit = vi.fn();
    renderComposer({ context: { kind: "firm" }, onSubmit });
    const box = screen.getByRole("textbox") as HTMLTextAreaElement;

    await userEvent.type(box, "jahez revenue quality");
    const wand = await screen.findByRole("button", { name: "Improve" });
    await userEvent.click(wand);

    const undo = await screen.findByRole("button", { name: "Undo" });
    expect(box.value).toBe(
      "Analyze Jahez FY2025 revenue quality, with citations.",
    );

    await userEvent.click(undo);
    expect(box.value).toBe("jahez revenue quality");
  });
});
