import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Decorative brand atmosphere — the on-camera echo of the Figma splash cover
 * (giant faded glyph bars + a two-layer emerald swoosh sweeping the bottom edge)
 * brought onto the light app surfaces. Server-safe (no hooks, no "use client"):
 * pure SVG/CSS, so it drops straight into the agents server page as readily as
 * the client home/IC/workspace surfaces. Purely ornamental — `aria-hidden`,
 * `pointer-events-none`, layered under the real content, and `overflow-hidden` so
 * the oversized art can never widen the document (the RTL sweep asserts
 * scrollWidth ≤ clientWidth on every route). Static by design — stillness reads
 * expensive; nothing here animates.
 *
 * The glyph geometry is copied verbatim from `components/ui/logo.tsx` (the brand
 * mark's single source of truth). It is duplicated rather than imported because
 * the backdrop needs the navy bars and the emerald swoosh at INDEPENDENT
 * opacities / positions / blur — the Logo primitive fills them as one locked
 * unit — and `logo.tsx` is a shared primitive this task's lane may not edit to
 * export them. Colours resolve to the same brand tokens, so no hex is baked in.
 *
 * RTL: the COMPOSITION anchors mirror via logical positioning — the navy bars
 * ride the inline-end edge, so they swap sides with `dir`. The GLYPH ITSELF
 * never mirrors: the bars always ascend left→right and the swoosh's arrowhead
 * always exits toward the top-right, so the swoosh layer is pinned `dir="ltr"`
 * (its `end` resolves physical-right in both locales) and SVG paths are immune
 * to `direction` anyway.
 */

// ── traced glyph geometry (verbatim from logo.tsx; see note above) ──
const BARS: readonly string[] = [
  "M 150 206.8 C 142.6 210.6, 61.8 268.2, 59.1 271.6 C 54.9 276.9, 54.9 277.4, 55.2 391.5 C 55.5 494.9, 55.6 501.5, 57.2 501.8 C 58.2 502, 63.2 498.8, 69 494.2 C 96.3 472.7, 124.7 461, 160.8 456.5 C 169.8 455.3, 169 467.6, 169 334.7 C 169 200.6, 169.5 210, 161.1 206.7 C 155.9 204.6, 154.2 204.6, 150 206.8",
  "M 301 110.3 C 299.1 111, 281.5 122.8, 262 136.5 C 242.5 150.2, 222.7 164, 218 167.3 C 206.8 175.1, 206 175.8, 203.9 180.5 C 201.2 186.2, 200.9 451.8, 203.6 454.4 C 205.8 456.6, 250.9 456.7, 265.2 454.5 C 285.8 451.4, 310 439.6, 316 429.7 C 318.9 425.1, 319.2 122.2, 316.3 116.3 C 313.7 110.6, 307.2 108.1, 301 110.3",
  "M 456.1 9.5 C 454.2 10.3, 448.4 14.1, 443.1 17.8 C 437.8 21.6, 416.7 36.5, 396.2 50.9 C 374.6 66.2, 357.8 78.7, 356.2 80.8 L 353.5 84.3 353.5 246.3 C 353.5 396.1, 353.6 408.4, 355.2 409.3 C 356.8 410.3, 366.9 403, 415 366.2 C 419.1 363.1, 431.1 353.9, 441.5 346 C 471.2 323.2, 472.7 322, 473.8 319.6 C 475.8 315.1, 475.7 17.7, 473.7 14.6 C 470 8.9, 462.3 6.7, 456.1 9.5",
];
const ARROW =
  "M 575.5 280.6 C 568.9 283.1, 558.8 286.8, 553 288.9 C 507.7 305.4, 507.4 305.6, 520.1 312.1 C 524.8 314.5, 527 316.7, 527 319 C 527 321.4, 499 346.8, 466.4 374.1 C 444.9 392, 405.5 422.6, 384.2 438 C 338.3 471, 308.6 485.7, 275 492.1 C 264.4 494.1, 259.1 494.4, 208 495.1 C 150.8 495.8, 145.9 496.2, 130.5 500.5 C 88.7 512.2, 59.7 530.9, 25.2 568.3 C 12.2 582.4, 11.4 583.5, 13 585.5 C 14.2 586.9, 30.3 587, 161.4 586.7 L 308.5 586.4 319.5 583.8 C 380 569.6, 395.3 554.2, 525.9 375 C 528.9 370.9, 533.8 364.1, 536.9 359.9 C 540 355.7, 544 350.2, 545.8 347.6 C 551.3 339.6, 553.1 340, 560 351.1 C 567.5 362.9, 568.2 362.5, 574.7 341 C 577.6 331.4, 583 314.2, 586.6 302.8 C 595.9 273.5, 595.7 273, 575.5 280.6";

// tight bounding boxes so each element positions cleanly on its own
const BARS_VB = "48 0 432 508";
const SWOOSH_VB = "8 268 590 326";

function Bars({ opacity, className }: { opacity: number; className?: string }) {
  return (
    <svg
      viewBox={BARS_VB}
      preserveAspectRatio="xMidYMax meet"
      className={className}
      style={{ opacity }}
    >
      {BARS.map((d, i) => (
        <path key={i} d={d} fill="var(--color-navy)" />
      ))}
    </svg>
  );
}

function Swoosh({
  opacity,
  blur,
  className,
  preserve = "xMaxYMax meet",
}: {
  opacity: number;
  blur?: number;
  className?: string;
  preserve?: string;
}) {
  return (
    <svg
      viewBox={SWOOSH_VB}
      preserveAspectRatio={preserve}
      className={className}
      style={{ opacity, filter: blur ? `blur(${blur}px)` : undefined }}
    >
      <path d={ARROW} fill="var(--color-accent)" />
    </svg>
  );
}

export type GlyphBackdropVariant = "hero" | "panel";

export function GlyphBackdrop({
  variant = "hero",
  className,
}: {
  variant?: GlyphBackdropVariant;
  className?: string;
}) {
  if (variant === "panel") {
    // Page-header watermark: one faded corner glyph on the inline-end edge with
    // a whisper of emerald glow beneath it — the hero composition distilled to a
    // corner so the data surfaces below stay clean. Clipped to the header block.
    return (
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-0 -z-10 overflow-hidden",
          className,
        )}
      >
        <Bars
          opacity={0.05}
          className="absolute end-[3%] -bottom-[38%] h-[200%] w-auto"
        />
        <div dir="ltr" className="absolute inset-0">
          <Swoosh
            opacity={0.07}
            blur={26}
            preserve="xMaxYMax slice"
            className="absolute end-0 -bottom-[30%] h-[150%] w-[42%]"
          />
        </div>
      </div>
    );
  }

  // hero — the full splash-cover composition on the money surface, rendered from
  // the design team's finished raster (public/backgrounds/growth-light.png): the
  // same navy-bars + emerald-swoosh brand artwork the SVG panel variant traces,
  // but in the designers' polished, gradient-rich form. Root sits at z-0 (not
  // -z-10 like the panel): the hero's mounting wrapper is an `isolate` flex
  // context whose sibling content carries an explicit `z-10`, so z-0 keeps the
  // art painting above the wrapper's own (transparent) base and below that
  // content.
  //
  // The composition is authored LTR (bars + arrowhead climb toward the physical
  // top-right); the whole layer is pinned `dir="ltr"` so it never mirrors, and
  // `object-bottom` anchors the artwork to the bottom edge under the centred
  // hero content, whose surrounding whitespace is the image's own pale field.
  return (
    <div
      aria-hidden="true"
      dir="ltr"
      className={cn(
        "pointer-events-none absolute inset-0 z-0 overflow-hidden",
        className,
      )}
    >
      <Image
        src="/backgrounds/growth-light.png"
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover object-bottom"
      />
      {/* soft top fade so the serif greeting stays crisp over the palest band */}
      <div className="from-bg absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b to-transparent" />
    </div>
  );
}
