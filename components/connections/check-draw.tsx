"use client";

import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

const EASE = [0.4, 0, 0.2, 1] as const; // mirrors --ease

/**
 * Accent circle-check with a 300ms stroke-draw morph (design-briefs §2.3/§2.4
 *, the OAuth success state and the onboarding completion card both use this
 * exact "check-draw" wow detail). Reduced-motion: renders fully drawn.
 */
export function CheckDraw({
  size = 40,
  className,
}: {
  size?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const drawn = reduce ? 1 : 0;

  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn("text-accent", className)}
    >
      <motion.circle
        cx="12"
        cy="12"
        r="10"
        initial={{ pathLength: drawn }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.3, ease: EASE }}
      />
      <motion.path
        d="M8 12.5l2.5 2.5L16 9.5"
        initial={{ pathLength: drawn }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.3, delay: reduce ? 0 : 0.15, ease: EASE }}
      />
    </svg>
  );
}
