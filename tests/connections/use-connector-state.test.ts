import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useConnectorsState } from "@/components/connections/use-connector-state";

describe("useConnectorsState", () => {
  it("connect() moves a connector to 'connected' and flashes it", () => {
    const { result } = renderHook(() => useConnectorsState());

    expect(
      result.current.connectors.find((c) => c.id === "bloomberg")?.status,
    ).toBe("available");

    act(() => result.current.connect("bloomberg"));

    expect(
      result.current.connectors.find((c) => c.id === "bloomberg")?.status,
    ).toBe("connected");
    expect(result.current.justConnectedId).toBe("bloomberg");
  });

  it("disconnect() moves a default-connected connector back to 'available'", () => {
    const { result } = renderHook(() => useConnectorsState());

    expect(
      result.current.connectors.find((c) => c.id === "argaam")?.status,
    ).toBe("connected");

    act(() => result.current.disconnect("argaam"));

    expect(
      result.current.connectors.find((c) => c.id === "argaam")?.status,
    ).toBe("available");
  });

  it("addCustom() appends a new connected connector using the given name in both locales", () => {
    const { result } = renderHook(() => useConnectorsState());
    const before = result.current.connectors.length;

    act(() => {
      result.current.addCustom("Lunar Portfolio DB");
    });

    expect(result.current.connectors).toHaveLength(before + 1);
    const added = result.current.connectors.at(-1)!;
    expect(added.status).toBe("connected");
    expect(added.name.en).toBe("Lunar Portfolio DB");
    expect(added.name.ar).toBe("Lunar Portfolio DB");
  });
});
