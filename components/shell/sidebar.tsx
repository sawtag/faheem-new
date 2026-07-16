"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { motion } from "motion/react";
import {
  Folder,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  SquarePen,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { GlyphBackdrop } from "@/components/ui/glyph-backdrop";
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
        // Elevated rail: a whisper white → navy-50 wash, hairline end border,
        // and a soft symmetric glow (only the end edge shows) so the sidebar
        // reads as a raised surface beside the content, not a colored column.
        "border-border from-card to-navy-50 sticky top-0 isolate flex h-screen shrink-0 flex-col border-e bg-gradient-to-b shadow-[var(--shadow-rail)] transition-[width] duration-[var(--duration)] ease-[var(--ease)]",
        collapsed ? "w-16" : "w-[260px]",
      )}
    >
      {/* brand moment: the growth artwork whispers behind the footer (3%) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-64 overflow-hidden"
      >
        <GlyphBackdrop variant="hero" className="opacity-[0.03]" />
      </div>
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
            <Logo
              variant={locale === "ar" ? "horizontal-ar" : "horizontal"}
              size={26}
            />
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

      {/* footer: Ali + firm + language, a grounded band over the brand moment */}
      <div className="border-border bg-navy-100/50 border-t p-3">
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
          <SignOutButton label={t("signOut")} side={tipSide} />
        </div>
      </div>
    </aside>
  );
}

/** Expires the session cookie via DELETE /api/auth; the proxy gate then owns /login. */
function SignOutButton({
  label,
  side,
}: {
  label: string;
  side: "left" | "right";
}) {
  const router = useRouter();
  const [leaving, setLeaving] = React.useState(false);

  async function signOut() {
    if (leaving) return;
    setLeaving(true);
    try {
      await fetch("/api/auth", { method: "DELETE" });
      router.push("/login");
      router.refresh();
    } finally {
      setLeaving(false);
    }
  }

  return (
    <Tooltip side={side} content={label}>
      <button
        type="button"
        onClick={signOut}
        aria-label={label}
        disabled={leaving}
        className="text-text-secondary hover:bg-navy-50 hover:text-navy focus-visible:ring-accent focus-visible:ring-offset-card rounded-btn grid size-8 shrink-0 place-items-center transition-colors duration-[var(--duration-fast)] ease-[var(--ease)] outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50"
      >
        <LogOut className="size-4 rtl:-scale-x-100" aria-hidden="true" />
      </button>
    </Tooltip>
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
        // the rail's single color anchor: filled emerald CTA with a hover lift
        "bg-accent text-card hover:bg-accent-600 focus-visible:ring-accent focus-visible:ring-offset-card rounded-pill inline-flex h-10 items-center font-bold shadow-[var(--shadow-card)] transition-[background-color,box-shadow,transform] duration-[var(--duration-fast)] ease-[var(--ease)] outline-none hover:-translate-y-px hover:shadow-[var(--shadow-hover)] focus-visible:ring-2 focus-visible:ring-offset-2",
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

/** 3px emerald indicator on the logical start edge of the active row. */
function ActiveBar() {
  return (
    <motion.span
      aria-hidden="true"
      initial={{ opacity: 0, scaleY: 0.4 }}
      animate={{ opacity: 1, scaleY: 1 }}
      transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
      className="bg-accent rounded-pill absolute start-0 top-1/2 h-5 w-[3px] -translate-y-1/2"
    />
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
    <p className="text-navy-500 px-2.5 pt-5 pb-1.5 text-[0.65rem] font-bold tracking-[0.09em] uppercase">
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
    "group relative flex h-10 items-center rounded-btn text-[0.9375rem] font-semibold transition-colors duration-[var(--duration-fast)] ease-[var(--ease)] outline-none",
    collapsed ? "justify-center px-0" : "gap-3 px-2.5",
    item.disabled
      ? "text-text-secondary/60 cursor-default"
      : active
        ? "bg-accent-50 text-navy-900"
        : "text-text-secondary hover:bg-navy-50 hover:text-navy focus-visible:ring-accent focus-visible:ring-offset-card focus-visible:ring-2 focus-visible:ring-offset-2",
  );

  const inner = (
    <>
      {active && <ActiveBar />}
      <LucideIcon
        name={item.icon}
        className={cn(
          "size-5 shrink-0 transition-transform duration-[var(--duration-fast)] ease-[var(--ease)]",
          active
            ? "text-accent"
            : "group-hover:translate-x-px rtl:group-hover:-translate-x-px",
        )}
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
        "group rounded-btn focus-visible:ring-accent focus-visible:ring-offset-card relative flex h-10 items-center transition-colors duration-[var(--duration-fast)] ease-[var(--ease)] outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        collapsed ? "justify-center px-0" : "gap-3 px-2.5",
        active
          ? "bg-accent-50 text-navy-900"
          : "text-text-secondary hover:bg-navy-50 hover:text-navy",
      )}
    >
      {active && <ActiveBar />}
      <Folder
        className={cn(
          "size-4 shrink-0 transition-[color,transform] duration-[var(--duration-fast)] ease-[var(--ease)]",
          active
            ? "text-accent"
            : "group-hover:text-accent group-hover:translate-x-px rtl:group-hover:-translate-x-px",
        )}
        aria-hidden="true"
      />
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
