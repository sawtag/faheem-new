"use client";

import * as React from "react";
import { FileText } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { CorpusDoc, Lang } from "@/lib/types";

const TYPE_VARIANT: Record<
  CorpusDoc["type"],
  NonNullable<BadgeProps["variant"]>
> = {
  public: "neutral",
  lunar: "mvp",
  deal: "mint",
};

/**
 * The workspace document room — corpus docs scoped to this company plus the
 * Lunar mandate docs and the market packs. "Open" deep-links the PdfPanel to
 * page 1 (same viewer the citation chips use).
 */
export function DocumentsTab({
  docs,
  onOpen,
}: {
  docs: CorpusDoc[];
  onOpen: (docId: string) => void;
}) {
  const t = useTranslations("deals.documents");
  const locale = useLocale() as Lang;

  return (
    <Card padding="none" elevated>
      <ul>
        {docs.map((doc, i) => (
          <li
            key={doc.id}
            data-testid="doc-row"
            className={
              "hover:bg-navy-50/50 flex items-center gap-3 px-5 py-3.5 transition-colors duration-[var(--duration-fast)] ease-[var(--ease)]" +
              (i < docs.length - 1 ? " border-border border-b" : "")
            }
          >
            <span className="bg-navy-50 text-navy-600 rounded-btn grid size-9 shrink-0 place-items-center">
              <FileText className="size-4" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-navy truncate text-sm font-semibold">
                {doc.title[locale]}
              </p>
              <p className="text-text-secondary financial mt-0.5 text-xs">
                {t("meta", { pages: doc.pages, size: doc.sizeMB })}
              </p>
            </div>
            <Badge variant={TYPE_VARIANT[doc.type]} size="sm">
              {t(`type.${doc.type}`)}
            </Badge>
            <Button variant="outline" size="sm" onClick={() => onOpen(doc.id)}>
              {t("open")}
            </Button>
          </li>
        ))}
      </ul>
    </Card>
  );
}
