"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import {
  BadgeCheck,
  Download,
  Eye,
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

/** Landed deliverable — preview in-app (primary), download, jump to the
 * workspace's Artifacts tab. Without `onPreview` the download button stays
 * primary (legacy affordance for mounts with no preview panel). */
export function FileCard({
  meta,
  sizeBytes,
  workspace,
  onPreview,
}: {
  meta: ArtifactMeta;
  sizeBytes: number;
  workspace: string;
  onPreview?: () => void;
}) {
  const t = useTranslations("generate");
  const tLibrary = useTranslations("library");
  const locale = useLocale() as Lang;
  const { icon: Icon, tile } = KIND_TILE[meta.kind];

  return (
    <Card
      hover
      className={cn("p-5", onPreview && "cursor-pointer")}
      onClick={onPreview}
    >
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
      <div className="mt-3 flex items-center gap-2">
        {onPreview ? (
          <Button
            size="sm"
            variant="outline"
            startIcon={<Eye className="size-4" aria-hidden="true" />}
            onClick={(e) => {
              e.stopPropagation();
              onPreview();
            }}
          >
            {t("preview.open")}
          </Button>
        ) : (
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
        )}
        <Button asChild size="sm" variant="ghost">
          <Link
            href={`/deals/${workspace}?tab=artifacts`}
            onClick={(e) => e.stopPropagation()}
          >
            {t("openInWorkspace")}
          </Link>
        </Button>
        {onPreview && (
          <a
            href={meta.file}
            download
            aria-label={t("download")}
            title={t("download")}
            onClick={(e) => e.stopPropagation()}
            className="text-text-secondary hover:bg-navy-50 hover:text-navy focus-visible:ring-accent focus-visible:ring-offset-card rounded-btn ms-auto grid size-8 shrink-0 place-items-center transition-colors duration-[var(--duration-fast)] ease-[var(--ease)] outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          >
            <Download className="size-4" aria-hidden="true" />
          </a>
        )}
      </div>
    </Card>
  );
}
