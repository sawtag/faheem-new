"use client";

import * as React from "react";
import { Switch as RSwitch } from "radix-ui";
import { cn } from "@/lib/utils";

/**
 * Switch toggle — accent track when on, thumb slides 150ms. Radix mirrors the
 * checked position under `dir="rtl"` via the paired translate variants.
 */
export const Toggle = React.forwardRef<
  React.ComponentRef<typeof RSwitch.Root>,
  React.ComponentPropsWithoutRef<typeof RSwitch.Root>
>(({ className, ...props }, ref) => (
  <RSwitch.Root
    ref={ref}
    className={cn(
      "rounded-pill bg-navy-200 focus-visible:ring-accent focus-visible:ring-offset-bg data-[state=checked]:bg-accent inline-flex h-6 w-11 shrink-0 items-center p-0.5 transition-colors duration-[var(--duration-fast)] ease-[var(--ease)] outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-55",
      className,
    )}
    {...props}
  >
    <RSwitch.Thumb className="rounded-pill bg-card pointer-events-none block size-5 shadow-sm transition-transform duration-[var(--duration-fast)] ease-[var(--ease)] data-[state=checked]:translate-x-5 rtl:data-[state=checked]:-translate-x-5" />
  </RSwitch.Root>
));
Toggle.displayName = "Toggle";
