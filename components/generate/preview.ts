/**
 * Preview path resolver, maps an artifact (id + kind) to its pre-rendered
 * PNGs in public/artifacts/previews/ (produced by
 * scripts/render-artifact-previews.ts from the real lib/generate builders;
 * see that script's header for the static-fallback honesty contract). Keyed
 * by artifact id first (the Darb memo and the Jahez memo are both docx but
 * show different pages), falling back to the kind's Jahez default. Pure and
 * React-free, unit-tested in tests/generate/preview-resolver.test.ts.
 */
import type { ArtifactKind } from "@/components/generate/protocol";

export const PREVIEW_BASE = "/artifacts/previews";
export const DECK_SLIDES = 10;
export const MEMO_PAGES = 3;
/** Rendered by scripts/render-artifact-previews.ts; keep in sync with its output. */
export const DARB_MEMO_PAGES = 5;
/** Workbook sheets shown in the rail, in order; keys resolve via generate.preview.sheets.* */
export const MODEL_SHEETS = ["cover", "dcf", "scenarios", "sensitivity"];

export interface PreviewSpec {
  /** slides = thumbnail rail + canvas · pages = stacked pages */
  layout: "slides" | "pages";
  /** intrinsic PNG size (px), the renderer rasterizes at 1280px wide */
  width: number;
  height: number;
  images: string[];
  /** i18n keys under generate.preview.sheets.*, rail/caption labels (workbook only) */
  sheetKeys?: string[];
}

const pad = (n: number): string => String(n).padStart(2, "0");

const series = (stem: string, count: number): string[] =>
  Array.from(
    { length: count },
    (_, i) => `${PREVIEW_BASE}/${stem}-${pad(i + 1)}.png`,
  );

export function previewSpec(artifact: {
  id: string;
  kind: ArtifactKind;
}): PreviewSpec {
  if (artifact.id === "darb-docx") {
    return {
      layout: "pages",
      width: 1280,
      height: 1811,
      images: series("darb-memo", DARB_MEMO_PAGES),
    };
  }
  switch (artifact.kind) {
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
    case "xlsx": // workbook sheets as a rail: Cover, DCF, Scenarios & Risk, Sensitivity
      return {
        layout: "slides",
        width: 1280,
        height: 1657,
        images: series("model", MODEL_SHEETS.length),
        sheetKeys: MODEL_SHEETS,
      };
  }
}
