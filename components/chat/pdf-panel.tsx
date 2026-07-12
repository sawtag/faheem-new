"use client";

import * as React from "react";
import { Document, Page, pdfjs } from "react-pdf";
import {
  ChevronLeft,
  ChevronRight,
  Maximize,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * PDF viewer (react-pdf) deep-linked to a cited page.
 *
 * LANDMINE #3 — the pdfjs worker is VENDORED locally (public/pdf.worker.min.mjs,
 * copied from pdfjs-dist at build time), never the unpkg/cdnjs default. This
 * assignment runs after react-pdf's own import-time default, so it wins, and the
 * whole viewer works with the network offline (the e2e asserts zero off-host
 * requests). Text/annotation layers are off — no CSS imports, no extra fetches.
 */
pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

// Stable reference (react-pdf reloads the doc if `options` identity changes).
// Deliberately no cMapUrl / standardFontDataUrl → nothing is fetched off-host.
const PDF_OPTIONS = {} as const;

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2.4;

export default function PdfPanel({
  docId,
  page,
  title,
  onClose,
  onPageChange,
}: {
  docId: string;
  page: number;
  title: string;
  onClose: () => void;
  onPageChange: (page: number) => void;
}) {
  const t = useTranslations("chat.pdf");
  const [numPages, setNumPages] = React.useState<number | null>(null);
  const [zoom, setZoom] = React.useState(1);
  const [failed, setFailed] = React.useState(false);
  const [width, setWidth] = React.useState(0);
  const bodyRef = React.useRef<HTMLDivElement>(null);

  // Track the available width so "fit width" and zoom scale from it. The
  // observer fires once on observe(), so no synchronous initial setState.
  React.useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const total = numPages ?? 0;
  const clampedPage = total > 0 ? Math.min(Math.max(page, 1), total) : page;
  const fitWidth = Math.max(width - 32, 240);
  const pageWidth = Math.round(fitWidth * zoom);

  const file = `/api/documents/${docId}`;
  const pageLabel =
    total > 0
      ? t("pageOf", { page: clampedPage, total })
      : t("page", { page: clampedPage });

  return (
    <div className="bg-card flex h-full flex-col">
      {/* header: doc title + controls */}
      <div className="border-border flex h-14 shrink-0 items-center gap-2 border-b px-3">
        <p
          className="text-navy min-w-0 flex-1 truncate text-sm font-bold"
          title={title}
        >
          {title}
        </p>
        <div className="flex items-center gap-0.5">
          <IconButton
            label={t("zoomOut")}
            onClick={() =>
              setZoom((z) => Math.max(MIN_ZOOM, +(z - 0.2).toFixed(2)))
            }
            disabled={zoom <= MIN_ZOOM}
          >
            <ZoomOut className="size-4" />
          </IconButton>
          <IconButton
            label={t("zoomIn")}
            onClick={() =>
              setZoom((z) => Math.min(MAX_ZOOM, +(z + 0.2).toFixed(2)))
            }
            disabled={zoom >= MAX_ZOOM}
          >
            <ZoomIn className="size-4" />
          </IconButton>
          <IconButton label={t("fit")} onClick={() => setZoom(1)}>
            <Maximize className="size-4" />
          </IconButton>
          <span className="bg-border mx-1 h-5 w-px" aria-hidden="true" />
          <IconButton label={t("close")} onClick={onClose}>
            <X className="size-4" />
          </IconButton>
        </div>
      </div>

      {/* page navigator */}
      <div className="border-border flex h-11 shrink-0 items-center justify-center gap-3 border-b">
        <IconButton
          label={t("prev")}
          onClick={() => onPageChange(Math.max(1, clampedPage - 1))}
          disabled={clampedPage <= 1}
        >
          <ChevronLeft className="size-4 rtl:-scale-x-100" />
        </IconButton>
        <span className="text-text-secondary financial text-xs font-semibold">
          {pageLabel}
        </span>
        <IconButton
          label={t("next")}
          onClick={() =>
            onPageChange(Math.min(total || clampedPage + 1, clampedPage + 1))
          }
          disabled={total > 0 && clampedPage >= total}
        >
          <ChevronRight className="size-4 rtl:-scale-x-100" />
        </IconButton>
      </div>

      {/* document body */}
      <div
        ref={bodyRef}
        className="bg-navy-50/40 flex-1 overflow-auto p-4"
        dir="ltr"
      >
        {failed ? (
          <p className="text-text-secondary py-10 text-center text-sm">
            {t("error")}
          </p>
        ) : (
          <div className="flex justify-center">
            <Document
              file={file}
              options={PDF_OPTIONS}
              onLoadSuccess={({ numPages: n }) => setNumPages(n)}
              onLoadError={() => setFailed(true)}
              loading={<PageSkeleton width={pageWidth} />}
              error={
                <p className="text-text-secondary py-10 text-center text-sm">
                  {t("error")}
                </p>
              }
            >
              {width > 0 && (
                <Page
                  pageNumber={clampedPage}
                  width={pageWidth}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                  onRenderError={() => setFailed(true)}
                  loading={<PageSkeleton width={pageWidth} />}
                  className="shadow-card overflow-hidden rounded-[4px]"
                />
              )}
            </Document>
          </div>
        )}
      </div>
    </div>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        "text-text-secondary hover:bg-navy-50 hover:text-navy focus-visible:ring-accent focus-visible:ring-offset-card rounded-btn grid size-8 place-items-center transition-colors duration-[var(--duration-fast)] ease-[var(--ease)] outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-40",
      )}
    >
      {children}
    </button>
  );
}

function PageSkeleton({ width }: { width: number }) {
  return (
    <Skeleton
      className="rounded-[4px]"
      style={{ width, height: Math.round(width * 1.3) }}
    />
  );
}
