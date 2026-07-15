import Image from "next/image";
import { LayoutTemplate } from "lucide-react";
import { LogoTile, type LogoTileSize } from "@/components/ui/logo-tile";
import { cn } from "@/lib/utils";
import type { ConnectorTile } from "@/lib/connectors";

const ICON_TILES = { "layout-template": LayoutTemplate } as const;

const ICON_BOX: Record<LogoTileSize, string> = {
  16: "size-4",
  24: "size-6",
  40: "size-10",
};
const ICON_GLYPH: Record<LogoTileSize, string> = {
  16: "size-3",
  24: "size-3.5",
  40: "size-5",
};
/** Image-tile inset (px) — the brand glyph floats inside a neutral card tile. */
const IMAGE_INSET: Record<LogoTileSize, number> = { 16: 12, 24: 16, 40: 26 };

/** Resolves a connector's `tile` spec to a monogram, lucide-icon, or vendored
 *  brand-image tile (40px default; images sit inset on a bordered card tile). */
export function ConnectorAvatar({
  tile,
  label,
  size = 40,
  className,
}: {
  tile: ConnectorTile;
  /** hashed only when no explicit tint is set on a monogram tile */
  label: string;
  size?: LogoTileSize;
  className?: string;
}) {
  if (tile.kind === "image") {
    const inset = IMAGE_INSET[size];
    return (
      <span
        aria-hidden="true"
        className={cn(
          "border-border bg-card rounded-btn inline-grid shrink-0 place-items-center border",
          ICON_BOX[size],
          className,
        )}
      >
        <Image
          src={tile.src}
          alt=""
          width={inset}
          height={inset}
          unoptimized
          className="object-contain"
        />
      </span>
    );
  }

  if (tile.kind === "icon") {
    const Icon = ICON_TILES[tile.icon];
    return (
      <span
        aria-hidden="true"
        className={cn(
          "rounded-btn inline-grid shrink-0 place-items-center",
          ICON_BOX[size],
          tile.tint === "accent"
            ? "bg-accent-50 text-accent-700"
            : "bg-navy-100 text-navy-700",
          className,
        )}
      >
        <Icon className={ICON_GLYPH[size]} />
      </span>
    );
  }

  return (
    <LogoTile
      label={label}
      initial={tile.initial}
      tint={tile.tint ?? "auto"}
      size={size}
      className={className}
    />
  );
}
