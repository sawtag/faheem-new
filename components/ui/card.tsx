import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const card = cva("rounded-card border border-border bg-card", {
  variants: {
    padding: { none: "", sm: "p-4", md: "p-6", lg: "p-8" },
    elevated: { true: "shadow-card", false: "" },
    hover: {
      // list rows never lift, only cards (design-briefs §0.4)
      true: "transition duration-[var(--duration-fast)] ease-[var(--ease)] hover:-translate-y-px hover:shadow-hover",
      false: "",
    },
  },
  defaultVariants: { padding: "md", elevated: false, hover: false },
});

export type CardProps = React.ComponentPropsWithoutRef<"div"> &
  VariantProps<typeof card>;

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, padding, elevated, hover, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(card({ padding, elevated, hover }), className)}
      {...props}
    />
  ),
);
Card.displayName = "Card";
