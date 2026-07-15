import * as React from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Toggle } from "@/components/ui/toggle";

function Controlled() {
  const [on, setOn] = React.useState(false);
  return (
    <Toggle
      checked={on}
      onCheckedChange={setOn}
      aria-label="Compliance screen"
    />
  );
}

describe("Toggle", () => {
  it("reflects checked state and flips on click", async () => {
    render(<Controlled />);
    const sw = screen.getByRole("switch");
    expect(sw).toHaveAttribute("aria-checked", "false");

    await userEvent.click(sw);
    expect(sw).toHaveAttribute("aria-checked", "true");

    await userEvent.click(sw);
    expect(sw).toHaveAttribute("aria-checked", "false");
  });
});
