import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import { CitationChip } from "@/components/chat/citation-chip";
import { SourcesAccordion } from "@/components/chat/sources-accordion";
import {
  getCitationHighlight,
  stashCitationHighlight,
  subscribeCitationHighlight,
} from "@/components/chat/highlight-bus";

const CITATION = {
  n: 1,
  docId: "fy25-er",
  page: 4,
  quote: "GMV 7,245.2 (+10.8% YoY), Group Financial Summary FY2025",
};

describe("citation-highlight bus plumbing", () => {
  it("stash → get returns the quote with a nonce; listeners fire", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeCitationHighlight(listener);
    stashCitationHighlight({ docId: "d", page: 2, quote: "q" });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(getCitationHighlight()).toMatchObject({
      docId: "d",
      page: 2,
      quote: "q",
    });
    expect(getCitationHighlight()?.nonce).toBeTypeOf("number");
    unsubscribe();
    stashCitationHighlight({ docId: "d2", page: 3, quote: "q2" });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("CitationChip click stashes its citation's quote, then opens the doc", async () => {
    const onOpen = vi.fn(() =>
      // the open handler (ChatView/IcRoom) runs AFTER the stash is in place,
      // so the panel can read it on its very first render
      expect(getCitationHighlight()).toMatchObject({
        docId: CITATION.docId,
        page: CITATION.page,
        quote: CITATION.quote,
      }),
    );
    render(<CitationChip n={1} citation={CITATION} onOpen={onOpen} />);
    await userEvent.click(
      screen.getByRole("button", { name: "Open source 1" }),
    );
    expect(onOpen).toHaveBeenCalledWith(CITATION.docId, CITATION.page);
  });

  it("SourcesAccordion row click stashes the row's quote, then opens the doc", async () => {
    const onOpenDoc = vi.fn();
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <SourcesAccordion
          citations={[CITATION]}
          docTitle={() => "Q4 2025 Earnings Results"}
          onOpenDoc={onOpenDoc}
        />
      </NextIntlClientProvider>,
    );
    await userEvent.click(screen.getByRole("button", { name: /Sources/ }));
    await userEvent.click(screen.getByText(CITATION.quote));
    expect(onOpenDoc).toHaveBeenCalledWith(CITATION.docId, CITATION.page);
    expect(getCitationHighlight()).toMatchObject({ quote: CITATION.quote });
  });
});
