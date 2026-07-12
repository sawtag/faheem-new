import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.ComponentPropsWithoutRef<"input"> & {
  /** leading icon at the inline-start (e.g. lucide `Search`, `User`). */
  startIcon?: React.ReactNode;
  /** inline-end adornment (e.g. a `%` suffix, a validation check). */
  endSlot?: React.ReactNode;
  /** danger border + aria-invalid (pair with the shared error text pattern). */
  invalid?: boolean;
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, startIcon, endSlot, invalid, ...props }, ref) => {
    const field = (
      <input
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(
          "rounded-btn bg-card text-navy placeholder:text-text-secondary/60 focus-visible:ring-accent focus-visible:ring-offset-bg h-11 w-full border text-[0.9375rem] transition-colors duration-[var(--duration-fast)] ease-[var(--ease)] outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-55",
          startIcon ? "ps-11" : "ps-3.5",
          endSlot ? "pe-11" : "pe-3.5",
          invalid
            ? "border-danger hover:border-danger"
            : "border-border hover:border-navy-300",
          className,
        )}
        {...props}
      />
    );

    if (!startIcon && !endSlot) return field;

    return (
      <div className="relative">
        {startIcon && (
          <span className="text-text-secondary pointer-events-none absolute inset-y-0 start-0 grid w-11 place-items-center">
            {startIcon}
          </span>
        )}
        {field}
        {endSlot && (
          <span className="text-text-secondary absolute inset-y-0 end-0 grid w-11 place-items-center">
            {endSlot}
          </span>
        )}
      </div>
    );
  },
);
Input.displayName = "Input";
