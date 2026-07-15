/**
 * useLiveModel — client edits pass through the SAME validateEdit gate as
 * /api/model-edit (G7 review finding): whitelist + sane-bounds clamp, so the
 * grid stepper can't drive terminal growth past WACC or write illegal keys.
 */
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useLiveModel } from "@/components/model/use-live-model";
import { BASE_ASSUMPTIONS } from "@/lib/model/compute";

describe("useLiveModel edit gate", () => {
  it("applies a legal in-bounds edit", () => {
    const { result } = renderHook(() => useLiveModel());
    act(() => result.current.setAssumption("ordersGrowth.0", 0.2));
    expect(result.current.assumptions.ordersGrowth[0]).toBe(0.2);
  });

  it("clamps terminal growth to the sane bound (never reaches WACC)", () => {
    const { result } = renderHook(() => useLiveModel());
    act(() => result.current.setAssumption("g", 0.5)); // 50% — absurd
    expect(result.current.assumptions.g).toBe(0.08); // spec max
    // model stays finite: Gordon denominator (WACC − g) > 0
    expect(result.current.outputs.result.base.tv).toBeGreaterThan(0);
    expect(Number.isFinite(result.current.outputs.result.base.perShare)).toBe(
      true,
    );
  });

  it("rejects non-whitelisted keys outright", () => {
    const { result } = renderHook(() => useLiveModel());
    act(() => result.current.setAssumption("price", 99));
    act(() => result.current.setAssumption("fy25.gmv", 1));
    act(() => result.current.setAssumption("ordersGrowth.9", 0.1));
    expect(result.current.assumptions).toEqual(BASE_ASSUMPTIONS);
    expect(result.current.isBase).toBe(true);
  });
});
