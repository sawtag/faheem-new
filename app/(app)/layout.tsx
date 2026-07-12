import { AppShell } from "@/components/shell/app-shell";
import type { PinnedWorkspace } from "@/components/shell/sidebar";
import dealsData from "@/data/deals.json";

/**
 * Authenticated app shell — present on every (app) route. Pinned workspaces are
 * the live (non-declined) deals, in curated demo order; the sidebar links each
 * to its workspace page.
 */
const PIN_ORDER = ["jahez", "darb", "thara-pay"];

function pinnedWorkspaces(): PinnedWorkspace[] {
  return dealsData
    .filter((d) => d.stage !== "declined")
    .map((d) => ({ id: d.id, name: d.name }))
    .sort((a, b) => PIN_ORDER.indexOf(a.id) - PIN_ORDER.indexOf(b.id));
}

export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <AppShell pinned={pinnedWorkspaces()}>{children}</AppShell>;
}
