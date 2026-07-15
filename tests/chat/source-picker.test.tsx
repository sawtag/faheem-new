import * as React from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import { SourcePicker } from "@/components/chat/source-picker";
import { sourcesInGroup } from "@/lib/sources";

function renderPicker() {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <SourcePicker />
    </NextIntlClientProvider>,
  );
}

async function openExternalSubmenu(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Data sources" }));
  // the group row and its chevron share the accessible name; either opens it
  await user.click(
    screen.getAllByRole("button", { name: "External Sources" })[0]!,
  );
}

describe("SourcePicker visit-site links", () => {
  it("renders a new-tab visit anchor on every url-bearing row, none elsewhere", async () => {
    const user = userEvent.setup();
    renderPicker();
    await openExternalSubmenu(user);

    // SAHMK carries a url: its row exposes a safe external anchor.
    const sahmk = await screen.findByRole("link", {
      name: "Visit site: SAHMK",
    });
    expect(sahmk).toHaveAttribute("target", "_blank");
    expect(sahmk.getAttribute("rel")).toContain("noopener");
    expect(sahmk).toHaveAttribute(
      "href",
      sourcesInGroup("external").find((s) => s.id === "sahmk")!.url,
    );

    // Web is a generic capability with no url: no anchor on its row.
    expect(
      screen.queryByRole("link", { name: "Visit site: Web" }),
    ).not.toBeInTheDocument();

    // the anchor count matches the url-bearing entries of the open group
    const withUrl = sourcesInGroup("external").filter((s) => s.url).length;
    expect(screen.getAllByRole("link", { name: /^Visit site:/ })).toHaveLength(
      withUrl,
    );
  });

  it("keeps the toggle usable next to the anchor (row semantics intact)", async () => {
    const user = userEvent.setup();
    renderPicker();
    await openExternalSubmenu(user);

    const toggle = screen.getByRole("switch", { name: "SAHMK" });
    expect(toggle).toHaveAttribute("aria-checked", "true");
    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-checked", "false");
    // trigger label reflects the deselection ("{n} sources")
    expect(
      screen.getByRole("button", { name: "Data sources" }).textContent,
    ).toMatch(/sources/);
  });
});
