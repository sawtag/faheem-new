"use client";

import * as React from "react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
  animate,
} from "motion/react";
import { cn } from "@/lib/utils";

const EASE = [0.4, 0, 0.2, 1] as const; // mirrors --ease

/** Stat number that counts up over 400ms on first reveal (design-briefs §2.4 completion card). */
export function CountUp({
  value,
  suffix = "",
  className,
}: {
  value: number;
  suffix?: string;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const motionValue = useMotionValue(reduce ? value : 0);
  const rounded = useTransform(motionValue, (v) => Math.round(v));

  React.useEffect(() => {
    if (reduce) {
      motionValue.set(value);
      return;
    }
    const controls = animate(motionValue, value, {
      duration: 0.4,
      ease: EASE,
    });
    return () => controls.stop();
  }, [value, reduce, motionValue]);

  return (
    <span className={cn("financial", className)}>
      <motion.span>{rounded}</motion.span>
      {suffix}
    </span>
  );
}
