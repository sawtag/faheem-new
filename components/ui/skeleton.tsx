import * as React from "react";
import { cn } from "@/lib/utils";

/** Shimmering placeholder. Size it via `className`; matches the real box (§0.4). */
export function Skeleton({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  return (
    <div className={cn("faheem-skeleton rounded-btn", className)} {...props} />
  );
}
