"use client";

import * as React from "react";
import { animate, useReducedMotion } from "motion/react";

const EASE = [0.4, 0, 0.2, 1] as const; // mirrors --ease

/**
 * Float count-up over 400ms on first reveal (the motion law's stat count-up).
 * Returns the animated value; the caller formats it (formatSAR / formatPercent
 * with tabular-nums so nothing shifts). Reduced-motion lands on the target
 * immediately. Shared by the dashboard stat cards and the pipeline deal cards.
 */
export function useCountUp(target: number): number {
  const reduced = useReducedMotion();
  const [value, setValue] = React.useState(reduced ? target : 0);

  React.useEffect(() => {
    if (reduced) return;
    const controls = animate(0, target, {
      duration: 0.4,
      ease: EASE,
      onUpdate: setValue,
    });
    return () => controls.stop();
  }, [target, reduced]);

  return value;
}
