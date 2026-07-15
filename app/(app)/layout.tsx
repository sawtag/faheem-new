import { cookies } from "next/headers";
import { AppShell } from "@/components/shell/app-shell";
import { EmailToast } from "@/components/shell/email-toast";
import type { PinnedWorkspace } from "@/components/shell/sidebar";
import { DemoPalette } from "@/components/demo/palette";
import { ModeOverlay } from "@/components/demo/mode-overlay";
import { resolveMode } from "@/lib/ai/mode";
import dealsData from "@/data/deals.json";

/**
 * Authenticated app shell, present on every (app) route. Pinned workspaces are
 * the live (non-declined) deals, in curated demo order; the sidebar links each
 * to its workspace page.
 *
 * P5a: also mounts the two stage-only overlays here (once, for every (app)
 * route), the ⌘K demo palette and the ⌘. mode overlay. Both render nothing
 * until their shortcut is pressed. `initialMode` is resolved server-side
 * (cookie `faheem_mode` > `FAHEEM_MODE` env, lib/ai/mode.ts's `resolveMode`,
 * the same precedence the chat engine itself uses) so the overlay shows the
 * true effective mode on first open, not a client-side guess.
 */
const PIN_ORDER = ["jahez", "darb", "thara-pay"];

function pinnedWorkspaces(): PinnedWorkspace[] {
  return dealsData
    .filter((d) => d.stage !== "declined")
    .map((d) => ({ id: d.id, name: d.name, listing: d.listing }))
    .sort((a, b) => PIN_ORDER.indexOf(a.id) - PIN_ORDER.indexOf(b.id));
}

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const store = await cookies();
  const initialMode = resolveMode(store.get("faheem_mode")?.value);

  return (
    <>
      <AppShell pinned={pinnedWorkspaces()}>{children}</AppShell>
      <DemoPalette />
      <ModeOverlay initialMode={initialMode} />
      {/* enterprise-flourish: ambient inbox nudge, flagged one-line mount */}
      <EmailToast />
    </>
  );
}
