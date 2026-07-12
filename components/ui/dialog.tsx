"use client";

import * as React from "react";
import { Dialog as RDialog } from "radix-ui";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Dialog = RDialog.Root;
export const DialogTrigger = RDialog.Trigger;
export const DialogClose = RDialog.Close;

export const DialogContent = React.forwardRef<
  React.ComponentRef<typeof RDialog.Content>,
  React.ComponentPropsWithoutRef<typeof RDialog.Content> & {
    showClose?: boolean;
  }
>(({ className, children, showClose = true, ...props }, ref) => (
  <RDialog.Portal>
    <RDialog.Overlay className="faheem-overlay bg-navy-950/40 fixed inset-0 z-50 backdrop-blur-[2px]" />
    <RDialog.Content
      ref={ref}
      className={cn(
        // centering is direction-independent (50% is the same center in RTL),
        // and the enter/exit keyframes bake in the -50%/-50% translate.
        "faheem-dialog rounded-card border-border bg-card shadow-modal fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 border p-6 outline-none",
        className,
      )}
      {...props}
    >
      {children}
      {showClose && (
        <RDialog.Close className="rounded-btn text-text-secondary hover:bg-navy-50 hover:text-navy focus-visible:ring-accent focus-visible:ring-offset-bg absolute end-4 top-4 grid size-8 place-items-center transition-colors duration-[var(--duration-fast)] ease-[var(--ease)] outline-none focus-visible:ring-2 focus-visible:ring-offset-2">
          <X className="size-4" aria-hidden="true" />
          <span className="sr-only">Close</span>
        </RDialog.Close>
      )}
    </RDialog.Content>
  </RDialog.Portal>
));
DialogContent.displayName = "DialogContent";

export const DialogTitle = React.forwardRef<
  React.ComponentRef<typeof RDialog.Title>,
  React.ComponentPropsWithoutRef<typeof RDialog.Title>
>(({ className, ...props }, ref) => (
  <RDialog.Title
    ref={ref}
    className={cn("text-h3 text-navy font-extrabold", className)}
    {...props}
  />
));
DialogTitle.displayName = "DialogTitle";

export const DialogDescription = React.forwardRef<
  React.ComponentRef<typeof RDialog.Description>,
  React.ComponentPropsWithoutRef<typeof RDialog.Description>
>(({ className, ...props }, ref) => (
  <RDialog.Description
    ref={ref}
    className={cn("text-text-secondary mt-2 text-[0.9375rem]", className)}
    {...props}
  />
));
DialogDescription.displayName = "DialogDescription";
