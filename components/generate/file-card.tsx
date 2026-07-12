"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import {
  BadgeCheck,
  Download,
  FileText,
  Presentation,
  Sheet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn, formatDate } from "@/lib/utils";
import type { ArtifactMeta, Lang } from "@/lib/types";
import type { ArtifactKind } from "@/components/generate/protocol";

/** Same icon/tint-per-kind vocabulary as the Library grid (app/(app)/library) — kept as
 * its own copy since that map is private to library-client.tsx (T3.6's lane). */
export const KIND_TILE: Record<
  ArtifactKind,
  { icon: typeof Sheet; tile: string }
> = {
  xlsx: { icon: Sheet, tile: "bg-accent-50 text-accent-700" },
  docx: { icon: FileText, tile: "bg-navy-50 text-navy-700" },
  pptx: { icon: Presentation, tile: "bg-warning-50 text-warning-700" },
};

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(0)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

/** Landed deliverable — download + jump into the workspace's Artifacts tab. */
export function FileCard({
  meta,
  sizeBytes,
  workspace,
}: {
  meta: ArtifactMeta;
  sizeBytes: number;
  workspace: string;
}) {
  const t = useTranslations("generate");
  const tLibrary = useTranslations("library");
  const locale = useLocale() as Lang;
  const { icon: Icon, tile } = KIND_TILE[meta.kind];

  return (
    <Card hover className="p-5">
      <div className="flex items-start justify-between gap-3">
        <span
          className={cn(
            "rounded-btn grid size-10 shrink-0 place-items-center",
            tile,
          )}
        >
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <span className="text-text-secondary financial shrink-0 text-xs font-medium">
          {formatFileSize(sizeBytes)}
        </span>
      </div>
      <p className="text-navy mt-3 truncate text-sm font-semibold">
        {meta.name[locale]}
      </p>
      <p className="text-text-secondary mt-1 text-xs">
        {formatDate(meta.createdAt, locale)}
      </p>
      {meta.sources !== undefined && (
        <p className="text-accent-700 mt-2 flex items-center gap-1.5 text-xs font-medium">
          <BadgeCheck className="size-3.5 shrink-0" aria-hidden="true" />
          {tLibrary("verified", { n: meta.sources })}
        </p>
      )}
      <div className="mt-3 flex gap-2">
        <Button
          asChild
          size="sm"
          variant="outline"
          startIcon={<Download className="size-4" aria-hidden="true" />}
        >
          <a href={meta.file} download>
            {t("download")}
          </a>
        </Button>
        <Button asChild size="sm" variant="ghost">
          <Link href={`/deals/${workspace}?tab=artifacts`}>
            {t("openInWorkspace")}
          </Link>
        </Button>
      </div>
    </Card>
  );
}
