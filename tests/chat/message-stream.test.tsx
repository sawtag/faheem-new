import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MessageStream } from "@/components/chat/message-stream";

describe("MessageStream citation markers", () => {
  it("swaps a [[n]] marker for a chip that opens the cited doc/page on click", async () => {
    const onOpenDoc = vi.fn();
    render(
      <MessageStream
        text="Group GMV grew [[2]] this year."
        citations={[
          { n: 2, docId: "fy25-er", page: 4, quote: "GMV 7,245.2 (+10.8%)" },
        ]}
        onOpenDoc={onOpenDoc}
      />,
    );

    const chip = screen.getByRole("button", { name: "Open source 2" });
    expect(chip).toHaveTextContent("2");

    await userEvent.click(chip);
    expect(onOpenDoc).toHaveBeenCalledWith("fy25-er", 4);
  });

  it("renders a plain (non-clickable) number until its citation arrives", () => {
    render(<MessageStream text="pending figure [[3]]" citations={[]} />);
    expect(
      screen.queryByRole("button", { name: /Open source/ }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("holds back a half-formed trailing marker while streaming", () => {
    const { container } = render(
      <MessageStream text="net income fell [[" citations={[]} streaming />,
    );
    expect(container.textContent).toContain("net income fell");
    expect(container.textContent).not.toContain("[[");
  });
});
