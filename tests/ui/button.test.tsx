import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "@/components/ui/button";

// The scaffold's tests/setup.ts registers jest-dom only, and vitest runs
// without `globals: true`, so RTL's auto-cleanup afterEach never registers.
// Unmount between the two rendering tests below (see result summary: fable
// should add a global `afterEach(cleanup)` to tests/setup.ts for all component tests).
afterEach(cleanup);

describe("Button", () => {
  it("disabled blocks the click handler", async () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Continue
      </Button>,
    );
    await userEvent.click(screen.getByRole("button"));
    expect(onClick).not.toHaveBeenCalled();
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("loading blocks the click, marks busy, and keeps the label mounted (width)", async () => {
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Sign in
      </Button>,
    );
    const btn = screen.getByRole("button");
    await userEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute("aria-busy", "true");
    // label stays in the DOM (only visually hidden) so the button keeps its width
    expect(btn).toHaveTextContent("Sign in");
  });
});
