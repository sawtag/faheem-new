"use client";

import * as React from "react";
import { motion } from "motion/react";
import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import type { CitationRef } from "@/components/chat/reduce";
import { stashCitationHighlight } from "@/components/chat/highlight-bus";
import { cn } from "@/lib/utils";

/**
 * Collapsible fact→source map under each answer (CATALOG §2B) — every citation
 * as quote + doc title + page + numbered chip. A row click behaves like the
 * inline chip: it opens the cited page in the PdfPanel with the quoted
 * passage highlighted (audit-ready).
 */
export function SourcesAccordion({
  citations,
  docTitle,
  onOpenDoc,
}: {
  citations: CitationRef[];
  docTitle: (docId: string) => string;
  onOpenDoc: (docId: string, page: number) => void;
}) {
  const t = useTranslations("chat");
  const [open, setOpen] = React.useState(false);
  if (citations.length === 0) return null;

  const rows = [...citations].sort((a, b) => a.n - b.n);

  return (
    <div className="border-border bg-card rounded-card mt-3 border">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="hover:bg-navy-50 focus-visible:ring-accent focus-visible:ring-offset-card rounded-card flex w-full items-center gap-2 px-3 py-2.5 text-start transition-colors duration-[var(--duration-fast)] ease-[var(--ease)] outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
      >
        <span className="bg-accent-50 text-accent-700 financial rounded-pill grid h-5 min-w-5 place-items-center px-1 text-[0.6875rem] font-bold">
          {rows.length}
        </span>
        <span className="text-navy text-sm font-bold">
          {t("sources.title")}
        </span>
        <ChevronDown
          className={cn(
            "text-text-secondary ms-auto size-4 transition-transform duration-[var(--duration-fast)] ease-[var(--ease)]",
            open && "rotate-180",
          )}
          aria-hidden="true"
        />
      </button>
      {open && (
        <motion.ul
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
          className="overflow-hidden px-2 pb-2"
        >
          {rows.map((c) => (
            <li key={c.n}>
              <button
                type="button"
                onClick={() => {
                  stashCitationHighlight({
                    docId: c.docId,
                    page: c.page,
                    quote: c.quote,
                  });
                  onOpenDoc(c.docId, c.page);
                }}
                className="hover:bg-navy-50 focus-visible:ring-accent focus-visible:ring-offset-card group rounded-btn flex w-full items-start gap-2.5 px-2 py-2 text-start transition-colors duration-[var(--duration-fast)] ease-[var(--ease)] outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
              >
                <span className="bg-accent-50 text-accent-700 financial rounded-pill mt-0.5 grid h-[1.15rem] min-w-[1.2rem] shrink-0 place-items-center px-1 text-[0.6875rem] font-bold">
                  {c.n}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="text-text group-hover:text-navy block text-[0.9375rem] leading-snug">
                    {c.quote}
                  </span>
                  <span className="text-text-secondary mt-0.5 block text-xs">
                    {docTitle(c.docId)} ·{" "}
                    <span className="financial">
                      {t("sources.page", { page: c.page })}
                    </span>
                  </span>
                </span>
              </button>
            </li>
          ))}
        </motion.ul>
      )}
    </div>
  );
}
