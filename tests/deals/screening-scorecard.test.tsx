import * as React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import { ScreeningScorecard } from "@/components/deals/screening-scorecard";
import type { ScreeningRow } from "@/lib/types";

const ROWS: ScreeningRow[] = [
  {
    criterion: { en: "Sector mandate", ar: "التفويض القطاعي" },
    verdict: "pass",
    note: { en: "Within mandate.", ar: "ضمن التفويض." },
    cite: { docId: "lunar-ic-charter", page: 3 },
  },
  {
    criterion: { en: "Concentration", ar: "التركّز" },
    verdict: "warn",
    note: { en: "Post-deal exposure 10.5%.", ar: "التعرّض بعد الصفقة 10.5%." },
    cite: { docId: "lunar-ic-charter", page: 4 },
  },
  {
    criterion: { en: "Stage fit", ar: "ملاءمة المرحلة" },
    verdict: "fail",
    note: { en: "Outside the stage window.", ar: "خارج نطاق المراحل." },
    cite: { docId: "lunar-ic-charter", page: 5 },
  },
];

const VERDICT = {
  en: "Recommend advancing, decision: yours.",
  ar: "يُوصى بالانتقال، القرار لكم.",
};

function renderScorecard(onCite = vi.fn()) {
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <ScreeningScorecard rows={ROWS} verdict={VERDICT} onCite={onCite} />
    </NextIntlClientProvider>,
  );
  return onCite;
}

describe("ScreeningScorecard", () => {
  it("renders one row per criterion with its verdict badge", () => {
    renderScorecard();
    expect(screen.getAllByTestId("scorecard-row")).toHaveLength(3);
    expect(screen.getByText("Pass")).toBeInTheDocument();
    expect(screen.getByText("Flag")).toBeInTheDocument();
    expect(screen.getByText("Fail")).toBeInTheDocument();
    expect(screen.getByText("Concentration")).toBeInTheDocument();
  });

  it("renders the verdict line and the confidentiality note", () => {
    renderScorecard();
    expect(screen.getByText(VERDICT.en)).toBeInTheDocument();
    expect(
      screen.getByText("Details anonymized (client confidentiality)."),
    ).toBeInTheDocument();
  });

  it("cite chip click hands {docId, page} to onCite", async () => {
    const onCite = renderScorecard();
    await userEvent.click(
      screen.getByRole("button", { name: "Open the IC Charter at page 4" }),
    );
    expect(onCite).toHaveBeenCalledExactlyOnceWith({
      docId: "lunar-ic-charter",
      page: 4,
    });
  });
});
