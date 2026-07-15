"use client";

import * as React from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/TextLayer.css";
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
import { matchQuote } from "@/lib/highlight";
import {
  getCitationHighlight,
  subscribeCitationHighlight,
} from "@/components/chat/highlight-bus";
import { cn } from "@/lib/utils";

/**
 * PDF viewer (react-pdf) deep-linked to a cited page, with the cited passage
 * highlighted in the text layer (AGENTS.md rule 5, every number's source is
 * clickable AND visibly marked).
 *
 * LANDMINE #3, the pdfjs worker is VENDORED locally (public/pdf.worker.min.mjs,
 * copied from pdfjs-dist at build time), never the unpkg/cdnjs default. This
 * assignment runs after react-pdf's own import-time default, so it wins, and the
 * whole viewer works with the network offline (the e2e asserts zero off-host
 * requests). The text layer renders ONLY when a citation quote is being
 * highlighted; its CSS is bundled locally (the import above), annotation layer
 * stays off, still zero off-host fetches.
 */
pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

// Stable reference (react-pdf reloads the doc if `options` identity changes).
// standardFontDataUrl is VENDORED (public/standard-fonts/, copied from
// pdfjs-dist) so substituted fonts use pdfjs's own faces, never a network
// fetch. Deliberately no cMapUrl.
const PDF_OPTIONS = { standardFontDataUrl: "/standard-fonts/" } as const;

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2.4;

/** Escape an item's text for the customTextRenderer HTML string. */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// The text layer's glyphs are transparent (the canvas below shows the real
// ones), so the mark's fill must let the canvas text show through: a
// semi-transparent accent tint + multiply, never an opaque background.
const MARK_BG = "color-mix(in srgb, var(--color-accent-100) 60%, transparent)";
const MARK_PULSE_BG =
  "color-mix(in srgb, var(--color-accent-200) 85%, transparent)";
const MARK_OPEN =
  '<mark class="bg-accent-100/60 mix-blend-multiply rounded-[3px] px-px text-inherit" data-testid="citation-highlight">';

export default function PdfPanel({
  docId,
  page,
  title,
  highlight,
  onClose,
  onPageChange,
}: {
  docId: string;
  page: number;
  title: string;
  /** citation quote to highlight on the cited page; omit for page-level open */
  highlight?: string;
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

  // ── citation-quote highlighting ────────────────────────────────────────────
  // A chip click stashes {docId, page, quote} on the bus just before the
  // owning surface opens/moves this panel; when the stash matches what is on
  // screen, the quote wins over the (optional) highlight prop. Off the cited
  // page the quote is simply absent → text layer off, page-level view.
  const stash = React.useSyncExternalStore(
    subscribeCitationHighlight,
    getCitationHighlight,
    () => null,
  );
  const active =
    stash && stash.docId === docId && stash.page === clampedPage ? stash : null;
  const quote = active ? active.quote : (highlight ?? null);

  // Text items of the page currently rendered (tagged with their page so a
  // stale layer from the previous page never feeds the matcher).
  const [textLayer, setTextLayer] = React.useState<{
    page: number;
    items: string[];
  } | null>(null);

  const spansByItem = React.useMemo(() => {
    if (!quote || !textLayer || textLayer.page !== clampedPage) return null;
    const spans = matchQuote(quote, textLayer.items);
    if (!spans) return null; // silent fallback, page-level only, never an error
    const map = new Map<number, { start: number; end: number }[]>();
    for (const s of spans) {
      const list = map.get(s.itemIndex) ?? [];
      list.push({ start: s.start, end: s.end });
      map.set(s.itemIndex, list);
    }
    return map;
  }, [quote, textLayer, clampedPage]);

  const renderHighlight = React.useCallback(
    ({ str, itemIndex }: { str: string; itemIndex: number }) => {
      const ranges = spansByItem?.get(itemIndex);
      if (!ranges?.length) return escapeHtml(str);
      let html = "";
      let cursor = 0;
      for (const r of ranges) {
        html += escapeHtml(str.slice(cursor, r.start));
        html += MARK_OPEN + escapeHtml(str.slice(r.start, r.end)) + "</mark>";
        cursor = r.end;
      }
      return html + escapeHtml(str.slice(cursor));
    },
    [spansByItem],
  );

  // pdf.js sizes every text-layer span from the PDF's *declared* metrics, but
  // some corpus pages PAINT wider (per-glyph tracking the metadata doesn't
  // report, e.g. fy25-er headings run exactly 1.25× their declared width),
  // leaving the layer, and any highlight in it, short of the pixels. For
  // each marked span, read the rendered canvas's own pixels across the span's
  // row, detect the painted glyph run (word gaps bridged, column gaps stop
  // it), and stretch the span to hug the paint. Only line-initial spans (run
  // starting at the span's left edge) are touched, only stretched, capped,
  // and any miss silently keeps the declared width.
  const recalibrateMarks = React.useCallback(() => {
    const body = bodyRef.current;
    const canvas = body?.querySelector("canvas");
    const g = canvas?.getContext("2d");
    if (!body || !canvas || !g) return;
    const cRect = canvas.getBoundingClientRect();
    const dpr = cRect.width > 0 ? canvas.width / cRect.width : 1;
    const seen = new Set<HTMLElement>();
    for (const mark of body.querySelectorAll<HTMLElement>(
      'mark[data-testid="citation-highlight"]',
    )) {
      const span = mark.closest("span");
      if (!span || seen.has(span)) continue;
      seen.add(span);
      const sRect = span.getBoundingClientRect();
      const fontPx = parseFloat(getComputedStyle(span).fontSize) || 10;
      const gapTol = Math.max(3, fontPx * 0.45) * dpr;
      const y0 = Math.max(0, Math.floor((sRect.top - cRect.top) * dpr) - 2);
      const h = Math.min(canvas.height - y0, Math.ceil(sRect.height * dpr) + 4);
      const x0 = Math.max(
        0,
        Math.floor((sRect.left - cRect.left) * dpr - gapTol),
      );
      const w = Math.min(
        canvas.width - x0,
        Math.ceil((sRect.width * 2.2 + (2 * gapTol) / dpr) * dpr),
      );
      if (w <= 0 || h <= 0) continue;
      const px = g.getImageData(x0, y0, w, h).data;
      const ink: boolean[] = new Array<boolean>(w).fill(false);
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const i = (y * w + x) * 4;
          if (px[i]! < 190 && px[i + 1]! < 190 && px[i + 2]! < 190) {
            ink[x] = true;
          }
        }
      }
      const spanL = Math.round((sRect.left - cRect.left) * dpr) - x0;
      let left = spanL;
      let right = spanL;
      for (let x = spanL, gap = 0; x < w && gap <= gapTol; x++) {
        if (ink[x]) {
          right = x;
          gap = 0;
        } else gap++;
      }
      for (let x = spanL, gap = 0; x >= 0 && gap <= gapTol; x--) {
        if (ink[x]) {
          left = x;
          gap = 0;
        } else gap++;
      }
      if (Math.abs(left - spanL) > 3 * dpr) continue; // not line-initial
      const ratio = (right - left + 1) / dpr / sRect.width;
      if (!(ratio > 1.02 && ratio < 1.6)) continue;
      const scaleX = Number(
        /scaleX\(([\d.]+)\)/.exec(span.style.transform)?.[1] ?? 1,
      );
      span.style.transform = `scaleX(${scaleX * ratio})`;
    }
  }, []);

  // One centering scroll + one soft pulse per citation click (`nonce` renews
  // on every click, so re-clicking the same chip re-centers; zoom/page
  // re-renders of the same layer do not).
  const focusedFor = React.useRef<string | null>(null);
  const focusKey = quote
    ? `${docId}:${clampedPage}:${quote}#${active ? active.nonce : "prop"}`
    : null;

  const focusFirstMark = React.useCallback(() => {
    const body = bodyRef.current;
    if (!body || !focusKey || focusedFor.current === focusKey) return;
    const marks = body.querySelectorAll<HTMLElement>(
      'mark[data-testid="citation-highlight"]',
    );
    const first = marks[0];
    if (!first) return;
    focusedFor.current = focusKey;
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const bodyRect = body.getBoundingClientRect();
    const markRect = first.getBoundingClientRect();
    const top =
      body.scrollTop +
      (markRect.top - bodyRect.top) -
      body.clientHeight / 2 +
      markRect.height / 2;
    body.scrollTo({
      top: Math.max(0, top),
      behavior: reduce ? "auto" : "smooth",
    });
    if (reduce) return;
    // single soft emphasis pulse: accent-200 → accent-100 over --duration-slow
    for (const m of marks) {
      m.style.backgroundColor = MARK_PULSE_BG;
    }
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        for (const m of marks) {
          m.style.transition =
            "background-color var(--duration-slow) var(--ease)";
          m.style.backgroundColor = MARK_BG;
        }
      }),
    );
  }, [focusKey]);

  // Re-clicking a chip while the layer is already rendered: the text layer
  // won't re-render (same DOM), so center from here; first paint after open
  // is handled by onRenderTextLayerSuccess below.
  React.useEffect(() => {
    if (spansByItem) focusFirstMark();
  }, [spansByItem, focusFirstMark]);

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
                  renderTextLayer={quote !== null}
                  renderAnnotationLayer={false}
                  customTextRenderer={spansByItem ? renderHighlight : undefined}
                  onGetTextSuccess={({ items }) =>
                    setTextLayer({
                      page: clampedPage,
                      items: items.map((it) => ("str" in it ? it.str : "")),
                    })
                  }
                  onRenderTextLayerSuccess={() => {
                    recalibrateMarks();
                    focusFirstMark();
                  }}
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
