import * as React from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import ar from "@/messages/ar.json";
import { SentimentCard } from "@/components/deals/sentiment-card";

function renderCard(locale: "en" | "ar", compact = false) {
  const messages = locale === "ar" ? ar : en;
  render(
    <NextIntlClientProvider locale={locale} messages={messages}>
      <SentimentCard companyId="jahez" compact={compact} />
    </NextIntlClientProvider>,
  );
}

describe("SentimentCard", () => {
  it("renders the label chip, rationale and the signal-only disclaimer (EN)", () => {
    renderCard("en");
    expect(screen.getByText("Market sentiment")).toBeInTheDocument();
    expect(screen.getByText("Cautious")).toBeInTheDocument();
    expect(
      screen.getByText(/price-war discounting and reactions/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Signal only, not a valuation input"),
    ).toBeInTheDocument();
    // no leaked i18n keys
    expect(screen.queryByText(/sentiment\./)).not.toBeInTheDocument();
  });

  it("renders the label chip, rationale and the signal-only disclaimer (AR)", () => {
    renderCard("ar");
    expect(screen.getByText("المزاج السوقي")).toBeInTheDocument();
    expect(screen.getByText("حذر")).toBeInTheDocument();
    expect(
      screen.getByText("مؤشر استرشادي فقط، وليس مدخلاً للتقييم"),
    ).toBeInTheDocument();
    expect(screen.queryByText(/sentiment\./)).not.toBeInTheDocument();
  });

  it("peeking the social pack shows every post tagged illustrative demo data (EN)", async () => {
    renderCard("en");
    await userEvent.click(
      screen.getByRole("button", { name: "View the social pack" }),
    );
    expect(
      screen.getByText("Illustrative social & forum pack"),
    ).toBeInTheDocument();
    const illustrativeTags = screen.getAllByText("Illustrative demo data");
    const posts = screen.getAllByText(/@|forum|GulfBiz/i);
    expect(illustrativeTags.length).toBeGreaterThanOrEqual(6);
    expect(posts.length).toBeGreaterThan(0);
    // handles render LTR even inside the dialog
    expect(screen.getByText("@ksa_markets_watch")).toBeInTheDocument();
  });

  it("peeking the social pack in AR keeps the illustrative tag and shows Arabic post text", async () => {
    renderCard("ar");
    await userEvent.click(
      screen.getByRole("button", { name: "عرض حزمة المحتوى الاجتماعي" }),
    );
    expect(
      screen.getByText("حزمة توضيحية للمحتوى الاجتماعي والمنتديات"),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText("بيانات توضيحية تجريبية").length,
    ).toBeGreaterThanOrEqual(6);
  });

  it("compact variant still renders the disclaimer without the descriptive caption", () => {
    renderCard("en", true);
    expect(
      screen.getByText("Signal only, not a valuation input"),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Qualitative read on social & forum chatter"),
    ).not.toBeInTheDocument();
  });

  it("renders nothing for a company with no recorded sentiment read", () => {
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <SentimentCard companyId="darb" />
      </NextIntlClientProvider>,
    );
    expect(screen.queryByTestId("sentiment-card")).not.toBeInTheDocument();
  });
});
