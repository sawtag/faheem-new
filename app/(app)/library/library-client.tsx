"use client";

import * as React from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import {
  BadgeCheck,
  Download,
  FileText,
  Presentation,
  Search,
  Sheet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/ui/logo";
import { LogoTile } from "@/components/ui/logo-tile";
import { cn, formatDate } from "@/lib/utils";
import type { ArtifactMeta, Lang, Localized } from "@/lib/types";
import { filterArtifacts, type LibraryFilter } from "./filter-artifacts";

const KIND_TILE: Record<
  ArtifactMeta["kind"],
  { icon: typeof Sheet; tile: string }
> = {
  xlsx: { icon: Sheet, tile: "bg-accent-50 text-accent-700" },
  docx: { icon: FileText, tile: "bg-navy-50 text-navy-700" },
  pptx: { icon: Presentation, tile: "bg-warning-50 text-warning-700" },
};

function ArtifactCard({
  artifact,
  workspaceName,
  locale,
}: {
  artifact: ArtifactMeta;
  workspaceName: string;
  locale: Lang;
}) {
  const t = useTranslations("library");
  const { icon: Icon, tile } = KIND_TILE[artifact.kind];

  return (
    <Card hover className="group relative p-5">
      <div className="flex items-start justify-between">
        <span
          className={cn(
            "rounded-btn grid size-10 shrink-0 place-items-center",
            tile,
          )}
        >
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="opacity-0 transition-opacity duration-[var(--duration-fast)] ease-[var(--ease)] group-focus-within:opacity-100 group-hover:opacity-100"
        >
          <a href={artifact.file} download aria-label={t("emptyCta")}>
            <Download className="size-4" aria-hidden="true" />
          </a>
        </Button>
      </div>
      <p className="text-navy mt-3 truncate text-sm font-semibold">
        {artifact.name[locale]}
      </p>
      <p className="text-text-secondary mt-1 flex items-center gap-1.5 text-xs font-medium">
        <LogoTile label={workspaceName} size={16} />
        {workspaceName} · {formatDate(artifact.createdAt, locale)}
      </p>
      {artifact.sources !== undefined && (
        <p className="text-accent-700 mt-2 flex items-center gap-1.5 text-xs font-medium">
          <BadgeCheck className="size-3.5 shrink-0" aria-hidden="true" />
          {t("verified", { n: artifact.sources })}
        </p>
      )}
    </Card>
  );
}

function EmptyState({
  title,
  caption,
  cta,
}: {
  title: string;
  caption: string;
  cta?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <Logo
        variant="icon"
        tone="mono"
        decorative
        size={48}
        className="text-navy-300"
      />
      <div className="flex flex-col gap-1.5">
        <p className="text-navy text-[0.9375rem] font-semibold">{title}</p>
        <p className="text-text-secondary text-[0.8125rem]">{caption}</p>
      </div>
      {cta && (
        <Button asChild size="sm">
          <Link href="/">{cta}</Link>
        </Button>
      )}
    </div>
  );
}

export function LibraryClient({
  artifacts,
  workspaceNames,
}: {
  artifacts: ArtifactMeta[];
  workspaceNames: Record<string, Localized>;
}) {
  const t = useTranslations("library");
  const locale = useLocale() as Lang;
  const [filter, setFilter] = React.useState<LibraryFilter>("all");
  const [query, setQuery] = React.useState("");

  const filters: { value: LibraryFilter; label: string }[] = [
    { value: "all", label: t("filterAll") },
    { value: "docx", label: t("filterIcMemos") },
    { value: "xlsx", label: t("filterModels") },
    { value: "pptx", label: t("filterDecks") },
  ];

  const visible = filterArtifacts(artifacts, filter, query, locale);

  return (
    <>
      <header className="mb-8 flex items-start justify-between gap-6">
        <div>
          <h1 className="text-h1 text-navy font-extrabold">{t("title")}</h1>
          <p className="text-text-secondary mt-2 text-[0.9375rem]">
            {t("subtitle")}
          </p>
        </div>
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("searchPlaceholder")}
          startIcon={<Search className="size-4" aria-hidden="true" />}
          className="max-w-[280px]"
        />
      </header>

      <div className="mb-6 flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter(f.value)}
            className={cn(
              "rounded-pill px-3.5 py-1.5 text-[0.8125rem] font-semibold transition-colors duration-[var(--duration-fast)] ease-[var(--ease)] outline-none",
              f.value === filter
                ? "bg-accent-50 text-accent-700"
                : "bg-card border-border text-text-secondary hover:text-navy border",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        artifacts.length === 0 ? (
          <EmptyState
            title={t("emptyTitle")}
            caption={t("emptyCaption")}
            cta={t("emptyCta")}
          />
        ) : (
          <EmptyState
            title={t("emptyFilteredTitle", {
              type: filters.find((f) => f.value === filter)?.label ?? "",
            })}
            caption={t("emptyCaption")}
          />
        )
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {visible.map((artifact) => (
            <ArtifactCard
              key={artifact.id}
              artifact={artifact}
              workspaceName={
                workspaceNames[artifact.workspace]?.[locale] ??
                artifact.workspace
              }
              locale={locale}
            />
          ))}
        </div>
      )}
    </>
  );
}
