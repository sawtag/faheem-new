"use client";

import * as React from "react";
import { Avatar as RAvatar } from "radix-ui";
import { cn } from "@/lib/utils";

/** Initials from a person's name: first + last initial (single word → one letter). */
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  const first = parts[0]!.charAt(0);
  const last = parts.length > 1 ? parts[parts.length - 1]!.charAt(0) : "";
  return (first + last).toUpperCase();
}

const SIZES = {
  sm: "size-6 text-[0.6875rem]",
  md: "size-8 text-xs",
  lg: "size-10 text-sm",
} as const;

export type AvatarSize = keyof typeof SIZES;

/** People only (initials tile, navy), companies/connectors use `LogoTile`. */
export function Avatar({
  name,
  src,
  size = "md",
  square = false,
  className,
}: {
  name: string;
  src?: string;
  size?: AvatarSize;
  square?: boolean;
  className?: string;
}) {
  return (
    <RAvatar.Root
      className={cn(
        "bg-navy text-card inline-flex shrink-0 items-center justify-center overflow-hidden font-bold select-none",
        square ? "rounded-btn" : "rounded-pill",
        SIZES[size],
        className,
      )}
    >
      {src && (
        <RAvatar.Image
          src={src}
          alt={name}
          className="size-full object-cover"
        />
      )}
      <RAvatar.Fallback className="flex size-full items-center justify-center">
        {initialsOf(name)}
      </RAvatar.Fallback>
    </RAvatar.Root>
  );
}
