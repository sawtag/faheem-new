"use client";

import * as React from "react";
import { Tabs as RTabs } from "radix-ui";
import { cn } from "@/lib/utils";

/** Underline tabs, keyboard-navigable (Radix), RTL-aware via `dir`. */
export const Tabs = RTabs.Root;

export const TabsList = React.forwardRef<
  React.ComponentRef<typeof RTabs.List>,
  React.ComponentPropsWithoutRef<typeof RTabs.List>
>(({ className, ...props }, ref) => (
  <RTabs.List
    ref={ref}
    className={cn("border-border flex items-center gap-1 border-b", className)}
    {...props}
  />
));
TabsList.displayName = "TabsList";

export const TabsTrigger = React.forwardRef<
  React.ComponentRef<typeof RTabs.Trigger>,
  React.ComponentPropsWithoutRef<typeof RTabs.Trigger>
>(({ className, ...props }, ref) => (
  <RTabs.Trigger
    ref={ref}
    className={cn(
      "text-text-secondary hover:text-navy focus-visible:ring-accent focus-visible:ring-offset-bg data-[state=active]:border-accent data-[state=active]:text-navy relative -mb-px inline-flex h-10 items-center border-b-2 border-transparent px-3 text-[0.9375rem] font-semibold whitespace-nowrap transition-colors duration-[var(--duration-fast)] ease-[var(--ease)] outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
      className,
    )}
    {...props}
  />
));
TabsTrigger.displayName = "TabsTrigger";

export const TabsContent = React.forwardRef<
  React.ComponentRef<typeof RTabs.Content>,
  React.ComponentPropsWithoutRef<typeof RTabs.Content>
>(({ className, ...props }, ref) => (
  <RTabs.Content
    ref={ref}
    className={cn("mt-4 outline-none", className)}
    {...props}
  />
));
TabsContent.displayName = "TabsContent";
