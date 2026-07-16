import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Decorative brand atmosphere, the on-camera echo of the brand splash cover
 * (giant faded glyph shapes + the emerald check sweeping the bottom edge)
 * brought onto the light app surfaces. Server-safe (no hooks, no "use client"):
 * pure SVG/CSS, so it drops straight into the agents server page as readily as
 * the client home/IC/workspace surfaces. Purely ornamental, `aria-hidden`,
 * `pointer-events-none`, layered under the real content, and `overflow-hidden` so
 * the oversized art can never widen the document (the RTL sweep asserts
 * scrollWidth ≤ clientWidth on every route). Static by design, stillness reads
 * expensive; nothing here animates.
 *
 * The glyph geometry is copied verbatim from `components/ui/logo.tsx` (the brand
 * mark's single source of truth). It is duplicated rather than imported because
 * the backdrop needs the navy shapes and the emerald check at INDEPENDENT
 * opacities / positions / blur, the Logo primitive fills them as one locked
 * unit, and `logo.tsx` is a shared primitive this task's lane may not edit to
 * export them. Colours resolve to the same brand tokens, so no hex is baked in.
 *
 * RTL: the COMPOSITION anchors mirror via logical positioning, the navy shapes
 * ride the inline-end edge, so they swap sides with `dir`. The GLYPH ITSELF
 * never mirrors: the bars always ascend left→right, the arrow points up, and
 * the check's long tail always exits toward the top-right, so the check layer
 * is pinned `dir="ltr"` (its `end` resolves physical-right in both locales)
 * and SVG paths are immune to `direction` anyway.
 */

// ── traced glyph geometry (verbatim from logo.tsx; see note above) ──
// Navy shapes: short bar, tall bar, up-arrow.
const BARS: readonly string[] = [
  "M 93.1 243.8 C 91.2 244.2, 88.7 245.8, 87.5 247.3 C 85.2 250.2, 85.3 246.4, 85.4 320.5 C 85.4 400.7, 84.6 391.3, 91.2 396.5 C 97.9 401.8, 104.2 406.7, 105.8 407.9 C 106.6 408.6, 107.8 409.5, 108.4 410 C 110.2 411.4, 115.2 415.2, 122 420.4 C 125.5 423, 130 426.4, 132.1 428 C 134.1 429.6, 135.9 431, 136.1 431.1 C 136.2 431.2, 138.7 433.1, 141.6 435.3 C 144.6 437.6, 149.1 441, 151.6 442.9 C 154.2 444.9, 158.5 448.1, 161.2 450.2 C 163.9 452.2, 166.6 454.3, 167.2 454.8 C 167.9 455.3, 169 456.2, 169.7 456.7 C 170.4 457.3, 171.9 458.4, 173 459.2 C 175.8 461.3, 177.7 462, 180.9 462 C 184 461.9, 186.2 460.6, 187.9 457.7 C 188.8 456.2, 188.8 455.4, 188.8 353.2 L 188.8 250.2, 187.5 248.1 C 186.7 246.8, 185.6 245.6, 184.2 244.8 L 182.1 243.6, 138.3 243.5 C 114.2 243.5, 93.8 243.6, 93.1 243.8",
  "M 231.6 157.7 C 229.1 158.6, 227.2 160.2, 226.3 162.1 C 225.5 163.9, 225.5 168.2, 225.5 298.2 C 225.5 388.9, 225.6 432.7, 225.9 433.3 C 227.3 435.9, 229.6 435.3, 233.9 431.3 C 238.6 427, 274.1 400.2, 310.2 373.7 C 311.4 372.8, 314.4 370.6, 316.9 368.8 C 319.4 366.9, 322.5 364.7, 323.9 363.7 C 325.2 362.7, 326.8 361.2, 327.4 360.4 L 328.4 358.9, 328.4 261 L 328.4 163.1, 327.2 161.2 C 326.5 160.2, 325.2 158.9, 324.3 158.3 L 322.7 157.3, 278 157.2 C 242.1 157.1, 232.9 157.2, 231.6 157.7",
  "M 415.6 1.1 C 414.8 1.6, 412.6 3.9, 410.7 6.3 C 408.8 8.6, 405.9 12.1, 404.3 14 C 402.7 16, 398.9 20.6, 395.8 24.3 C 390.5 30.8, 386.4 35.7, 381.8 41.2 C 380.6 42.7, 378.9 44.8, 378 45.9 C 377.2 47, 375 49.6, 373.3 51.7 C 371.5 53.9, 368.5 57.5, 366.6 59.8 C 364.8 62, 362.8 64.4, 362.3 65 C 361.8 65.6, 360.5 67.2, 359.4 68.5 C 358.3 69.9, 357.3 71.1, 357.1 71.2 C 357 71.3, 355.7 72.9, 354.2 74.8 C 352.6 76.6, 349.8 80, 347.9 82.4 C 345.9 84.8, 344.1 87.1, 343.8 87.6 C 343 89.1, 343.2 91.8, 344.3 93 C 346.2 95.1, 347.2 95.2, 358 95.2 L 368.3 95.2, 368.3 212.9 C 368.3 328.7, 368.3 330.5, 369.1 331 C 371.1 332, 372.2 331.5, 376 328 C 378 326.1, 380.7 323.6, 382 322.5 C 385.5 319.6, 397.4 310.6, 441.8 277.3 C 454.9 267.4, 465.9 258.9, 466.2 258.3 C 466.7 257.6, 466.8 240.5, 467 176.4 L 467.2 95.5, 478.8 95.2 C 490.6 95, 491.4 94.9, 492.9 93.2 C 494.4 91.4, 494.4 87.7, 492.9 86 C 492.5 85.6, 490.5 83.2, 488.5 80.8 C 486.5 78.3, 482.7 73.6, 479.9 70.3 C 473.9 63, 467.3 55, 461.5 47.9 C 456.5 41.6, 456.1 41.2, 448.5 32 C 445.3 28.2, 441.1 23, 439 20.5 C 431.9 11.9, 428.2 7.4, 427.3 6.3 C 426.7 5.6, 425.7 4.4, 425 3.4 C 422.5 0, 418.5 -1, 415.6 1.1",
];
// Emerald check (the sweep layer below).
const ARROW =
  "M 541.5 221.7 C 540.3 222.3, 536.4 225, 532.8 227.7 C 529.3 230.5, 525 233.7, 523.3 235 C 521.7 236.3, 519.1 238.3, 517.7 239.4 C 516.3 240.5, 512.9 243.1, 510.2 245.1 C 507.4 247.2, 502.7 250.8, 499.7 253.1 C 496.7 255.5, 491.8 259.3, 488.8 261.6 C 480.1 268.3, 477.9 270, 470.8 275.4 C 467.1 278.1, 463.1 281.2, 461.9 282.2 C 460.6 283.2, 458.9 284.6, 458.1 285.2 C 457.3 285.8, 455.6 287.1, 454.4 288.1 C 453.1 289.1, 450.1 291.4, 447.7 293.2 C 441 298.3, 435.8 302.3, 429.2 307.4 C 425.9 310, 421.7 313.2, 419.9 314.6 C 418 316, 414.9 318.3, 413 319.9 C 411 321.4, 407.2 324.3, 404.5 326.3 C 401.8 328.4, 397.2 331.9, 394.3 334.2 C 391.3 336.4, 386.8 339.9, 384.3 341.8 C 381.7 343.8, 378 346.6, 376 348.1 C 371 352, 357.9 361.9, 340.9 374.8 C 338.9 376.3, 337.2 377.6, 337.1 377.7 C 336.9 377.9, 333.1 380.8, 318.7 391.7 C 314.7 394.6, 311.3 397.2, 311 397.5 C 310.8 397.7, 309.2 399, 307.5 400.3 C 305.8 401.6, 302.4 404.2, 299.9 406 C 297.5 407.9, 293.2 411.2, 290.4 413.3 C 287.7 415.4, 285.2 417.3, 284.9 417.5 C 284.4 418, 282.8 419.2, 263.5 433.7 C 258.1 437.8, 251.5 442.8, 248.8 444.9 C 244.4 448.2, 218.4 467.7, 197.3 483.5 C 193 486.7, 188.4 489.9, 187 490.5 C 180.2 493.6, 170.5 493, 164.6 489.1 C 162.6 487.8, 157 482.4, 132.9 458.9 C 126.9 453, 119.1 445.4, 115.6 442 C 112 438.5, 101.6 428.4, 92.5 419.5 C 61.3 389.2, 63.8 391.5, 59.5 389.2 C 55.5 387, 52.7 386.4, 46.2 386.4 C 38.7 386.4, 34.8 387.5, 29.7 391.1 C 27.1 393, 6.7 414, 4.8 416.7 C 2.7 419.8, 1.3 423.7, 0.3 429 C -0.2 431.7, -0.1 432.5, 0.7 436.6 C 2.6 445.8, 0.1 442.9, 38.8 481.6 C 57.7 500.4, 78.1 520.7, 84.2 526.7 C 90.4 532.7, 107.4 549.5, 122 563.9 C 150.4 591.9, 150 591.5, 154.1 594.2 C 157.4 596.4, 159.1 597.2, 163.8 598.7 C 168.9 600.4, 180.2 600.5, 185.4 598.8 C 194.9 595.9, 193.7 596.8, 226.1 565.2 C 235.1 556.4, 242.6 549.1, 242.8 549 C 243 548.8, 249.8 542.2, 257.9 534.3 C 266.1 526.3, 272.9 519.7, 273.1 519.6 C 273.4 519.4, 278.4 514.5, 284.3 508.7 C 290.2 502.8, 298.8 494.4, 303.3 490 C 328 465.9, 369.5 425.3, 385.7 409.3 C 391.8 403.3, 396.9 398.3, 397.1 398.2 C 397.3 398, 412.1 383.5, 429.9 365.9 C 447.7 348.3, 462.4 333.8, 462.6 333.7 C 462.8 333.5, 476.4 320.1, 492.9 303.9 C 543.3 254.1, 547.1 250.4, 554.5 243.7 C 560.3 238.3, 561.1 230.3, 556.4 224.6 C 553.3 220.8, 546.4 219.5, 541.5 221.7";

// tight ink bounding boxes so each element positions cleanly on its own
const BARS_VB = "85.4 0 408.7 462";
const SWOOSH_VB = "0 220.6 559.5 379.4";

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
    // a whisper of emerald glow beneath it, the hero composition distilled to a
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

  // hero, the full splash-cover composition on the money surface, rendered from
  // the design team's finished raster (public/backgrounds/growth-light.png): the
  // same navy-bars + emerald-swoosh brand artwork the SVG panel variant traces,
  // but in the designers' polished, gradient-rich form. Root sits at z-0 (not
  // -z-10 like the panel): the hero's mounting wrapper is an `isolate` flex
  // context whose sibling content carries an explicit `z-10`, so z-0 keeps the
  // art painting above the wrapper's own (transparent) base and below that
  // content.
  //
  // The composition is authored LTR (bars + arrowhead climb toward the physical
  // top-right). Unlike the small logo mark, a fixed brand asset that never
  // mirrors, this full-bleed environmental art DOES mirror under RTL via
  // `rtl:-scale-x-100`: the growth arrow then climbs up-and-LEFT, i.e. "forward"
  // along the Arabic reading flow, and settles into the bottom-left open corner
  // opposite the flipped sidebar. `object-bottom` anchors it to the bottom edge
  // under the centred hero content, whose surrounding whitespace is the image's
  // own pale field.
  return (
    <div
      aria-hidden="true"
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
        className="object-cover object-bottom rtl:-scale-x-100"
      />
      {/* soft top fade so the serif greeting stays crisp over the palest band */}
      <div className="from-bg absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b to-transparent" />
    </div>
  );
}
