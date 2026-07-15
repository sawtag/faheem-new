import { siGmail, siGooglecalendar, siGoogledrive } from "simple-icons";
import type { BrandSlug } from "@/lib/sources";

/**
 * Renders a `simple-icons` brand glyph as a monochrome inline SVG (fill inherits
 * the tile's `currentColor`, so it tints via theme tokens — never a brand hex,
 * per AGENTS.md rule 4). Only the three slugs present in the installed
 * simple-icons (16.26.0) are wired; Slack / Salesforce / Microsoft brands have
 * no glyph in this version and fall back to monogram tiles in lib/sources.ts.
 */
const GLYPHS: Record<BrandSlug, { path: string; title: string }> = {
  gmail: siGmail,
  "google-calendar": siGooglecalendar,
  "google-drive": siGoogledrive,
};

export function BrandGlyph({
  brand,
  className,
}: {
  brand: BrandSlug;
  className?: string;
}) {
  const glyph = GLYPHS[brand];
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
      role="img"
      aria-hidden="true"
    >
      <path d={glyph.path} />
    </svg>
  );
}
