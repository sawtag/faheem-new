"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { ChevronRight, Folder, Search, SlidersHorizontal } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Toggle } from "@/components/ui/toggle";
import { Tooltip } from "@/components/ui/tooltip";
import { LogoTile } from "@/components/ui/logo-tile";
import { LucideIcon } from "@/components/shell/lucide-icon";
import { ConnectorAvatar } from "@/components/connections/connector-avatar";
import { CONNECTORS } from "@/lib/connectors";
import {
  SOURCE_GROUPS,
  SOURCES,
  sourcesInGroup,
  type SourceGroup,
  type SourceIcon,
} from "@/lib/sources";
import type { Lang } from "@/lib/types";
import { cn } from "@/lib/utils";

const EASE = [0.4, 0, 0.2, 1] as const; // mirrors --ease

/** Group header icons (icon choice is data, never inline elsewhere). */
const GROUP_ICON: Record<SourceGroup, string> = {
  external: "globe",
  broker: "file-chart-column",
  internal: "building-2",
};

/** Bare domain for the tooltip credibility line — no protocol, www, or path. */
function bareDomain(url: string): string {
  return url
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "");
}

/** Curated mini-cluster for the "Manage connectors" row — colorful workplace
 *  glyphs (all connected), overlapped like an avatar stack. */
const MANAGE_PREVIEW_IDS = ["sharepoint", "gdrive", "slack", "gmail"];
const MANAGE_PREVIEW = MANAGE_PREVIEW_IDS.flatMap((id) => {
  const c = CONNECTORS.find((x) => x.id === id);
  return c ? [c] : [];
});

/** Rows that get the folder-scope affordance (a muted folder glyph before the
 *  toggle) — file-store sources the analyst scopes to specific folders. */
const FOLDER_SCOPED = new Set(["sharepoint", "gdrive", "shared-folder"]);

/** Staggered row entrance — capped so the last row never crosses 400ms. */
const rowVariants = {
  hidden: { opacity: 0, y: 4 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.15, ease: EASE, delay: Math.min(i, 7) * 0.035 },
  }),
};

/**
 * The composer's nested "All sources" picker. Level 1 lists the three source
 * groups (master toggle + chevron into a submenu) and a "Manage connectors"
 * shortcut; level 2 opens beside it with a search box and the group's source
 * rows (per-row toggle + hover tooltip). Selection is local, cosmetic state —
 * the composer's load-bearing output never depends on it (same posture as the
 * model-tier selector).
 */
export function SourcePicker() {
  const t = useTranslations("chat.sourcePicker");
  const locale = useLocale() as Lang;
  const tipSide = locale === "ar" ? "left" : "right";

  const [open, setOpen] = React.useState(false);
  const [group, setGroup] = React.useState<SourceGroup | null>(null);
  const [query, setQuery] = React.useState("");
  const [enabled, setEnabled] = React.useState<Record<string, boolean>>(() =>
    Object.fromEntries(SOURCES.map((s) => [s.id, s.defaultOn ?? true])),
  );

  const rootRef = React.useRef<HTMLDivElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);
  // Submenu vertical alignment. The popover always opens upward from the
  // composer, but the composer itself sits anywhere from mid-viewport (home
  // hero) to the bottom edge (docked chat) — so the level-2 flyout grows
  // upward (bottom-aligned with level 1) when there's room above, and flips
  // downward when there isn't. Measured per open, never mid-animation.
  const [dropUp, setDropUp] = React.useState(true);

  const close = React.useCallback(() => {
    setOpen(false);
    setGroup(null);
    setQuery("");
  }, []);

  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node))
        close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  const onCount = SOURCES.filter((s) => enabled[s.id]).length;
  const triggerLabel =
    onCount === SOURCES.length ? t("all") : t("count", { count: onCount });

  const groupOn = (g: SourceGroup) =>
    sourcesInGroup(g).some((s) => enabled[s.id]);

  const setGroupAll = (g: SourceGroup, on: boolean) =>
    setEnabled((prev) => {
      const next = { ...prev };
      for (const s of sourcesInGroup(g)) next[s.id] = on;
      return next;
    });

  // Max rendered submenu height: search row + capped rows list + padding.
  const SUBMENU_MAX_H = 320;

  const openSubmenu = (g: SourceGroup) => {
    const rect = panelRef.current?.getBoundingClientRect();
    setDropUp(!rect || rect.bottom >= SUBMENU_MAX_H + 8);
    setGroup(g);
    setQuery("");
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => (open ? close() : setOpen(true))}
        aria-label={t("trigger")}
        aria-expanded={open}
        className="text-text-secondary hover:bg-navy-50 hover:text-navy focus-visible:ring-accent focus-visible:ring-offset-card rounded-btn inline-flex h-8 items-center gap-1.5 px-2 text-[0.8125rem] font-semibold whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
      >
        <SlidersHorizontal className="size-[18px]" aria-hidden="true" />
        <span className="max-sm:sr-only">{triggerLabel}</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, scale: 0.98, y: 4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 4 }}
            transition={{ duration: 0.15, ease: EASE }}
            className="absolute start-0 bottom-full z-20 mb-2"
          >
            {/* Level 1 — groups + manage connectors */}
            <div className="border-border bg-card shadow-hover rounded-card w-72 border p-2">
              {SOURCE_GROUPS.map((g) => (
                <div
                  key={g}
                  className={cn(
                    "rounded-btn flex items-center gap-2 py-1 ps-1.5 pe-1 transition-colors",
                    group === g ? "bg-navy-50" : "hover:bg-navy-50",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => openSubmenu(g)}
                    className="flex min-w-0 flex-1 items-center gap-2.5 py-1 text-start outline-none"
                    aria-label={t(g)}
                  >
                    <span className="bg-navy-50 text-navy-600 rounded-btn grid size-6 shrink-0 place-items-center">
                      <LucideIcon name={GROUP_ICON[g]} className="size-3.5" />
                    </span>
                    <span className="text-navy flex-1 truncate text-sm font-semibold">
                      {t(g)}
                    </span>
                  </button>
                  <Toggle
                    checked={groupOn(g)}
                    onCheckedChange={(v) => setGroupAll(g, v)}
                    aria-label={t(g)}
                  />
                  <button
                    type="button"
                    onClick={() => openSubmenu(g)}
                    aria-label={t(g)}
                    className="text-text-secondary hover:text-navy rounded-btn grid size-6 shrink-0 place-items-center outline-none"
                  >
                    <ChevronRight
                      className="size-4 rtl:-scale-x-100"
                      aria-hidden="true"
                    />
                  </button>
                </div>
              ))}

              <div className="bg-border my-1.5 h-px" />

              <Link
                href="/connections"
                onClick={close}
                className="rounded-btn hover:bg-navy-50 focus-visible:ring-accent focus-visible:ring-offset-card flex items-center gap-2.5 px-1.5 py-1.5 outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
              >
                <span className="flex shrink-0 items-center">
                  {MANAGE_PREVIEW.map((c, i) => (
                    <ConnectorAvatar
                      key={c.id}
                      tile={c.tile}
                      label={c.name[locale]}
                      size={24}
                      className={cn("ring-card ring-2", i > 0 && "-ms-2")}
                    />
                  ))}
                </span>
                <span className="text-navy flex-1 truncate text-sm font-semibold">
                  {t("manage")}
                </span>
                <ChevronRight
                  className="text-text-secondary size-4 shrink-0 rtl:-scale-x-100"
                  aria-hidden="true"
                />
              </Link>
            </div>

            {/* Level 2 — submenu beside level 1, on the logical end side */}
            <AnimatePresence>
              {group && (
                <motion.div
                  key={group}
                  initial={{ opacity: 0, x: locale === "ar" ? 6 : -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: locale === "ar" ? 6 : -6 }}
                  transition={{ duration: 0.15, ease: EASE }}
                  className={cn(
                    "border-border bg-card shadow-hover rounded-card absolute start-full ms-2 w-72 border p-2",
                    dropUp ? "bottom-0" : "top-0",
                  )}
                >
                  <Submenu
                    group={group}
                    query={query}
                    onQuery={setQuery}
                    enabled={enabled}
                    setEnabled={setEnabled}
                    locale={locale}
                    tipSide={tipSide}
                    searchLabel={t("search")}
                    emptyLabel={t("noMatches")}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Submenu({
  group,
  query,
  onQuery,
  enabled,
  setEnabled,
  locale,
  tipSide,
  searchLabel,
  emptyLabel,
}: {
  group: SourceGroup;
  query: string;
  onQuery: (v: string) => void;
  enabled: Record<string, boolean>;
  setEnabled: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  locale: Lang;
  tipSide: "left" | "right";
  searchLabel: string;
  emptyLabel: string;
}) {
  const q = query.trim().toLowerCase();
  const rows = sourcesInGroup(group).filter(
    (s) => q.length === 0 || s.name[locale].toLowerCase().includes(q),
  );

  return (
    <>
      <div className="relative mb-1.5">
        <span className="text-text-secondary pointer-events-none absolute inset-y-0 start-0 grid w-9 place-items-center">
          <Search className="size-3.5" aria-hidden="true" />
        </span>
        <input
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder={searchLabel}
          aria-label={searchLabel}
          autoFocus
          className="rounded-btn bg-navy-50/60 text-navy placeholder:text-text-secondary/60 focus-visible:ring-accent focus-visible:ring-offset-card h-9 w-full ps-9 pe-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
        />
      </div>

      {rows.length === 0 ? (
        <p className="text-text-secondary px-2 py-4 text-center text-xs">
          {emptyLabel}
        </p>
      ) : (
        <div className="max-h-64 overflow-y-auto">
          {rows.map((s, i) => (
            <motion.div
              key={s.id}
              custom={i}
              variants={rowVariants}
              initial={q.length === 0 ? "hidden" : false}
              animate="show"
            >
              <Tooltip
                side={tipSide}
                content={
                  <span className="block">
                    <span className="font-semibold">{s.name[locale]}</span> —{" "}
                    {s.description[locale]}
                    {s.url && (
                      <span
                        dir="ltr"
                        className="text-card/70 mt-1 block text-[0.6875rem] font-medium"
                      >
                        {bareDomain(s.url)}
                      </span>
                    )}
                  </span>
                }
              >
                <div className="rounded-btn hover:bg-navy-50 flex items-center gap-2.5 px-1.5 py-1.5 transition-colors">
                  <SourceGlyph icon={s.icon} label={s.name[locale]} />
                  <span className="text-navy min-w-0 flex-1 truncate text-sm font-medium">
                    {s.name[locale]}
                  </span>
                  {FOLDER_SCOPED.has(s.id) && (
                    <Folder
                      className="text-text-secondary/60 size-3.5 shrink-0"
                      aria-hidden="true"
                    />
                  )}
                  <Toggle
                    checked={enabled[s.id] ?? true}
                    onCheckedChange={(v) =>
                      setEnabled((prev) => ({ ...prev, [s.id]: v }))
                    }
                    aria-label={s.name[locale]}
                  />
                </div>
              </Tooltip>
            </motion.div>
          ))}
        </div>
      )}
    </>
  );
}

/** 24px source glyph column — monogram tile, lucide tile, or a bare vendored
 *  brand logo (20px, no background — the colorful-glyph look). */
function SourceGlyph({ icon, label }: { icon: SourceIcon; label: string }) {
  if (icon.kind === "monogram") {
    return (
      <LogoTile
        label={label}
        initial={icon.initial}
        tint={icon.tint ?? "navy"}
        size={24}
      />
    );
  }
  if (icon.kind === "image") {
    return (
      <span className="grid size-6 shrink-0 place-items-center">
        <Image
          src={icon.src}
          alt=""
          width={20}
          height={20}
          unoptimized
          className="size-5 object-contain"
        />
      </span>
    );
  }
  return (
    <span className="bg-navy-50 text-navy-600 rounded-btn grid size-6 shrink-0 place-items-center">
      <LucideIcon name={icon.name} className="size-3.5" />
    </span>
  );
}
