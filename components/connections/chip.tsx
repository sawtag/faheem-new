"use client";

import { cn } from "@/lib/utils";

/**
 * Segmented-pill radio option / multi-select filter chip (design-briefs
 * §2.4 step 3 — holding period, drawdown tolerance, sector appetite all
 * share this exact selected/unselected treatment).
 */
export function Chip({
  selected,
  onClick,
  children,
  className,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "rounded-pill border px-3.5 py-1.5 text-[0.8125rem] font-semibold whitespace-nowrap transition-colors duration-[var(--duration-fast)] ease-[var(--ease)]",
        selected
          ? "border-navy bg-navy text-card"
          : "border-border bg-card text-navy-700 hover:border-navy-300",
        className,
      )}
    >
      {children}
    </button>
  );
}
