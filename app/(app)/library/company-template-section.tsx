"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { AlertTriangle, FileText, Tags, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDate } from "@/lib/utils";
import type { CompanyTemplateMeta } from "@/lib/company-template";
import type { Lang } from "@/lib/types";

interface TagRow {
  key: string;
  value: string;
}

const ERROR_CODES = ["type", "size", "unreadable"] as const;
type ErrorCode = (typeof ERROR_CODES)[number];

function isErrorCode(x: string): x is ErrorCode {
  return (ERROR_CODES as readonly string[]).includes(x);
}

/**
 * Library page — "Company template" section (below the artifacts grid). No
 * template: dashed upload tile + sample-download / tag-catalog links. With a
 * template: card (fileName, uploadedAt, matched-tags badge, unknown-tag
 * warning) + Replace/Remove. Mirrors CustomAgentsSection's render-time
 * prop-sync convention (router.refresh() after mutations lands here via a
 * fresh `initialMeta`, but a plain state update is enough — this section has
 * no page-level list to reconcile).
 */
export function CompanyTemplateSection({
  initialMeta,
  tagCatalog,
}: {
  initialMeta: CompanyTemplateMeta;
  tagCatalog: TagRow[];
}) {
  const t = useTranslations("library.template");
  const locale = useLocale() as Lang;
  const [meta, setMeta] = React.useState(initialMeta);
  const [uploading, setUploading] = React.useState(false);
  const [removing, setRemoving] = React.useState(false);
  const [error, setError] = React.useState<ErrorCode | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const [prevInitial, setPrevInitial] = React.useState(initialMeta);
  if (initialMeta !== prevInitial) {
    setPrevInitial(initialMeta);
    setMeta(initialMeta);
  }

  async function handleFile(file: File | undefined | null) {
    if (!file || uploading) return;
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/template", {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        const code = data?.error;
        setError(code && isErrorCode(code) ? code : "unreadable");
        return;
      }
      const data = (await res.json()) as { meta: CompanyTemplateMeta };
      setMeta(data.meta);
    } catch {
      setError("unreadable");
    } finally {
      setUploading(false);
    }
  }

  async function handleRemove() {
    if (removing) return;
    setRemoving(true);
    try {
      const res = await fetch("/api/template", { method: "DELETE" });
      if (res.ok) {
        setMeta(null);
        setError(null);
      }
    } catch {
      /* leave the card in place on failure */
    } finally {
      setRemoving(false);
    }
  }

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h3 className="text-h3 text-navy font-extrabold">{t("title")}</h3>
        <span className="text-text-secondary text-[0.8125rem]">
          {t("caption")}
        </span>
      </div>

      {meta ? (
        <Card data-testid="template-card">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3">
              <span className="bg-navy-50 text-navy-700 rounded-btn grid size-10 shrink-0 place-items-center">
                <FileText className="size-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-navy truncate text-sm font-semibold">
                  {meta.fileName}
                </p>
                <p className="text-text-secondary mt-0.5 text-xs">
                  {t("uploadedAt", {
                    date: formatDate(meta.uploadedAt, locale, {
                      withTime: true,
                    }),
                  })}
                </p>
                <div className="mt-2">
                  <Badge variant="mint" size="sm">
                    {t("matched", { n: meta.found.length })}
                  </Badge>
                </div>
                {meta.unknown.length > 0 && (
                  <p className="text-warning-700 mt-2 flex items-start gap-1.5 text-xs font-medium">
                    <AlertTriangle
                      className="mt-0.5 size-3.5 shrink-0"
                      aria-hidden="true"
                    />
                    <span>
                      {t("unknownTags", {
                        tags: meta.unknown
                          .map((tag) => `{{${tag}}}`)
                          .join(", "),
                      })}
                    </span>
                  </p>
                )}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => inputRef.current?.click()}
                loading={uploading}
              >
                {t("replace")}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRemove}
                loading={removing}
                data-testid="template-remove"
              >
                {t("remove")}
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          data-testid="template-upload-tile"
          className="rounded-card border-border text-text-secondary hover:border-navy-300 hover:bg-navy-50/50 hover:text-navy focus-visible:ring-accent focus-visible:ring-offset-bg flex min-h-[7rem] w-full flex-col items-center justify-center gap-2 border border-dashed p-6 text-[0.8125rem] font-semibold transition-colors duration-[var(--duration-fast)] ease-[var(--ease)] outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-55"
        >
          <Upload
            className={uploading ? "faheem-spin size-5" : "size-5"}
            aria-hidden="true"
          />
          {uploading ? t("uploading") : t("uploadTile")}
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        data-testid="template-upload-input"
        className="hidden"
        onChange={(e) => {
          void handleFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      {error && (
        <p
          data-testid="template-error"
          className="text-danger mt-2 flex items-center gap-1.5 text-[0.8125rem] font-medium"
        >
          <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
          {t(`errors.${error}`)}
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-4">
        <a
          href="/templates/sample-ic-template.docx"
          download
          className="text-accent-700 hover:text-accent-800 text-[0.8125rem] font-semibold underline-offset-2 hover:underline"
        >
          {t("sampleLink")}
        </a>
        <button
          type="button"
          onClick={() => setDialogOpen(true)}
          data-testid="template-open-tags"
          className="text-accent-700 hover:text-accent-800 inline-flex items-center gap-1.5 text-[0.8125rem] font-semibold underline-offset-2 outline-none hover:underline"
        >
          <Tags className="size-3.5" aria-hidden="true" />
          {t("tagsLink")}
        </button>
      </div>

      <TagsDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        tagCatalog={tagCatalog}
      />
    </section>
  );
}

function TagsDialog({
  open,
  onOpenChange,
  tagCatalog,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tagCatalog: TagRow[];
}) {
  const t = useTranslations("library.template");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-testid="template-tags-dialog"
        className="max-w-[560px]"
      >
        <DialogTitle>{t("dialogTitle")}</DialogTitle>
        <DialogDescription>{t("dialogHint")}</DialogDescription>
        <div className="border-border mt-4 max-h-[420px] overflow-y-auto rounded-[12px] border">
          <table className="w-full text-start text-[0.8125rem]">
            <thead className="bg-bg text-text-secondary sticky top-0 text-[0.6875rem] font-semibold tracking-[0.04em] uppercase">
              <tr>
                <th className="px-3 py-2 text-start font-semibold">
                  {t("tagColumn")}
                </th>
                <th className="px-3 py-2 text-start font-semibold">
                  {t("valueColumn")}
                </th>
              </tr>
            </thead>
            <tbody>
              {tagCatalog.map((row) => (
                <tr key={row.key} className="border-border border-t">
                  <td className="text-navy px-3 py-2 font-mono text-xs">
                    <bdi dir="ltr">{`{{${row.key}}}`}</bdi>
                  </td>
                  <td className="text-text-secondary px-3 py-2">
                    <bdi dir="ltr">{row.value}</bdi>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
