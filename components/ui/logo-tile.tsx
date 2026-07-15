import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Monogram tile for fictional companies & Saudi connectors that have no clean
 * SVG (AGENTS.md assets policy). An initial (EN or AR) on a deterministic tint
 * derived from the name, so the same entity always gets the same swatch.
 */

const TINTS = [
  { bg: "bg-navy-100", fg: "text-navy-700" },
  { bg: "bg-accent-50", fg: "text-accent-700" },
  { bg: "bg-navy-50", fg: "text-navy-600" },
  { bg: "bg-accent-100", fg: "text-accent-800" },
] as const;

/** Deterministic tint pair for a name (djb2-ish hash → palette index). */
export function pickTileTint(label: string): (typeof TINTS)[number] {
  let h = 0;
  for (let i = 0; i < label.length; i++) h = (h * 31 + label.charCodeAt(i)) | 0;
  return TINTS[Math.abs(h) % TINTS.length]!;
}

const SIZES = {
  16: "size-4 text-[0.625rem]",
  24: "size-6 text-[0.8125rem]",
  40: "size-10 text-lg",
} as const;

export type LogoTileSize = keyof typeof SIZES;
export type LogoTileTint = "auto" | "navy" | "accent";

export function LogoTile({
  label,
  initial,
  tint = "auto",
  size = 40,
  className,
}: {
  /** full entity name, hashed for the auto tint, and the fallback initial source. */
  label: string;
  /** explicit glyph (e.g. an Arabic letter "ت"); defaults to the first letter of `label`. */
  initial?: string;
  tint?: LogoTileTint;
  size?: LogoTileSize;
  className?: string;
}) {
  const pair =
    tint === "auto"
      ? pickTileTint(label)
      : tint === "navy"
        ? { bg: "bg-navy-100", fg: "text-navy-700" }
        : { bg: "bg-accent-50", fg: "text-accent-700" };
  const glyph = (initial ?? label.trim().charAt(0)).toUpperCase();

  return (
    <span
      aria-hidden="true"
      className={cn(
        "rounded-btn inline-grid shrink-0 place-items-center leading-none font-bold",
        pair.bg,
        pair.fg,
        SIZES[size],
        className,
      )}
    >
      {glyph}
    </span>
  );
}
