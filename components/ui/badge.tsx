import * as React from "react";
import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badge = cva(
  "inline-flex items-center gap-1 whitespace-nowrap rounded-pill font-semibold leading-none outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
  {
    variants: {
      variant: {
        neutral: "bg-navy-100 text-navy-700",
        navy: "bg-navy text-card",
        mint: "bg-accent-50 text-accent-700", // verified / pass / success
        warning: "bg-warning-50 text-warning-700", // warn
        danger: "bg-danger-50 text-danger-700", // fail / needs review
        beta: "bg-accent-50 text-accent-700",
        mvp: "bg-navy-50 text-navy-700",
      },
      size: {
        sm: "px-2 py-0.5 text-[0.6875rem]",
        md: "px-2.5 py-1 text-xs",
      },
    },
    defaultVariants: { variant: "neutral", size: "md" },
  },
);

export type BadgeProps = React.ComponentPropsWithoutRef<"span"> &
  VariantProps<typeof badge> & { asChild?: boolean };

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = (asChild ? Slot.Root : "span") as React.ElementType;
    return (
      <Comp
        ref={ref}
        className={cn(badge({ variant, size }), className)}
        {...props}
      />
    );
  },
);
Badge.displayName = "Badge";
