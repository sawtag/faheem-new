"use client";

import * as React from "react";
import { Tooltip as RTooltip } from "radix-ui";
import { cn } from "@/lib/utils";

/**
 * Dark-navy tooltip (150ms pop). Self-contained: wraps its own Provider so a
 * single `<Tooltip content=...>` works anywhere.
 */
export function Tooltip({
  content,
  children,
  side = "top",
  delayDuration = 200,
  className,
}: {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: React.ComponentPropsWithoutRef<typeof RTooltip.Content>["side"];
  delayDuration?: number;
  className?: string;
}) {
  return (
    <RTooltip.Provider delayDuration={delayDuration}>
      <RTooltip.Root>
        <RTooltip.Trigger asChild>{children}</RTooltip.Trigger>
        <RTooltip.Portal>
          <RTooltip.Content
            side={side}
            sideOffset={6}
            className={cn(
              "faheem-pop rounded-btn bg-navy text-card shadow-hover z-50 max-w-[16rem] px-3 py-1.5 text-xs font-medium",
              className,
            )}
          >
            {content}
            <RTooltip.Arrow className="fill-navy" />
          </RTooltip.Content>
        </RTooltip.Portal>
      </RTooltip.Root>
    </RTooltip.Provider>
  );
}
