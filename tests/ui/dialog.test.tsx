import { describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

function Fixture() {
  return (
    <Dialog>
      <DialogTrigger>Open</DialogTrigger>
      <DialogContent>
        <DialogTitle>Connect</DialogTitle>
        <button>Authorize</button>
      </DialogContent>
    </Dialog>
  );
}

describe("Dialog", () => {
  it("opens on trigger, traps focus inside, and closes on Escape", async () => {
    render(<Fixture />);
    expect(screen.queryByRole("dialog")).toBeNull();

    await userEvent.click(screen.getByText("Open"));
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toBeInTheDocument();
    // focus was moved into the dialog (focus trap)
    expect(dialog.contains(document.activeElement)).toBe(true);

    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });
});
