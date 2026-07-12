import { describe, expect, it } from "vitest";
import {
  DECK_SLIDES,
  MEMO_PAGES,
  PREVIEW_BASE,
  previewSpec,
} from "@/components/generate/preview";

describe("previewSpec (kind → pre-rendered image list)", () => {
  it("pptx → all 8 deck slides in order, 16:9, slides layout", () => {
    const spec = previewSpec("pptx");
    expect(spec.layout).toBe("slides");
    expect(spec.images).toHaveLength(DECK_SLIDES);
    expect(spec.images[0]).toBe(`${PREVIEW_BASE}/deck-01.png`);
    expect(spec.images[7]).toBe(`${PREVIEW_BASE}/deck-08.png`);
    expect(spec.width / spec.height).toBeCloseTo(16 / 9, 5);
  });

  it("docx → first 3 memo pages, pages layout", () => {
    const spec = previewSpec("docx");
    expect(spec.layout).toBe("pages");
    expect(spec.images).toEqual([
      `${PREVIEW_BASE}/memo-01.png`,
      `${PREVIEW_BASE}/memo-02.png`,
      `${PREVIEW_BASE}/memo-03.png`,
    ]);
    expect(spec.images).toHaveLength(MEMO_PAGES);
  });

  it("xlsx → the single Cover sheet, cover layout", () => {
    const spec = previewSpec("xlsx");
    expect(spec.layout).toBe("cover");
    expect(spec.images).toEqual([`${PREVIEW_BASE}/model-cover.png`]);
  });

  it("every resolved path points at a committed previews file (no dead links)", async () => {
    const { existsSync } = await import("node:fs");
    const { join } = await import("node:path");
    for (const kind of ["pptx", "docx", "xlsx"] as const) {
      for (const image of previewSpec(kind).images) {
        expect(existsSync(join(process.cwd(), "public", image)), image).toBe(
          true,
        );
      }
    }
  });
});
