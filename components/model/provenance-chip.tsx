"use client";

import * as React from "react";
import { motion } from "motion/react";
import { FileText, Sigma, SquarePen } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Provenance } from "@/lib/model/types";

const EASE = [0.4, 0, 0.2, 1] as const;
const STAGGER_CAP = 8;

const ICON: Record<Provenance["kind"], typeof FileText> = {
  sourced: FileText,
  computed: Sigma,
  assumption: SquarePen,
};

/**
 * A drillable input chip (label + formatted value + provenance-kind icon).
 * Used both for the computed node's input chain and could be reused wherever
 * a single node needs a compact clickable summary.
 */
export function ProvenanceChip({
  label,
  value,
  kind,
  onClick,
  index = 0,
}: {
  label: string;
  value: string;
  kind: Provenance["kind"];
  onClick: () => void;
  index?: number;
}) {
  const Icon = ICON[kind];
  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.25,
        ease: EASE,
        delay: Math.min(index, STAGGER_CAP) * 0.03,
      }}
      className={cn(
        "border-border bg-card hover:border-accent hover:bg-accent-50/40 focus-visible:ring-accent focus-visible:ring-offset-card group rounded-btn flex items-center gap-2 border px-2.5 py-1.5 text-start transition-colors duration-[var(--duration-fast)] ease-[var(--ease)] outline-none focus-visible:ring-2 focus-visible:ring-offset-1",
      )}
    >
      <Icon
        className="text-text-secondary group-hover:text-accent size-3.5 shrink-0"
        aria-hidden="true"
      />
      <span className="flex flex-col items-start">
        <span className="text-text-secondary text-[0.6875rem] leading-tight">
          {label}
        </span>
        <span className="financial text-navy text-sm leading-tight font-semibold">
          {value}
        </span>
      </span>
    </motion.button>
  );
}
