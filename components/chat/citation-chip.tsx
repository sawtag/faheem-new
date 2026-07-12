"use client";

import * as React from "react";
import { Tooltip } from "@/components/ui/tooltip";
import type { CitationRef } from "@/components/chat/reduce";
import { cn } from "@/lib/utils";

/**
 * Inline numbered citation chip (mint) — the marker `[[n]]` rendered as a
 * clickable chip that opens the cited page in the PdfPanel. Hover reveals the
 * ≤200-char source quote. When the matching citation event hasn't arrived yet
 * (a marker can stream one tick ahead of its citation), it renders as a plain
 * number until it resolves.
 */
export function CitationChip({
  n,
  citation,
  onOpen,
}: {
  n: number;
  citation?: CitationRef;
  onOpen?: (docId: string, page: number) => void;
}) {
  const base = cn(
    "financial mx-0.5 inline-flex h-[1.15rem] min-w-[1.2rem] translate-y-[-0.06em] items-center justify-center rounded-pill bg-accent-50 px-1 text-[0.6875rem] font-bold leading-none text-accent-700 align-baseline",
  );

  if (!citation || !onOpen) {
    return (
      <span className={base} aria-label={`citation ${n}`}>
        {n}
      </span>
    );
  }

  return (
    <Tooltip content={citation.quote} side="top">
      <button
        type="button"
        onClick={() => onOpen(citation.docId, citation.page)}
        aria-label={`Open source ${n}`}
        className={cn(
          base,
          "hover:bg-accent-100 focus-visible:ring-accent focus-visible:ring-offset-card cursor-pointer transition-colors duration-[var(--duration-fast)] ease-[var(--ease)] outline-none focus-visible:ring-2 focus-visible:ring-offset-1",
        )}
      >
        {n}
      </button>
    </Tooltip>
  );
}
