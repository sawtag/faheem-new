"use client";

import * as React from "react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, formatDate } from "@/lib/utils";
import { KIND_TILE } from "@/components/generate/file-card";
import { previewSpec } from "@/components/generate/preview";
import type { ArtifactMeta, Lang } from "@/lib/types";

const EASE = [0.4, 0, 0.2, 1] as const;

const ICON_BTN =
  "text-text-secondary hover:bg-navy-50 hover:text-navy focus-visible:ring-accent focus-visible:ring-offset-card rounded-btn grid size-8 shrink-0 place-items-center transition-colors duration-[var(--duration-fast)] ease-[var(--ease)] outline-none focus-visible:ring-2 focus-visible:ring-offset-2";

/**
 * In-app artifact preview (the deliverables beat's money moment): a slide-over
 * panel — same slide-in family as the chat PdfPanel aside — that opens the
 * generated deck/memo/model INSIDE Faheem. pptx = thumbnail rail + canvas with
 * a 150ms crossfade and arrow-key navigation; docx = stacked pages; xlsx =
 * Cover sheet + open-in-Excel CTA. Renders the pre-built PNGs from
 * public/artifacts/previews/ (scripts/render-artifact-previews.ts — rendered
 * from the same deterministic builders the generate route runs); if an image
 * 404s the body falls back to a file tile + download, never a broken image.
 */
export function ArtifactPreview({
  meta,
  onClose,
}: {
  meta: ArtifactMeta | null;
  onClose: () => void;
}) {
  return (
    <AnimatePresence mode="wait">
      {meta && <PreviewPanel key={meta.id} meta={meta} onClose={onClose} />}
    </AnimatePresence>
  );
}

function PreviewPanel({
  meta,
  onClose,
}: {
  meta: ArtifactMeta;
  onClose: () => void;
}) {
  const t = useTranslations("generate.preview");
  const locale = useLocale() as Lang;
  const reduce = useReducedMotion();
  const spec = previewSpec(meta.kind);
  const { icon: Icon, tile } = KIND_TILE[meta.kind];

  const [active, setActive] = React.useState(0);
  const [failed, setFailed] = React.useState(false);
  const fail = React.useCallback(() => setFailed(true), []);

  const rootRef = React.useRef<HTMLElement>(null);
  React.useEffect(() => {
    rootRef.current?.focus({ preventScroll: true });
  }, []);

  const last = spec.images.length - 1;
  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }
    if (spec.layout !== "slides" || failed) return;
    const rtl = locale === "ar";
    const nextKey = rtl ? "ArrowLeft" : "ArrowRight";
    const prevKey = rtl ? "ArrowRight" : "ArrowLeft";
    if (event.key === "ArrowDown" || event.key === nextKey) {
      event.preventDefault();
      setActive((i) => Math.min(i + 1, last));
    } else if (event.key === "ArrowUp" || event.key === prevKey) {
      event.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    }
  }

  const slideFrom = locale === "ar" ? -28 : 28;

  return (
    <motion.aside
      ref={rootRef}
      initial={reduce ? false : { opacity: 0, x: slideFrom }}
      animate={{ opacity: 1, x: 0 }}
      exit={reduce ? undefined : { opacity: 0, x: slideFrom }}
      transition={{ duration: 0.25, ease: EASE }}
      role="dialog"
      aria-label={meta.name[locale]}
      data-testid="artifact-preview"
      tabIndex={-1}
      onKeyDown={onKeyDown}
      className="border-border bg-card fixed inset-y-0 end-0 z-40 flex w-[52%] max-w-[880px] min-w-[480px] flex-col border-s shadow-[var(--shadow-modal)] outline-none"
    >
      {/* header: kind tile + bilingual name + provenance caption + actions */}
      <div className="border-border flex h-16 shrink-0 items-center gap-3 border-b px-4">
        <span
          className={cn(
            "rounded-btn grid size-9 shrink-0 place-items-center",
            tile,
          )}
        >
          <Icon className="size-4.5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-navy truncate text-sm font-bold">
            {meta.name[locale]}
          </p>
          <p className="text-text-secondary truncate text-xs">
            {t("caption", { date: formatDate(meta.createdAt, locale) })}
          </p>
        </div>
        <div className="flex items-center gap-0.5">
          <a
            href={meta.file}
            download
            aria-label={t("downloadFile")}
            title={t("downloadFile")}
            className={ICON_BTN}
          >
            <Download className="size-4" aria-hidden="true" />
          </a>
          <span className="bg-border mx-1 h-5 w-px" aria-hidden="true" />
          <button
            type="button"
            onClick={onClose}
            aria-label={t("close")}
            title={t("close")}
            className={ICON_BTN}
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {meta.companyTemplate ? (
        // The static preview PNGs render the BUILT-IN memo layout; a company-
        // template memo would be misrepresented by them — say so honestly.
        <Fallback meta={meta} template />
      ) : failed ? (
        <Fallback meta={meta} />
      ) : spec.layout === "slides" ? (
        <div className="flex min-h-0 flex-1">
          {/* thumbnail rail — inline-start, all slides, staggered reveal */}
          <div
            aria-label={t("slides")}
            className="border-border bg-bg w-[104px] shrink-0 overflow-y-auto border-e p-2"
          >
            <ol className="flex flex-col gap-2">
              {spec.images.map((src, i) => (
                <li key={src}>
                  <motion.button
                    initial={reduce ? false : { opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.2,
                      ease: EASE,
                      delay: Math.min(i, 8) * 0.035,
                    }}
                    type="button"
                    onClick={() => setActive(i)}
                    aria-label={t("slideThumb", { n: i + 1 })}
                    aria-current={i === active ? "true" : undefined}
                    className={cn(
                      "focus-visible:ring-accent block w-full cursor-pointer overflow-hidden rounded-[6px] border transition-colors duration-[var(--duration-fast)] ease-[var(--ease)] outline-none focus-visible:ring-2",
                      i === active
                        ? "border-accent ring-accent ring-1"
                        : "border-border hover:border-navy-300",
                    )}
                  >
                    <Image
                      src={src}
                      alt=""
                      width={spec.width}
                      height={spec.height}
                      unoptimized
                      onError={fail}
                      className="block h-auto w-full"
                    />
                  </motion.button>
                </li>
              ))}
            </ol>
          </div>

          {/* canvas — active slide on a shadow-card frame, 150ms crossfade */}
          <div className="bg-navy-50/40 flex min-w-0 flex-1 flex-col">
            <div className="relative min-h-0 flex-1">
              <AnimatePresence initial={false}>
                <motion.div
                  key={active}
                  initial={reduce ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15, ease: EASE }}
                  className="absolute inset-0 grid place-items-center p-6"
                >
                  <Image
                    src={spec.images[active]!}
                    alt={t("slideOf", { n: active + 1, total: last + 1 })}
                    width={spec.width}
                    height={spec.height}
                    unoptimized
                    priority
                    onError={fail}
                    className="shadow-card h-auto max-h-full w-auto max-w-full rounded-[4px]"
                  />
                </motion.div>
              </AnimatePresence>
            </div>
            <div className="flex h-10 shrink-0 items-center justify-center">
              <span className="text-text-secondary financial text-xs font-semibold">
                {t("slideOf", { n: active + 1, total: last + 1 })}
              </span>
            </div>
          </div>
        </div>
      ) : spec.layout === "pages" ? (
        <div className="bg-navy-50/40 min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto flex max-w-[720px] flex-col gap-6 p-6">
            {spec.images.map((src, i) => (
              <motion.figure
                key={src}
                initial={reduce ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.2,
                  ease: EASE,
                  delay: Math.min(i, 8) * 0.035,
                }}
              >
                <Image
                  src={src}
                  alt={t("pageOf", { n: i + 1, total: spec.images.length })}
                  width={spec.width}
                  height={spec.height}
                  unoptimized
                  onError={fail}
                  className="shadow-card block h-auto w-full rounded-[4px]"
                />
                <figcaption className="text-text-secondary financial mt-2 text-center text-xs font-medium">
                  {t("pageOf", { n: i + 1, total: spec.images.length })}
                </figcaption>
              </motion.figure>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-navy-50/40 min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto flex max-w-[720px] flex-col items-center gap-5 p-6">
            <Image
              src={spec.images[0]!}
              alt={meta.name[locale]}
              width={spec.width}
              height={spec.height}
              unoptimized
              onError={fail}
              className="shadow-card block h-auto w-full rounded-[4px]"
            />
            <p className="text-text-secondary max-w-[420px] text-center text-[0.8125rem]">
              {t("modelCaption")}
            </p>
            <Button
              asChild
              size="sm"
              variant="outline"
              startIcon={<Download className="size-4" aria-hidden="true" />}
            >
              <a href={meta.file} download>
                {t("openInExcel")}
              </a>
            </Button>
          </div>
        </div>
      )}
    </motion.aside>
  );
}

/** A preview PNG failed to load — quiet file-tile fallback, never a broken image. */
function Fallback({
  meta,
  template,
}: {
  meta: ArtifactMeta;
  /** company-template memo: the download is right, the static preview would not be */
  template?: boolean;
}) {
  const t = useTranslations("generate");
  const { icon: Icon, tile } = KIND_TILE[meta.kind];

  return (
    <div
      data-testid={template ? "preview-company-template" : undefined}
      className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center"
    >
      <span
        className={cn("rounded-card grid size-14 place-items-center", tile)}
      >
        <Icon className="size-6" aria-hidden="true" />
      </span>
      <div>
        <p className="text-navy text-sm font-semibold">
          {t(template ? "preview.templateTitle" : "preview.fallbackTitle")}
        </p>
        <p className="text-text-secondary mt-1 text-xs">
          {t(template ? "preview.templateCaption" : "preview.fallbackCaption")}
        </p>
      </div>
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
    </div>
  );
}
