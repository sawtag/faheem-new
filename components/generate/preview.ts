/**
 * Preview path resolver, maps an artifact kind to its pre-rendered PNGs in
 * public/artifacts/previews/ (produced by scripts/render-artifact-previews.ts
 * from the real lib/generate builders; see that script's header for the
 * static-fallback honesty contract). Pure and React-free, unit-tested in
 * tests/generate/preview-resolver.test.ts.
 */
import type { ArtifactKind } from "@/components/generate/protocol";

export const PREVIEW_BASE = "/artifacts/previews";
export const DECK_SLIDES = 8;
export const MEMO_PAGES = 3;

export interface PreviewSpec {
  /** slides = thumbnail rail + canvas · pages = stacked pages · cover = single sheet + CTA */
  layout: "slides" | "pages" | "cover";
  /** intrinsic PNG size (px), the renderer rasterizes at 1280px wide */
  width: number;
  height: number;
  images: string[];
}

const pad = (n: number): string => String(n).padStart(2, "0");

const series = (stem: string, count: number): string[] =>
  Array.from(
    { length: count },
    (_, i) => `${PREVIEW_BASE}/${stem}-${pad(i + 1)}.png`,
  );

export function previewSpec(kind: ArtifactKind): PreviewSpec {
  switch (kind) {
    case "pptx": // 16:9 board deck
      return {
        layout: "slides",
        width: 1280,
        height: 720,
        images: series("deck", DECK_SLIDES),
      };
    case "docx": // A4 memo pages
      return {
        layout: "pages",
        width: 1280,
        height: 1811,
        images: series("memo", MEMO_PAGES),
      };
    case "xlsx": // workbook Cover sheet
      return {
        layout: "cover",
        width: 1280,
        height: 1657,
        images: [`${PREVIEW_BASE}/model-cover.png`],
      };
  }
}
