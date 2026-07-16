import * as React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import { SetupCard } from "@/components/home/setup-card";

/**
 * Task E: setup-card visibility, hidden once the firm has finished (or
 * dismissed) onboarding, per the two localStorage flags it reads on mount
 * (Task D's home-hero.tsx / setup-card.tsx).
 *
 * This jsdom build ships no Storage (tests/chat/chat-persistence.test.ts), so
 * polyfill an in-memory localStorage, exactly what setup-card.tsx reads/writes.
 */
function installMemoryLocalStorage(): void {
  const store = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => void store.set(k, String(v)),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
    key: (i: number) => [...store.keys()][i] ?? null,
    get length() {
      return store.size;
    },
  });
}

beforeEach(installMemoryLocalStorage);

function renderCard() {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <SetupCard />
    </NextIntlClientProvider>,
  );
}

describe("SetupCard", () => {
  it("renders the setup CTA on a fresh session", async () => {
    renderCard();
    expect(
      await screen.findByRole("link", { name: "Start setup" }),
    ).toHaveAttribute("href", "/onboarding");
    expect(screen.getByText("Set up your workspace")).toBeInTheDocument();
  });

  it("stays hidden when onboarding is already done", () => {
    localStorage.setItem("faheem_onboarding_done", "1");
    const { container } = renderCard();
    expect(container).toBeEmptyDOMElement();
  });

  it("stays hidden when the user previously dismissed it", () => {
    localStorage.setItem("faheem_setup_dismissed", "1");
    const { container } = renderCard();
    expect(container).toBeEmptyDOMElement();
  });

  it("dismiss sets the flag and hides the card", async () => {
    const user = userEvent.setup();
    renderCard();

    const dismiss = await screen.findByRole("button", {
      name: "Dismiss setup",
    });
    await user.click(dismiss);

    expect(localStorage.getItem("faheem_setup_dismissed")).toBe("1");
    expect(screen.queryByText("Set up your workspace")).not.toBeInTheDocument();
  });
});
