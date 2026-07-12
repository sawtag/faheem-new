"use client";

import * as React from "react";
import { DropdownMenu as RMenu } from "radix-ui";
import { cn } from "@/lib/utils";

export const DropdownMenu = RMenu.Root;
export const DropdownMenuTrigger = RMenu.Trigger;
export const DropdownMenuGroup = RMenu.Group;

export const DropdownMenuContent = React.forwardRef<
  React.ComponentRef<typeof RMenu.Content>,
  React.ComponentPropsWithoutRef<typeof RMenu.Content>
>(({ className, sideOffset = 6, align = "end", ...props }, ref) => (
  <RMenu.Portal>
    <RMenu.Content
      ref={ref}
      sideOffset={sideOffset}
      align={align}
      className={cn(
        "faheem-pop rounded-card border-border bg-card shadow-hover z-50 min-w-[10rem] overflow-hidden border p-1.5",
        className,
      )}
      {...props}
    />
  </RMenu.Portal>
));
DropdownMenuContent.displayName = "DropdownMenuContent";

export const DropdownMenuItem = React.forwardRef<
  React.ComponentRef<typeof RMenu.Item>,
  React.ComponentPropsWithoutRef<typeof RMenu.Item>
>(({ className, ...props }, ref) => (
  <RMenu.Item
    ref={ref}
    className={cn(
      "rounded-btn text-navy data-[highlighted]:bg-navy-50 flex cursor-pointer items-center gap-2 px-2.5 py-2 text-[0.9375rem] transition-colors duration-[var(--duration-fast)] ease-[var(--ease)] outline-none select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className,
    )}
    {...props}
  />
));
DropdownMenuItem.displayName = "DropdownMenuItem";

export const DropdownMenuLabel = React.forwardRef<
  React.ComponentRef<typeof RMenu.Label>,
  React.ComponentPropsWithoutRef<typeof RMenu.Label>
>(({ className, ...props }, ref) => (
  <RMenu.Label
    ref={ref}
    className={cn(
      "text-text-secondary px-2.5 py-1.5 text-[0.6875rem] font-semibold tracking-[0.04em] uppercase",
      className,
    )}
    {...props}
  />
));
DropdownMenuLabel.displayName = "DropdownMenuLabel";

export const DropdownMenuSeparator = React.forwardRef<
  React.ComponentRef<typeof RMenu.Separator>,
  React.ComponentPropsWithoutRef<typeof RMenu.Separator>
>(({ className, ...props }, ref) => (
  <RMenu.Separator
    ref={ref}
    className={cn("bg-border my-1 h-px", className)}
    {...props}
  />
));
DropdownMenuSeparator.displayName = "DropdownMenuSeparator";
