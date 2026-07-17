import * as React from "react";
import { beforeAll, describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import ar from "@/messages/ar.json";
import ConnectionsPage from "@/app/(app)/connections/page";
import { CONNECTORS } from "@/lib/connectors";

/**
 * Data Sources page structure (connections restructure): three group sections
 * in order (Internal · External · Broker Research), each split into Activated /
 * Available to connect, with a per-row sourceType chip. Counts are derived from
 * the catalog so a future catalog edit updates the expectations in lock-step.
 */

const CONNECTED = CONNECTORS.filter((c) => c.status === "connected").length;
const AVAILABLE = CONNECTORS.filter((c) => c.status === "available").length;
const API_COUNT = CONNECTORS.filter((c) => c.sourceType === "api").length;
const FILES_COUNT = CONNECTORS.filter((c) => c.sourceType === "files").length;

beforeAll(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
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

function renderPage(locale: "en" | "ar") {
  return render(
    <NextIntlClientProvider
      locale={locale}
      messages={locale === "ar" ? ar : en}
    >
      <ConnectionsPage />
    </NextIntlClientProvider>,
  );
}

describe("Data Sources page", () => {
  it("renders the three group sections in order with localized titles", () => {
    renderPage("en");
    const headings = screen
      .getAllByRole("heading", { level: 2 })
      .map((h) => h.textContent);
    expect(headings).toEqual(["Internal", "External", "Broker Research"]);
  });

  it("localizes the section titles in Arabic", () => {
    renderPage("ar");
    const headings = screen
      .getAllByRole("heading", { level: 2 })
      .map((h) => h.textContent);
    expect(headings).toEqual([
      "المصادر الداخلية",
      "المصادر الخارجية",
      "أبحاث الوسطاء",
    ]);
  });

  it("splits every section into an Activated and an Available to connect subsection", () => {
    renderPage("en");
    // Each of the three groups has both an activated and an available entry.
    expect(
      screen.getAllByRole("heading", { level: 3, name: "Activated" }),
    ).toHaveLength(3);
    expect(
      screen.getAllByRole("heading", {
        level: 3,
        name: "Available to connect",
      }),
    ).toHaveLength(3);
  });

  it("places connected connectors under Activated and available ones under Available to connect", () => {
    renderPage("en");
    // Available rows expose a Connect button; connected rows expose Configure.
    expect(screen.getAllByRole("button", { name: "Connect" })).toHaveLength(
      AVAILABLE,
    );
    expect(screen.getAllByRole("button", { name: "Configure" })).toHaveLength(
      CONNECTED,
    );

    // Alinma Capital Research is the activated broker (sponsor synergy): its
    // row carries the Connected label and no Connect button.
    const alinma = screen.getByText("Alinma Capital").closest(".min-h-16");
    expect(alinma).not.toBeNull();
    const alinmaRow = within(alinma as HTMLElement);
    expect(alinmaRow.getByText("Connected")).toBeInTheDocument();
    expect(alinmaRow.queryByRole("button", { name: "Connect" })).toBeNull();
  });

  it("renders a sourceType chip on each row", () => {
    renderPage("en");
    // Exact-match text excludes the "SAHMK API" name; only chips read "API".
    expect(screen.getAllByText("API")).toHaveLength(API_COUNT);
    expect(screen.getAllByText("Files")).toHaveLength(FILES_COUNT);
  });
});
