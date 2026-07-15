"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Folder, PanelLeftClose, PanelLeftOpen, SquarePen } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Logo } from "@/components/ui/logo";
import { Tooltip } from "@/components/ui/tooltip";
import { LucideIcon } from "@/components/shell/lucide-icon";
import { LocaleToggle } from "@/components/shell/locale-toggle";
import { PRIMARY_NAV, SETTINGS_NAV, isActive, type NavItem } from "@/lib/nav";
import type { Lang, Localized } from "@/lib/types";
import { cn } from "@/lib/utils";

export interface PinnedWorkspace {
  id: string;
  name: Localized;
  /** muted market-type suffix on the Projects row, e.g. "Public" / «عام» */
  listing?: Localized;
}

/** Sidebar: logo · New Chat · primary nav · Settings · Pinned · Ali footer. */
export function Sidebar({
  collapsed,
  pinned,
  onToggle,
}: {
  collapsed: boolean;
  pinned: PinnedWorkspace[];
  onToggle: () => void;
}) {
  const t = useTranslations("shell");
  const locale = useLocale() as Lang;
  const pathname = usePathname();
  const tipSide = locale === "ar" ? "left" : "right";

  return (
    <aside
      className={cn(
        // Quiet terminal rail: a near-white navy wash (tokens in globals.css)
        // that deepens toward the foot, separating the rail from the content
        // canvas without shouting. Hairline end border stays the divider.
        "border-border from-sidebar-top to-sidebar-bottom sticky top-0 flex h-screen shrink-0 flex-col border-e bg-gradient-to-b transition-[width] duration-[var(--duration)] ease-[var(--ease)]",
        collapsed ? "w-16" : "w-[260px]",
      )}
    >
      {/* header: logo + collapse toggle */}
      <div
        className={cn(
          "flex h-16 items-center",
          collapsed ? "justify-center px-2" : "justify-between px-4",
        )}
      >
        {!collapsed && (
          <Link
            href="/"
            aria-label="Faheem"
            className="focus-visible:ring-accent focus-visible:ring-offset-card rounded-btn outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          >
            <Logo variant="horizontal" size={26} />
          </Link>
        )}
        <Tooltip
          side={tipSide}
          content={collapsed ? t("expand") : t("collapse")}
        >
          <button
            type="button"
            onClick={onToggle}
            aria-label={collapsed ? t("expand") : t("collapse")}
            className="text-text-secondary hover:bg-navy-50 hover:text-navy focus-visible:ring-accent focus-visible:ring-offset-card rounded-btn grid size-8 shrink-0 place-items-center transition-colors duration-[var(--duration-fast)] ease-[var(--ease)] outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          >
            {collapsed ? (
              <PanelLeftOpen className="size-[18px] rtl:-scale-x-100" />
            ) : (
              <PanelLeftClose className="size-[18px] rtl:-scale-x-100" />
            )}
          </button>
        </Tooltip>
      </div>

      {/* New Chat */}
      <div className={cn("pb-2", collapsed ? "px-2" : "px-3")}>
        <NewChatButton
          collapsed={collapsed}
          label={t("newChat")}
          side={tipSide}
        />
      </div>

      {/* scrollable nav region */}
      <nav className="faheem-scrollbar flex-1 overflow-x-hidden overflow-y-auto px-3 pt-1 pb-4">
        <ul className="flex flex-col gap-0.5">
          {PRIMARY_NAV.map((item) => (
            <NavRow
              key={item.key}
              item={item}
              collapsed={collapsed}
              active={!item.disabled && isActive(item.href, pathname)}
              label={t(`nav.${item.key}`)}
              tooltip={item.tooltipKey ? t(item.tooltipKey) : undefined}
              side={tipSide}
            />
          ))}
        </ul>

        <SectionLabel collapsed={collapsed}>{t("settings")}</SectionLabel>
        <ul className="flex flex-col gap-0.5">
          {SETTINGS_NAV.map((item) => (
            <NavRow
              key={item.key}
              item={item}
              collapsed={collapsed}
              active={isActive(item.href, pathname)}
              label={t(`nav.${item.key}`)}
              side={tipSide}
            />
          ))}
        </ul>

        {pinned.length > 0 && (
          <>
            <SectionLabel collapsed={collapsed}>{t("projects")}</SectionLabel>
            <ul className="flex flex-col gap-0.5">
              {pinned.map((ws) => (
                <ProjectRow
                  key={ws.id}
                  workspace={ws}
                  collapsed={collapsed}
                  active={pathname.startsWith(`/deals/${ws.id}`)}
                  locale={locale}
                  side={tipSide}
                />
              ))}
            </ul>
          </>
        )}
      </nav>

      {/* footer: Ali + firm + language (a touch more tint grounds the rail) */}
      <div className="border-border bg-navy-100/40 border-t p-3">
        <div
          className={cn(
            "flex items-center gap-2.5",
            collapsed && "flex-col gap-2",
          )}
        >
          <Avatar name={t("analyst")} size="md" square />
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="text-navy truncate text-sm font-bold">
                {t("analyst")}
              </p>
              <p className="text-text-secondary truncate text-xs">
                {t("firm")}
              </p>
            </div>
          )}
          <LocaleToggle collapsed={collapsed} />
        </div>
      </div>
    </aside>
  );
}

function NewChatButton({
  collapsed,
  label,
  side,
}: {
  collapsed: boolean;
  label: string;
  side: "left" | "right";
}) {
  const link = (
    <Link
      href="/chat/new"
      className={cn(
        "border-border bg-card text-navy hover:border-navy-300 hover:bg-navy-50 focus-visible:ring-accent focus-visible:ring-offset-card rounded-pill inline-flex h-10 items-center border font-bold shadow-[var(--shadow-card)] transition-colors duration-[var(--duration-fast)] ease-[var(--ease)] outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        collapsed
          ? "w-full justify-center px-0"
          : "w-full justify-center gap-2 px-4 text-[0.9375rem]",
      )}
    >
      <SquarePen className="size-[18px] shrink-0" aria-hidden="true" />
      {!collapsed && <span>{label}</span>}
    </Link>
  );
  return collapsed ? (
    <Tooltip side={side} content={label}>
      {link}
    </Tooltip>
  ) : (
    link
  );
}

function SectionLabel({
  collapsed,
  children,
}: {
  collapsed: boolean;
  children: React.ReactNode;
}) {
  if (collapsed) return <div className="bg-border mx-auto my-3 h-px w-6" />;
  return (
    <p className="text-text-secondary px-2.5 pt-5 pb-1.5 text-[0.6875rem] font-bold tracking-[0.06em] uppercase">
      {children}
    </p>
  );
}

function NavRow({
  item,
  collapsed,
  active,
  label,
  tooltip,
  side,
}: {
  item: NavItem;
  collapsed: boolean;
  active: boolean;
  label: string;
  tooltip?: string;
  side: "left" | "right";
}) {
  const rowClass = cn(
    "flex h-10 items-center rounded-btn text-[0.9375rem] font-semibold transition-colors duration-[var(--duration-fast)] ease-[var(--ease)] outline-none",
    collapsed ? "justify-center px-0" : "gap-3 px-2.5",
    item.disabled
      ? "text-text-secondary/60 cursor-default"
      : active
        ? "bg-navy-50 text-navy-700"
        : "text-text-secondary hover:bg-navy-50 hover:text-navy focus-visible:ring-accent focus-visible:ring-offset-card focus-visible:ring-2 focus-visible:ring-offset-2",
  );

  const inner = (
    <>
      <LucideIcon
        name={item.icon}
        className="size-5 shrink-0"
        strokeWidth={2}
      />
      {!collapsed && <span className="truncate">{label}</span>}
    </>
  );

  const node = item.disabled ? (
    <span className={rowClass} aria-disabled="true">
      {inner}
    </span>
  ) : (
    <Link
      href={item.href}
      className={rowClass}
      aria-current={active ? "page" : undefined}
    >
      {inner}
    </Link>
  );

  // collapsed rows always tooltip their label; disabled rows tooltip the MVP note.
  const tip = collapsed ? (tooltip ? `${label} · ${tooltip}` : label) : tooltip;
  return (
    <li>
      {tip ? (
        <Tooltip side={side} content={tip}>
          {node}
        </Tooltip>
      ) : (
        node
      )}
    </li>
  );
}

/** Projects section row, a deal workspace behind a plain folder icon. */
function ProjectRow({
  workspace,
  collapsed,
  active,
  locale,
  side,
}: {
  workspace: PinnedWorkspace;
  collapsed: boolean;
  active: boolean;
  locale: Lang;
  side: "left" | "right";
}) {
  const name = workspace.name[locale];
  const listing = workspace.listing?.[locale];
  const row = (
    <Link
      href={`/deals/${workspace.id}`}
      aria-current={active ? "page" : undefined}
      className={cn(
        "rounded-btn focus-visible:ring-accent focus-visible:ring-offset-card flex h-10 items-center transition-colors duration-[var(--duration-fast)] ease-[var(--ease)] outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        collapsed ? "justify-center px-0" : "gap-3 px-2.5",
        active
          ? "bg-navy-50 text-navy-700"
          : "text-text-secondary hover:bg-navy-50 hover:text-navy",
      )}
    >
      <Folder className="size-4 shrink-0" aria-hidden="true" />
      {!collapsed && (
        <span className="flex min-w-0 items-baseline gap-1.5">
          <span className="truncate text-[0.9375rem] font-semibold">
            {name}
          </span>
          {listing && (
            <span className="text-text-secondary/70 shrink-0 text-xs font-medium whitespace-nowrap">
              {listing}
            </span>
          )}
        </span>
      )}
    </Link>
  );
  return (
    <li>
      {collapsed ? (
        <Tooltip side={side} content={listing ? `${name} · ${listing}` : name}>
          {row}
        </Tooltip>
      ) : (
        row
      )}
    </li>
  );
}
