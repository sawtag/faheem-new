"use client";

import * as React from "react";
import {
  AlertCircle,
  FileText,
  Loader2,
  RotateCw,
  Upload,
  X,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { postUpload, precheckPdf } from "@/lib/upload-client";
import { cn } from "@/lib/utils";
import type { CorpusDoc, Lang } from "@/lib/types";

const TYPE_VARIANT: Record<
  CorpusDoc["type"],
  NonNullable<BadgeProps["variant"]>
> = {
  public: "neutral",
  lunar: "mvp",
  deal: "mint",
};

/** A Documents-tab upload in flight (spinner row) or failed (danger row). */
interface PendingUpload {
  tempId: string;
  filename: string;
  file: File;
  status: "uploading" | "error";
  message?: string;
}

/**
 * The workspace document room, corpus docs scoped to this company plus the
 * Lunar mandate docs and the market packs. A quiet dashed drop-zone at the top
 * accepts a judge-supplied PDF into this workspace's sources (same engine, same
 * viewer). "Open" deep-links the PdfPanel to page 1.
 */
export function DocumentsTab({
  docs,
  onOpen,
}: {
  docs: CorpusDoc[];
  onOpen: (docId: string) => void;
}) {
  const t = useTranslations("deals.documents");
  const tu = useTranslations("upload");
  const locale = useLocale() as Lang;

  // The only workspace-scoped docs in a filtered set belong to THIS company,
  // so the first doc carrying a workspace names it (no extra prop needed).
  const workspace = docs.find((d) => d.workspace)?.workspace;

  const [uploaded, setUploaded] = React.useState<CorpusDoc[]>([]);
  const [pending, setPending] = React.useState<PendingUpload[]>([]);
  const [dragging, setDragging] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  async function runUpload(file: File, tempId: string) {
    const result = await postUpload(file, { lang: locale, workspace });
    if (result.ok) {
      const { doc } = result;
      setUploaded((prev) =>
        prev.some((d) => d.id === doc.id) ? prev : [doc, ...prev],
      );
      setPending((prev) => prev.filter((p) => p.tempId !== tempId));
    } else {
      setPending((prev) =>
        prev.map((p) =>
          p.tempId === tempId
            ? { ...p, status: "error", message: result.error ?? tu("failed") }
            : p,
        ),
      );
    }
  }

  function addFiles(list: FileList | null) {
    if (!list) return;
    for (const file of Array.from(list)) {
      const tempId = crypto.randomUUID();
      const code = precheckPdf(file);
      if (code) {
        setPending((prev) => [
          ...prev,
          {
            tempId,
            filename: file.name,
            file,
            status: "error",
            message: tu(code),
          },
        ]);
        continue;
      }
      setPending((prev) => [
        ...prev,
        { tempId, filename: file.name, file, status: "uploading" },
      ]);
      void runUpload(file, tempId);
    }
  }

  function retryUpload(tempId: string) {
    const p = pending.find((x) => x.tempId === tempId);
    if (!p) return;
    setPending((prev) =>
      prev.map((x) =>
        x.tempId === tempId
          ? { ...x, status: "uploading", message: undefined }
          : x,
      ),
    );
    void runUpload(p.file, tempId);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* quiet drop-zone, click or drag a PDF into this workspace's sources */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          addFiles(e.dataTransfer.files);
        }}
        className={cn(
          "rounded-card flex w-full items-center gap-3 border border-dashed px-5 py-4 text-start transition-colors duration-[var(--duration-fast)] ease-[var(--ease)] outline-none",
          "focus-visible:ring-accent focus-visible:ring-offset-bg focus-visible:ring-2 focus-visible:ring-offset-2",
          dragging
            ? "border-accent bg-accent-50/40"
            : "border-border hover:border-navy-300 hover:bg-navy-50/40",
        )}
      >
        <span className="bg-navy-50 text-navy-600 rounded-btn grid size-9 shrink-0 place-items-center">
          <Upload className="size-4" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-navy text-sm font-semibold">{tu("dropzone")}</p>
          <p className="text-text-secondary mt-0.5 text-xs">
            {tu("dropzoneHint")}
          </p>
        </div>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        multiple
        data-testid="documents-file-input"
        className="hidden"
        onChange={(e) => {
          addFiles(e.target.files);
          e.target.value = "";
        }}
      />

      {/* uploaded this session (+ in-flight / failed) */}
      {(uploaded.length > 0 || pending.length > 0) && (
        <Card padding="none" elevated>
          <ul>
            {pending.map((p, i) => {
              const error = p.status === "error";
              return (
                <li
                  key={p.tempId}
                  data-testid="upload-pending-row"
                  className={cn(
                    "flex items-center gap-3 px-5 py-3.5",
                    (i < pending.length - 1 || uploaded.length > 0) &&
                      "border-border border-b",
                  )}
                >
                  <span
                    className={cn(
                      "rounded-btn grid size-9 shrink-0 place-items-center",
                      error
                        ? "bg-danger-50 text-danger-700"
                        : "bg-navy-50 text-navy-600",
                    )}
                  >
                    {error ? (
                      <AlertCircle className="size-4" aria-hidden="true" />
                    ) : (
                      <Loader2
                        className="faheem-spin size-4"
                        aria-hidden="true"
                      />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-navy truncate text-sm font-semibold">
                      {p.filename}
                    </p>
                    <p
                      className={cn(
                        "mt-0.5 truncate text-xs",
                        error ? "text-danger-700" : "text-text-secondary",
                      )}
                    >
                      {error ? p.message : tu("uploading")}
                    </p>
                  </div>
                  {error && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => retryUpload(p.tempId)}
                      >
                        <RotateCw className="size-3.5" aria-hidden="true" />
                        {tu("retry")}
                      </Button>
                      <button
                        type="button"
                        onClick={() =>
                          setPending((prev) =>
                            prev.filter((x) => x.tempId !== p.tempId),
                          )
                        }
                        aria-label={tu("dismiss")}
                        className="text-text-secondary hover:bg-navy-50 hover:text-navy rounded-btn grid size-8 shrink-0 place-items-center"
                      >
                        <X className="size-4" aria-hidden="true" />
                      </button>
                    </>
                  )}
                </li>
              );
            })}
            {uploaded.map((doc, i) => (
              <li
                key={doc.id}
                data-testid="uploaded-doc-row"
                className={cn(
                  "hover:bg-navy-50/50 flex items-center gap-3 px-5 py-3.5 transition-colors duration-[var(--duration-fast)] ease-[var(--ease)]",
                  i < uploaded.length - 1 && "border-border border-b",
                )}
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
                <Badge variant="mint" size="sm">
                  {tu("badge")}
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onOpen(doc.id)}
                >
                  {t("open")}
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* verified corpus docs */}
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
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpen(doc.id)}
              >
                {t("open")}
              </Button>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
