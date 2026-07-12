"use client";

import * as React from "react";
import { motion, useReducedMotion } from "motion/react";
import { useLocale } from "next-intl";
import { Sidebar, type PinnedWorkspace } from "@/components/shell/sidebar";

/**
 * App frame: collapsible sidebar + content region. The content is keyed on the
 * locale so a language switch crossfades (250ms) rather than snapping — the
 * subtle motion the shell brief calls for. Sidebar is sticky/full-height; each
 * page decides its own scroll (the chat page fills the viewport and scrolls
 * its two columns independently).
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

  return (
    <div className="bg-bg flex min-h-screen">
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
