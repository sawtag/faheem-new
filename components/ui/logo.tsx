"use client";

import * as React from "react";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

/**
 * The Faheem brand mark. The glyph is TRACED from the source bitmap
 * (context/branding/logo-src/icon-raw1.jpeg) with potrace, colour-separated into
 * the three navy columns + the emerald swoosh so the columns can rise
 * independently. Fills resolve to theme tokens (`brand`) or to `currentColor`
 * (`mono`, e.g. the login watermark), the source colours ARE the brand tokens,
 * so no hex is ever baked in.
 *
 * `animated` staggers the three columns then sweeps the swoosh in (≤400ms,
 * reduced-motion safe), used on login and as the chat "thinking" affordance.
 *
 * The wordmark ("Faheem" / فهيم) is set in the brand UI fonts, NOT traced: the
 * source wordmark bitmaps are AI-generated with irregular kerning/letterforms,
 * so tracing them would ship those artifacts. See the task summary.
 */

const VB_W = 603;
const VB_H = 596;
const BARS: readonly string[] = [
  "M 150 206.8 C 142.6 210.6, 61.8 268.2, 59.1 271.6 C 54.9 276.9, 54.9 277.4, 55.2 391.5 C 55.5 494.9, 55.6 501.5, 57.2 501.8 C 58.2 502, 63.2 498.8, 69 494.2 C 96.3 472.7, 124.7 461, 160.8 456.5 C 169.8 455.3, 169 467.6, 169 334.7 C 169 200.6, 169.5 210, 161.1 206.7 C 155.9 204.6, 154.2 204.6, 150 206.8",
  "M 301 110.3 C 299.1 111, 281.5 122.8, 262 136.5 C 242.5 150.2, 222.7 164, 218 167.3 C 206.8 175.1, 206 175.8, 203.9 180.5 C 201.2 186.2, 200.9 451.8, 203.6 454.4 C 205.8 456.6, 250.9 456.7, 265.2 454.5 C 285.8 451.4, 310 439.6, 316 429.7 C 318.9 425.1, 319.2 122.2, 316.3 116.3 C 313.7 110.6, 307.2 108.1, 301 110.3",
  "M 456.1 9.5 C 454.2 10.3, 448.4 14.1, 443.1 17.8 C 437.8 21.6, 416.7 36.5, 396.2 50.9 C 374.6 66.2, 357.8 78.7, 356.2 80.8 L 353.5 84.3 353.5 246.3 C 353.5 396.1, 353.6 408.4, 355.2 409.3 C 356.8 410.3, 366.9 403, 415 366.2 C 419.1 363.1, 431.1 353.9, 441.5 346 C 471.2 323.2, 472.7 322, 473.8 319.6 C 475.8 315.1, 475.7 17.7, 473.7 14.6 C 470 8.9, 462.3 6.7, 456.1 9.5",
];
const ARROW =
  "M 575.5 280.6 C 568.9 283.1, 558.8 286.8, 553 288.9 C 507.7 305.4, 507.4 305.6, 520.1 312.1 C 524.8 314.5, 527 316.7, 527 319 C 527 321.4, 499 346.8, 466.4 374.1 C 444.9 392, 405.5 422.6, 384.2 438 C 338.3 471, 308.6 485.7, 275 492.1 C 264.4 494.1, 259.1 494.4, 208 495.1 C 150.8 495.8, 145.9 496.2, 130.5 500.5 C 88.7 512.2, 59.7 530.9, 25.2 568.3 C 12.2 582.4, 11.4 583.5, 13 585.5 C 14.2 586.9, 30.3 587, 161.4 586.7 L 308.5 586.4 319.5 583.8 C 380 569.6, 395.3 554.2, 525.9 375 C 528.9 370.9, 533.8 364.1, 536.9 359.9 C 540 355.7, 544 350.2, 545.8 347.6 C 551.3 339.6, 553.1 340, 560 351.1 C 567.5 362.9, 568.2 362.5, 574.7 341 C 577.6 331.4, 583 314.2, 586.6 302.8 C 595.9 273.5, 595.7 273, 575.5 280.6";

const EASE = [0.4, 0, 0.2, 1] as const; // mirrors --ease

function Glyph({
  height,
  mono,
  play,
  decorative,
  title,
}: {
  height: number;
  mono: boolean;
  play: boolean;
  decorative: boolean;
  title: string;
}) {
  const navy = mono ? "currentColor" : "var(--color-navy)";
  const accent = mono ? "currentColor" : "var(--color-accent)";
  const Path = (play ? motion.path : "path") as React.ElementType;

  const rise = (i: number) =>
    play
      ? {
          initial: { opacity: 0, y: 24 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.24, ease: EASE, delay: 0.05 * i },
        }
      : {};
  const sweep = play
    ? {
        initial: { opacity: 0, y: 18 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.16, ease: EASE, delay: 0.22 },
      }
    : {};

  return (
    <svg
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      height={height}
      width={(height * VB_W) / VB_H}
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : title}
      aria-hidden={decorative || undefined}
    >
      {BARS.map((d, i) => (
        <Path key={i} d={d} fill={navy} {...rise(i)} />
      ))}
      <Path d={ARROW} fill={accent} {...sweep} />
    </svg>
  );
}

export type LogoVariant =
  "icon" | "horizontal" | "horizontal-bilingual" | "vertical";
export type LogoTone = "brand" | "mono";

export function Logo({
  variant = "horizontal",
  tone = "brand",
  animated = false,
  size,
  decorative = false,
  title = "Faheem",
  className,
}: {
  variant?: LogoVariant;
  tone?: LogoTone;
  animated?: boolean;
  /** icon height in px; the wordmark scales from it. */
  size?: number;
  decorative?: boolean;
  title?: string;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const play = animated && !reduce;
  const mono = tone === "mono";
  const iconHeight =
    size ?? (variant === "icon" || variant === "vertical" ? 40 : 30);

  const glyph = (
    <Glyph
      height={iconHeight}
      mono={mono}
      play={play}
      decorative={decorative || variant !== "icon"}
      title={title}
    />
  );

  if (variant === "icon") {
    return <span className={cn("inline-flex", className)}>{glyph}</span>;
  }

  const enWord = (
    <span
      className={cn(
        "font-sans leading-none font-extrabold tracking-[-0.03em]",
        mono ? "text-current" : "text-navy",
      )}
      style={{ fontSize: iconHeight * 0.86 }}
    >
      Faheem
    </span>
  );

  const ruleColor = mono ? "bg-current" : "bg-accent";
  const arLockup = (
    <span className="mt-1 flex items-center gap-1.5" aria-hidden="true">
      <span className={cn("h-px w-3", ruleColor)} />
      <span
        className={cn(
          "leading-none font-medium",
          mono ? "text-current" : "text-accent",
        )}
        style={{
          fontSize: iconHeight * 0.42,
          fontFamily: "var(--font-plex-arabic)",
        }}
      >
        فهيم
      </span>
      <span className={cn("h-px w-3", ruleColor)} />
    </span>
  );

  if (variant === "vertical") {
    return (
      <span
        className={cn("inline-flex flex-col items-center gap-2", className)}
      >
        {glyph}
        <span className="inline-flex flex-col items-center">
          {enWord}
          {arLockup}
        </span>
      </span>
    );
  }

  // horizontal / horizontal-bilingual
  return (
    <span
      className={cn("inline-flex items-center", className)}
      style={{ gap: iconHeight * 0.34 }}
    >
      {glyph}
      {variant === "horizontal-bilingual" ? (
        <span className="inline-flex flex-col items-start">
          {enWord}
          {arLockup}
        </span>
      ) : (
        enWord
      )}
    </span>
  );
}
