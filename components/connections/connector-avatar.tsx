import { LayoutTemplate } from "lucide-react";
import { LogoTile } from "@/components/ui/logo-tile";
import { cn } from "@/lib/utils";
import type { ConnectorTile } from "@/lib/connectors";

const ICON_TILES = { "layout-template": LayoutTemplate } as const;

/** Resolves a connector's `tile` spec to a 40px monogram or lucide-icon tile. */
export function ConnectorAvatar({
  tile,
  label,
  className,
}: {
  tile: ConnectorTile;
  /** hashed only when no explicit tint is set on a monogram tile */
  label: string;
  className?: string;
}) {
  if (tile.kind === "icon") {
    const Icon = ICON_TILES[tile.icon];
    return (
      <span
        aria-hidden="true"
        className={cn(
          "rounded-btn inline-grid size-10 shrink-0 place-items-center",
          tile.tint === "accent"
            ? "bg-accent-50 text-accent-700"
            : "bg-navy-100 text-navy-700",
          className,
        )}
      >
        <Icon className="size-5" />
      </span>
    );
  }

  return (
    <LogoTile
      label={label}
      initial={tile.initial}
      tint={tile.tint ?? "auto"}
      className={className}
    />
  );
}
