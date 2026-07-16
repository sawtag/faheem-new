import * as React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import { ModeSection } from "@/components/settings/mode-section";
import { subscribeMode } from "@/lib/demo/mode-bus";
import type { FaheemMode } from "@/lib/types";

/**
 * Settings spec (2026-07-16) acceptance: the mode section renders the
 * server-resolved effective mode, a card click writes the `faheem_mode`
 * cookie and publishes on the mode bus, reset clears the override, and a
 * keyless render hints on the auto/live cards.
 */
function renderSection(
  props: Partial<React.ComponentProps<typeof ModeSection>> = {},
) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <ModeSection
        initialMode={"auto" as FaheemMode}
        envDefault={"auto" as FaheemMode}
        initiallyOverridden={false}
        keyConfigured
        {...props}
      />
    </NextIntlClientProvider>,
  );
}

afterEach(() => {
  document.cookie = "faheem_mode=; path=/; max-age=0";
});

describe("ModeSection", () => {
  it("renders the effective mode and its environment-default source", () => {
    renderSection();
    expect(screen.getByText("Effective mode: Auto")).toBeInTheDocument();
    expect(screen.getByText("environment default")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /^Auto/ })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  it("card click writes the cookie, publishes on the bus, and flips to override", async () => {
    const user = userEvent.setup();
    const seen: FaheemMode[] = [];
    const unsubscribe = subscribeMode((m) => seen.push(m));
    try {
      renderSection();
      await user.click(screen.getByRole("radio", { name: /^Cached/ }));

      expect(document.cookie).toContain("faheem_mode=cached");
      expect(seen).toEqual(["cached"]);
      expect(screen.getByText("Effective mode: Cached")).toBeInTheDocument();
      expect(screen.getByText("your override")).toBeInTheDocument();
    } finally {
      unsubscribe();
    }
  });

  it("reset clears the override back to the environment default", async () => {
    const user = userEvent.setup();
    renderSection({
      initialMode: "cached",
      initiallyOverridden: true,
      envDefault: "auto",
    });

    await user.click(
      screen.getByRole("button", { name: "Reset to environment default" }),
    );

    expect(document.cookie).not.toContain("faheem_mode=cached");
    expect(screen.getByText("Effective mode: Auto")).toBeInTheDocument();
    expect(screen.getByText("environment default")).toBeInTheDocument();
  });

  it("keyless render hints on the auto and live cards only", () => {
    renderSection({ keyConfigured: false });
    expect(
      screen.getAllByText("Live analysis requires an API key"),
    ).toHaveLength(2);
  });
});
