"use client";

import * as React from "react";
import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const button = cva(
  "relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-btn font-extrabold outline-none transition-colors duration-[var(--duration-fast)] ease-[var(--ease)] focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:pointer-events-none disabled:opacity-55",
  {
    variants: {
      variant: {
        primary: "bg-navy text-card hover:bg-navy-800 active:bg-navy-950",
        secondary:
          "bg-accent text-card hover:bg-accent-600 active:bg-accent-700",
        outline:
          "border border-border bg-card text-navy hover:border-navy-300 hover:bg-navy-50 active:bg-navy-100",
        ghost: "text-navy hover:bg-navy-50 active:bg-navy-100",
      },
      size: {
        sm: "h-9 px-3.5 text-sm font-bold",
        md: "h-11 px-5 text-base",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

function Spinner() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="faheem-spin size-4"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="3"
        opacity="0.25"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

export type ButtonProps = React.ComponentPropsWithoutRef<"button"> &
  VariantProps<typeof button> & {
    asChild?: boolean;
    loading?: boolean;
    /** icon nodes rendered at the inline-start / inline-end of the label. */
    startIcon?: React.ReactNode;
    endIcon?: React.ReactNode;
  };

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      loading = false,
      startIcon,
      endIcon,
      disabled,
      children,
      type,
      ...props
    },
    ref,
  ) => {
    const classes = cn(button({ variant, size }), className);

    // asChild delegates rendering to the single child (e.g. a link), the
    // loading/icon affordances don't apply, so pass children straight through.
    if (asChild) {
      return (
        <Slot.Root ref={ref} className={classes} {...props}>
          {children}
        </Slot.Root>
      );
    }

    const dim = loading ? "opacity-0" : undefined;
    return (
      <button
        ref={ref}
        type={type ?? "button"}
        className={classes}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading && (
          <span className="absolute inset-0 grid place-items-center">
            <Spinner />
          </span>
        )}
        {startIcon && (
          <span className={cn("inline-flex", dim)}>{startIcon}</span>
        )}
        {children != null && <span className={dim}>{children}</span>}
        {endIcon && <span className={cn("inline-flex", dim)}>{endIcon}</span>}
      </button>
    );
  },
);
Button.displayName = "Button";
