import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  freshOverrides,
  useConnectorsState,
} from "@/components/connections/use-connector-state";
import { CONNECTORS, PROVISIONED_IDS } from "@/lib/connectors";

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
    // MCP is the default type; custom internal systems land in `internal`.
    expect(added.sourceType).toBe("mcp");
    expect(added.group).toBe("internal");
  });

  it("addCustom() carries the given source type; a custom feed is external", () => {
    const { result } = renderHook(() => useConnectorsState());

    act(() => {
      result.current.addCustom("Tadawul headlines", "feed");
    });
    const feed = result.current.connectors.at(-1)!;
    expect(feed.sourceType).toBe("feed");
    expect(feed.group).toBe("external");

    act(() => {
      result.current.addCustom("Q3 Deal Files", "files");
    });
    const files = result.current.connectors.at(-1)!;
    expect(files.sourceType).toBe("files");
    expect(files.group).toBe("internal");
  });

  describe("fresh mode", () => {
    it("freshOverrides() marks exactly the provisioned ids connected", () => {
      const overrides = freshOverrides();
      for (const c of CONNECTORS) {
        const expected = (PROVISIONED_IDS as readonly string[]).includes(c.id)
          ? "connected"
          : "available";
        expect(overrides[c.id], c.id).toBe(expected);
      }
    });

    it("useConnectorsState({ fresh: true }) starts every connector available except the provisioned ones", () => {
      const { result } = renderHook(() => useConnectorsState({ fresh: true }));

      for (const c of result.current.connectors) {
        const expected = (PROVISIONED_IDS as readonly string[]).includes(c.id)
          ? "connected"
          : "available";
        expect(c.status, c.id).toBe(expected);
      }
    });

    it("useConnectorsState() with no args keeps the Connections page's real-world defaults", () => {
      const { result } = renderHook(() => useConnectorsState());

      expect(
        result.current.connectors.find((c) => c.id === "argaam")?.status,
      ).toBe("connected");
      expect(
        result.current.connectors.find((c) => c.id === "snb-capital")?.status,
      ).toBe("available");
    });
  });
});
