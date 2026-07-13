/**
 * Sidebar navigation model (T2.2). Routes + lucide icon names live here as DATA
 * (AGENTS.md asset/icon policy — never pick an entity's icon inline in JSX).
 * Labels resolve via next-intl under the "shell.nav" namespace; the shell
 * renders lucide icons from `icon` through the kebab→component resolver.
 */

export interface NavItem {
  /** i18n key under `shell.nav.*` */
  key: string;
  href: string;
  /** lucide icon name (kebab-case), resolved by iconFor() */
  icon: string;
  /** visual-only entry (Scheduled Tasks) — rendered dimmed, not linked */
  disabled?: boolean;
  /** i18n key under `shell.*` for the disabled-item tooltip */
  tooltipKey?: string;
}

/** Primary nav — the demo's load-bearing routes + one visual-only teaser. */
export const PRIMARY_NAV: NavItem[] = [
  { key: "home", href: "/", icon: "house" },
  { key: "dashboard", href: "/dashboard", icon: "layout-dashboard" },
  { key: "deals", href: "/deals", icon: "briefcase-business" },
  { key: "ic", href: "/ic", icon: "scale" },
  { key: "library", href: "/library", icon: "library-big" },
  { key: "agents", href: "/agents", icon: "bot" },
  { key: "skills", href: "/skills", icon: "wand-sparkles" },
  { key: "scheduled", href: "/scheduled", icon: "calendar-clock" },
];

/** Settings group — governance + integrations. */
export const SETTINGS_NAV: NavItem[] = [
  { key: "connections", href: "/connections", icon: "link-2" },
  { key: "audit", href: "/audit", icon: "scroll-text" },
];

/** Is `href` the active route for the current pathname (prefix match, exact for "/"). */
export function isActive(href: string, pathname: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}
