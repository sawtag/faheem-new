import { describe, expect, it } from "vitest";
import {
  hurdleDelta,
  icColumns,
  riskBand,
  riskSegments,
} from "@/components/ic/metrics";
import type { Deal } from "@/lib/types";

describe("hurdleDelta — sign, colour tone, and bps", () => {
  it("clears the hurdle → above tone, positive bps", () => {
    // Thara Pay: 18.5% implied IRR vs the 15% mandate hurdle.
    expect(hurdleDelta(18.5, 15)).toEqual({ tone: "above", bps: 350 });
  });

  it("misses the hurdle → below tone, negative bps", () => {
    expect(hurdleDelta(13.4, 15)).toEqual({ tone: "below", bps: -160 });
  });

  it("sits on the hurdle → equal tone, zero bps", () => {
    expect(hurdleDelta(15, 15)).toEqual({ tone: "equal", bps: 0 });
  });
});

describe("riskBand — coarse tint band for the segmented bar", () => {
  it("bands low / moderate / high by score", () => {
    expect(riskBand(2)).toBe("low");
    expect(riskBand(5)).toBe("moderate");
    expect(riskBand(8)).toBe("high");
  });
});

describe("riskSegments — filled segments on the 10-segment bar", () => {
  it("rounds to the nearest whole and clamps to 0–10", () => {
    expect(riskSegments(5)).toBe(5);
    expect(riskSegments(5.5)).toBe(6);
    expect(riskSegments(-1)).toBe(0);
    expect(riskSegments(12)).toBe(10);
  });
});

describe("icColumns — committee sheet column selection", () => {
  const deal = (id: string, stage: Deal["stage"]): Deal => ({
    id,
    name: { en: id, ar: id },
    sector: { en: "s", ar: "s" },
    origin: "inbound",
    stage,
    statusLine: { en: "", ar: "" },
  });

  it("keeps only analysis + ic-review deals (drops screening + declined)", () => {
    const deals = [
      deal("darb", "screening"),
      deal("jahez", "analysis"),
      deal("thara-pay", "ic-review"),
      deal("aqar", "declined"),
    ];
    expect(icColumns(deals).map((d) => d.id)).toEqual(["jahez", "thara-pay"]);
  });
});
