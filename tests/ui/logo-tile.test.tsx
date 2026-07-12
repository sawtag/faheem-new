import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { LogoTile, pickTileTint } from "@/components/ui/logo-tile";

describe("LogoTile", () => {
  it("derives an uppercased initial from the label", () => {
    const { getByText } = render(<LogoTile label="argaam" />);
    expect(getByText("A")).toBeInTheDocument();
  });

  it("passes an explicit (Arabic) initial through unchanged", () => {
    const { getByText } = render(<LogoTile label="Tadawul" initial="ت" />);
    expect(getByText("ت")).toBeInTheDocument();
  });

  it("is deterministic: the same label always maps to the same tint", () => {
    expect(pickTileTint("Argaam")).toEqual(pickTileTint("Argaam"));
    expect(pickTileTint("Argaam")).not.toBe(undefined);
  });

  it("an explicit tint overrides the hashed one", () => {
    const { getByText } = render(
      <LogoTile label="Portfolio" initial="P" tint="navy" />,
    );
    expect(getByText("P").className).toContain("bg-navy-100");
  });
});
