import { describe, expect, it } from "vitest";
import {
  DARB_MEMO_PAGES,
  DECK_SLIDES,
  MEMO_PAGES,
  MODEL_SHEETS,
  PREVIEW_BASE,
  previewSpec,
} from "@/components/generate/preview";

const jahez = (kind: "xlsx" | "docx" | "pptx") =>
  ({ id: `jahez-${kind}`, kind }) as const;

describe("previewSpec (artifact → pre-rendered image list)", () => {
  it("pptx → all 8 deck slides in order, 16:9, slides layout", () => {
    const spec = previewSpec(jahez("pptx"));
    expect(spec.layout).toBe("slides");
    expect(spec.images).toHaveLength(DECK_SLIDES);
    expect(spec.images[0]).toBe(`${PREVIEW_BASE}/deck-01.png`);
    expect(spec.images[7]).toBe(`${PREVIEW_BASE}/deck-08.png`);
    expect(spec.width / spec.height).toBeCloseTo(16 / 9, 5);
    expect(spec.sheetKeys).toBeUndefined();
  });

  it("jahez docx → first 3 memo pages, pages layout", () => {
    const spec = previewSpec(jahez("docx"));
    expect(spec.layout).toBe("pages");
    expect(spec.images).toEqual([
      `${PREVIEW_BASE}/memo-01.png`,
      `${PREVIEW_BASE}/memo-02.png`,
      `${PREVIEW_BASE}/memo-03.png`,
    ]);
    expect(spec.images).toHaveLength(MEMO_PAGES);
  });

  it("xlsx → named workbook sheets in a rail: Cover, DCF, Scenarios & Risk, Sensitivity", () => {
    const spec = previewSpec(jahez("xlsx"));
    expect(spec.layout).toBe("slides");
    expect(spec.sheetKeys).toEqual(MODEL_SHEETS);
    expect(spec.images).toEqual(
      MODEL_SHEETS.map((_, i) => `${PREVIEW_BASE}/model-0${i + 1}.png`),
    );
  });

  it("darb-docx → its own memo pages, never the Jahez memo's", () => {
    const spec = previewSpec({ id: "darb-docx", kind: "docx" });
    expect(spec.layout).toBe("pages");
    expect(spec.images).toHaveLength(DARB_MEMO_PAGES);
    expect(spec.images[0]).toBe(`${PREVIEW_BASE}/darb-memo-01.png`);
    for (const image of spec.images) {
      expect(image).not.toContain("/memo-");
    }
  });

  it("every resolved path points at a committed previews file (no dead links)", async () => {
    const { existsSync } = await import("node:fs");
    const { join } = await import("node:path");
    const artifacts = [
      jahez("pptx"),
      jahez("docx"),
      jahez("xlsx"),
      { id: "darb-docx", kind: "docx" } as const,
    ];
    for (const artifact of artifacts) {
      for (const image of previewSpec(artifact).images) {
        expect(existsSync(join(process.cwd(), "public", image)), image).toBe(
          true,
        );
      }
    }
  });
});
