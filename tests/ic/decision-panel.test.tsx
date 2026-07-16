import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import ar from "@/messages/ar.json";
import { DecisionPanel } from "@/components/ic/decision-panel";
import { readDecisions } from "@/components/ic/decision";
import {
  subscribeGoldenSelection,
  type GoldenSelection,
} from "@/lib/demo/golden-bus";
import type { ArtifactMeta, Deal, Lang } from "@/lib/types";

const recordIcDecision = vi.fn((summary: string) => Promise.resolve(summary));
vi.mock("@/components/ic/decision-actions", () => ({
  recordIcDecision: (summary: string) => recordIcDecision(summary),
}));

const DEALS: Deal[] = [
  {
    id: "jahez",
    name: { en: "Jahez", ar: "جاهز" },
    sector: { en: "Consumer tech", ar: "تقنية المستهلك" },
    origin: "market-screen",
    stage: "analysis",
    statusLine: { en: "", ar: "" },
    icMetrics: {
      irr: 17.1,
      hurdle: 15,
      expectedReturn: 16.8,
      riskScore: 5.5,
      mandateFit: "pass",
      compliance: "pass",
      recommendation: {
        en: "Strongest risk-adjusted case.",
        ar: "الحالة الأقوى بعد تعديلها بالمخاطر.",
      },
      cite: { docId: "jahez-analysis-summary", page: 2 },
    },
  },
  {
    id: "thara-pay",
    name: { en: "Thara Pay", ar: "ثرى باي" },
    sector: { en: "Fintech", ar: "التقنية المالية" },
    origin: "inbound",
    stage: "ic-review",
    statusLine: { en: "", ar: "" },
    icMetrics: {
      irr: 18.5,
      hurdle: 15,
      expectedReturn: 16.2,
      riskScore: 5,
      mandateFit: "pass",
      compliance: "pass",
      recommendation: {
        en: "Strongest case pending diligence.",
        ar: "الحالة الأقوى رهناً بالعناية الواجبة.",
      },
      cite: { docId: "thara-analysis", page: 2 },
    },
  },
];

const ARTIFACTS: ArtifactMeta[] = [
  {
    id: "jahez-xlsx",
    kind: "xlsx",
    name: { en: "Jahez · Valuation Model", ar: "جاهز · نموذج التقييم" },
    workspace: "jahez",
    file: "/artifacts/jahez-valuation-model.xlsx",
    createdAt: "2026-07-12T21:22:18.068Z",
  },
];

function renderPanel(locale: Lang = "en", onOpenDoc = vi.fn()) {
  render(
    <NextIntlClientProvider
      locale={locale}
      messages={locale === "ar" ? ar : en}
    >
      <DecisionPanel
        columns={DEALS}
        artifacts={ARTIFACTS}
        onOpenDoc={onOpenDoc}
      />
    </NextIntlClientProvider>,
  );
  return onOpenDoc;
}

beforeEach(() => window.localStorage.clear());
afterEach(() => recordIcDecision.mockClear());

describe("DecisionPanel", () => {
  it("renders one decision card per committee column with the verified brief", () => {
    renderPanel();
    const jahez = screen.getByTestId("ic-decision-card-jahez");
    expect(
      within(jahez).getByText("Clears the 15% IRR hurdle by 210 bps"),
    ).toBeInTheDocument();
    expect(
      within(jahez).getByText("Risk score 5.5 / 10: moderate"),
    ).toBeInTheDocument();
    const thara = screen.getByTestId("ic-decision-card-thara-pay");
    expect(
      within(thara).getByText("Clears the 15% IRR hurdle by 350 bps"),
    ).toBeInTheDocument();
    // Jahez's landed deliverable is on the table; Thara only has its analysis.
    expect(
      within(jahez).getByText("Jahez · Valuation Model"),
    ).toBeInTheDocument();
    expect(
      within(thara).queryByText("Jahez · Valuation Model"),
    ).not.toBeInTheDocument();
  });

  it("the artifact sparkle seeds a grounded question into the IC chat bus", () => {
    renderPanel();
    const seen: GoldenSelection[] = [];
    const unsubscribe = subscribeGoldenSelection((sel) => seen.push(sel));
    fireEvent.click(
      screen.getByRole("button", {
        name: "Ask Faheem IC about Jahez · Valuation Model",
      }),
    );
    unsubscribe();
    expect(seen).toHaveLength(1);
    expect(seen[0]!.context).toEqual({ kind: "ic" });
    expect(seen[0]!.text).toBe(
      "Walk me through the key assumptions behind the Jahez valuation model: WACC, terminal growth, and scenario weights.",
    );
  });

  it("choosing a decision opens the confirm dialog with Faheem's brief and the analyst recommendation", () => {
    renderPanel();
    fireEvent.click(screen.getByTestId("ic-decide-advance-thara-pay"));
    const dialog = screen.getByTestId("ic-decision-dialog");
    expect(within(dialog).getByText("Advance · Thara Pay")).toBeInTheDocument();
    expect(
      within(dialog).getByText("Faheem's pre-decision brief"),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText("Strongest case pending diligence."),
    ).toBeInTheDocument();
  });

  it("recording appends to the audit trail, persists locally, and flips the card to its recorded state", async () => {
    renderPanel();
    fireEvent.click(screen.getByTestId("ic-decide-advance-thara-pay"));
    fireEvent.click(screen.getByTestId("ic-decision-record"));

    const recorded = await screen.findByTestId(
      "ic-decision-recorded-thara-pay",
    );
    expect(recorded).toHaveTextContent("Advance");
    expect(recordIcDecision).toHaveBeenCalledWith("Advance · Thara Pay");
    expect(readDecisions()["thara-pay"]?.decision).toBe("advance");
    // Decision buttons are gone; the revise affordance replaces them.
    expect(
      screen.queryByTestId("ic-decide-advance-thara-pay"),
    ).not.toBeInTheDocument();

    // Revise reopens the vote and clears the stored decision.
    fireEvent.click(screen.getAllByRole("button", { name: "Revise" })[0]!);
    expect(readDecisions()["thara-pay"]).toBeUndefined();
    expect(
      screen.getByTestId("ic-decide-advance-thara-pay"),
    ).toBeInTheDocument();
  });

  it("the dialog's cite chip closes the dialog and opens the shared PdfPanel at the cited page", () => {
    const onOpenDoc = renderPanel();
    fireEvent.click(screen.getByTestId("ic-decide-decline-jahez"));
    const dialog = screen.getByTestId("ic-decision-dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: /Source:/ }));
    expect(onOpenDoc).toHaveBeenCalledWith("jahez-analysis-summary", 2);
    expect(screen.queryByTestId("ic-decision-dialog")).not.toBeInTheDocument();
  });

  it("renders the full decision phase in Arabic", () => {
    renderPanel("ar");
    expect(screen.getByText("قرار اللجنة")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "المضي قدماً" }).length).toBe(
      2,
    );
    const jahez = screen.getByTestId("ic-decision-card-jahez");
    expect(
      within(jahez).getByText(
        "يتجاوز عتبة العائد الداخلي البالغة 15% بمقدار 210 نقطة أساس",
      ),
    ).toBeInTheDocument();
  });
});
