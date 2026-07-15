"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { useLocale } from "next-intl";
import { GlyphBackdrop } from "@/components/ui/glyph-backdrop";
import { Sidebar, type PinnedWorkspace } from "@/components/shell/sidebar";

/**
 * App frame: collapsible sidebar + content region. The content is keyed on the
 * locale so a language switch crossfades (250ms) rather than snapping, the
 * subtle motion the shell brief calls for. Sidebar is sticky/full-height; each
 * page decides its own scroll (the chat page fills the viewport and scrolls
 * its two columns independently).
 *
 * Canvas atmosphere: the growth artwork whispers across every canvas at 4%,
 * viewport-fixed at the bottom so it lives in the gutters around the opaque
 * cards. Home keeps its own stronger hero render (no double paint) and chat
 * routes are excluded (threads put dense cited text straight on the canvas).
 */
export function AppShell({
  pinned,
  children,
}: {
  pinned: PinnedWorkspace[];
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = React.useState(false);
  const locale = useLocale();
  const reduce = useReducedMotion();
  const pathname = usePathname();
  const canvasArt = pathname !== "/" && !pathname.startsWith("/chat");

  return (
    <div className="bg-bg isolate flex min-h-screen">
      {canvasArt && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 -z-10"
        >
          <GlyphBackdrop variant="hero" className="opacity-[0.04]" />
        </div>
      )}
      <Sidebar
        collapsed={collapsed}
        pinned={pinned}
        onToggle={() => setCollapsed((c) => !c)}
      />
      <motion.main
        key={locale}
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
        className="flex min-h-screen min-w-0 flex-1 flex-col"
      >
        {children}
      </motion.main>
    </div>
  );
}
