"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import { usePathname } from "next/navigation";
import { Mail, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";

const DISMISS_KEY = "faheem_email_toast_dismissed";
const DELAY_MS = 2000;
const EASE = [0.4, 0, 0.2, 1] as const; // mirrors --ease

// Rise+fade, asymmetric in/out (design brief: 250ms in, 150ms out) — a
// variants map (rather than one `transition` prop) is what lets enter and
// exit carry different durations.
const variants = {
  hidden: { opacity: 0, y: 8, transition: { duration: 0.15, ease: EASE } },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: EASE } },
};

/**
 * Ambient "Faheem lives in your inbox" nudge (enterprise-flourish #1).
 * Mounted once in the (app) layout, alongside the existing DemoPalette/
 * ModeOverlay stage overlays — same "renders nothing until its own condition
 * fires" shape. Shows once per browser session (sessionStorage survives the
 * client-side navigations that keep this component mounted across routes),
 * 2s after the first non-/chat render — the flagship streaming beat never
 * gets upstaged by a toast.
 */
export function EmailToast() {
  const t = useTranslations("shell");
  const pathname = usePathname();
  const onChatRoute = pathname.startsWith("/chat");
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    if (onChatRoute) return;
    if (typeof window === "undefined") return;
    if (window.sessionStorage.getItem(DISMISS_KEY)) return;
    const id = window.setTimeout(() => setVisible(true), DELAY_MS);
    return () => window.clearTimeout(id);
  }, [onChatRoute]);

  function dismiss() {
    setVisible(false);
    window.sessionStorage.setItem(DISMISS_KEY, "1");
  }

  return (
    <AnimatePresence>
      {visible && !onChatRoute && (
        <motion.div
          role="status"
          variants={variants}
          initial="hidden"
          animate="visible"
          exit="hidden"
          className="border-border bg-card shadow-modal rounded-card fixed end-4 bottom-4 z-40 w-[380px] max-w-[calc(100%-2rem)] border p-4"
        >
          <button
            type="button"
            onClick={dismiss}
            aria-label={t("emailToast.dismiss")}
            className="text-text-secondary hover:bg-navy-50 hover:text-navy focus-visible:ring-accent focus-visible:ring-offset-card rounded-btn absolute end-2 top-2 grid size-7 place-items-center transition-colors duration-[var(--duration-fast)] ease-[var(--ease)] outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          >
            <X className="size-4" aria-hidden="true" />
          </button>

          <div className="flex gap-3 pe-6">
            <span
              aria-hidden="true"
              className="bg-accent-50 text-accent-700 rounded-btn grid size-10 shrink-0 place-items-center"
            >
              <Mail className="size-5" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <p className="text-navy text-sm font-bold">
                  {t("emailToast.title")}
                </p>
                <Badge variant="mvp" size="sm">
                  {t("mvpRoadmap")}
                </Badge>
              </div>
              <p className="text-text-secondary mt-1 text-[0.8125rem]">
                {t.rich("emailToast.body", {
                  email: (chunks) => (
                    <bdi dir="ltr" className="text-navy font-medium">
                      {chunks}
                    </bdi>
                  ),
                })}
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
