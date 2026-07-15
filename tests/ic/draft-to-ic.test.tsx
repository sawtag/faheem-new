import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import ar from "@/messages/ar.json";
import { DraftToIc } from "@/components/ic/draft-to-ic";
import { computeModel } from "@/lib/model/compute";
import { formatPercent, formatSAR } from "@/lib/utils";
import type { ArtifactMeta, Lang } from "@/lib/types";

const recordIcDraft = vi.fn();
vi.mock("@/components/ic/draft-actions", () => ({
  recordIcDraft: (...args: unknown[]) => recordIcDraft(...args),
}));

afterEach(() => {
  recordIcDraft.mockClear();
});

const ARTIFACTS: ArtifactMeta[] = [
  {
    id: "jahez-xlsx",
    kind: "xlsx",
    name: { en: "Jahez · Valuation Model", ar: "جاهز · نموذج التقييم" },
    workspace: "jahez",
    file: "/artifacts/jahez-valuation-model.xlsx",
    createdAt: "2026-07-12T21:22:18.068Z",
  },
  {
    id: "jahez-docx",
    kind: "docx",
    name: { en: "Jahez · IC Memo", ar: "جاهز · مذكرة لجنة الاستثمار" },
    workspace: "jahez",
    file: "/artifacts/jahez-ic-memo.docx",
    createdAt: "2026-07-12T21:22:19.564Z",
  },
];

function renderDialog(locale: Lang) {
  const messages = locale === "ar" ? ar : en;
  render(
    <NextIntlClientProvider locale={locale} messages={messages}>
      <DraftToIc workspace="jahez" artifacts={ARTIFACTS} />
    </NextIntlClientProvider>,
  );
}

function openDialog(locale: Lang) {
  const label =
    locale === "ar" ? ar.generate.draft.trigger : en.generate.draft.trigger;
  fireEvent.click(screen.getByRole("button", { name: label }));
}

describe("DraftToIc", () => {
  it("opens with prefilled recipients, subject, and a body carrying computeModel()'s real numbers (EN)", () => {
    renderDialog("en");
    openDialog("en");

    const dialog = screen.getByTestId("draft-to-ic-dialog");
    expect(within(dialog).getByText("Draft email to IC")).toBeInTheDocument();

    // pre-selected recipient chip, not fabricated, the house "Lunar IC Group" alias
    const chips = within(dialog).getByTestId("draft-to-ic-recipients");
    expect(chips).toHaveTextContent("Lunar IC Group <ic@lunar-inv.sa>");

    // subject prefilled with the company name
    const subject = within(dialog).getByTestId(
      "draft-to-ic-subject",
    ) as HTMLInputElement;
    expect(subject.value).toBe("Jahez: IC materials & recommendation");

    // body carries computeModel()'s ACTUAL numbers, house-formatted, never literals
    const result = computeModel();
    const perShare = formatSAR(result.base.perShare, "en", {
      unit: "abs",
      decimals: 2,
    });
    const irr = formatPercent(result.weightedReturn * 100, "en", {
      decimals: 1,
    });
    const hurdle = formatPercent(result.ic.hurdle, "en", { decimals: 0 });

    const body = within(dialog).getByTestId(
      "draft-to-ic-body",
    ) as HTMLTextAreaElement;
    expect(body.value).toContain(perShare);
    expect(body.value).toContain(irr);
    expect(body.value).toContain(hurdle);
    expect(body.value).toContain(
      result.shariah.pass ? "The Shariah screen passes." : "does not pass",
    );
    // artifact names, real ones passed in, bulleted
    expect(body.value).toContain("- Jahez · Valuation Model");
    expect(body.value).toContain("- Jahez · IC Memo");
    expect(body.value).toContain("Ali");
  });

  it("body and subject are editable, and the mailto href stays in sync", () => {
    renderDialog("en");
    openDialog("en");
    const dialog = screen.getByTestId("draft-to-ic-dialog");

    fireEvent.change(within(dialog).getByTestId("draft-to-ic-subject"), {
      target: { value: "A revised subject" },
    });
    fireEvent.change(within(dialog).getByTestId("draft-to-ic-body"), {
      target: { value: "A hand-edited body." },
    });

    const link = within(dialog).getByTestId(
      "draft-to-ic-open-in-outlook",
    ) as HTMLAnchorElement;
    expect(link.href).toContain(encodeURIComponent("A revised subject"));
    expect(link.href).toContain(encodeURIComponent("A hand-edited body."));
  });

  it("mailto href is well-formed: protocol, encoded subject+body, recipients comma-joined", () => {
    renderDialog("en");
    openDialog("en");
    const dialog = screen.getByTestId("draft-to-ic-dialog");

    const link = within(dialog).getByTestId(
      "draft-to-ic-open-in-outlook",
    ) as HTMLAnchorElement;
    expect(link.getAttribute("href")).toMatch(/^mailto:/);
    expect(link.href).toContain(
      `mailto:${encodeURIComponent("Lunar IC Group <ic@lunar-inv.sa>")}?`,
    );
    expect(link.href).toContain("subject=");
    expect(link.href).toContain("body=");
  });

  it("adding + removing a recipient chip updates the mailto href's recipient list", () => {
    renderDialog("en");
    openDialog("en");
    const dialog = screen.getByTestId("draft-to-ic-dialog");

    const input = within(dialog).getByPlaceholderText(
      "Add a recipient, then press Enter",
    );
    fireEvent.change(input, { target: { value: "ali@lunar-inv.sa" } });
    fireEvent.keyDown(input, { key: "Enter" });

    const chips = within(dialog).getByTestId("draft-to-ic-recipients");
    expect(chips).toHaveTextContent("ali@lunar-inv.sa");

    const link = within(dialog).getByTestId(
      "draft-to-ic-open-in-outlook",
    ) as HTMLAnchorElement;
    expect(link.href).toContain(encodeURIComponent("ali@lunar-inv.sa"));

    // remove the default chip
    fireEvent.click(
      within(dialog).getByRole("button", {
        name: "Remove Lunar IC Group <ic@lunar-inv.sa>",
      }),
    );
    expect(chips).not.toHaveTextContent("Lunar IC Group");
  });

  it('clicking "Open in Outlook" records an ic-draft audit entry carrying the subject', () => {
    renderDialog("en");
    openDialog("en");
    const dialog = screen.getByTestId("draft-to-ic-dialog");

    fireEvent.click(within(dialog).getByTestId("draft-to-ic-open-in-outlook"));

    expect(recordIcDraft).toHaveBeenCalledTimes(1);
    expect(recordIcDraft).toHaveBeenCalledWith(
      "jahez",
      "Jahez: IC materials & recommendation",
    );
  });

  it("renders fully in Arabic with no leaked message keys", () => {
    renderDialog("ar");
    openDialog("ar");
    const dialog = screen.getByTestId("draft-to-ic-dialog");

    expect(
      within(dialog).getByText("صياغة بريد للجنة الاستثمار"),
    ).toBeInTheDocument();
    const chips = within(dialog).getByTestId("draft-to-ic-recipients");
    expect(chips).toHaveTextContent("مجموعة لجنة الاستثمار بلونار");

    const body = within(dialog).getByTestId(
      "draft-to-ic-body",
    ) as HTMLTextAreaElement;
    expect(body.value).toContain("علي");
    expect(body.value).not.toMatch(/generate\.draft\.[a-z]/i);

    const subject = within(dialog).getByTestId(
      "draft-to-ic-subject",
    ) as HTMLInputElement;
    expect(subject.value).not.toMatch(/generate\.draft\.[a-z]/i);
    expect(dialog.textContent ?? "").not.toMatch(/generate\.draft\.[a-z]/i);
  });
});
