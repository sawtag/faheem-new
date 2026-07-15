"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import { ShieldCheck } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConnectorAvatar } from "@/components/connections/connector-avatar";
import { CheckDraw } from "@/components/connections/check-draw";
import type { Connector } from "@/lib/connectors";
import type { Lang } from "@/lib/types";

type Stage = "authorize" | "connecting" | "success";

const CONNECTING_MS = 900;
const SUCCESS_MS = 900;

/**
 * Fake OAuth modal (design-briefs §2.3), three internal states: authorize →
 * connecting (~900ms) → success (auto-dismiss ~900ms). `onConnected` fires
 * the moment the success state is entered, so the caller can migrate the row
 * and start the "mint wash" while the modal is still closing.
 */
export function OAuthModal({
  connector,
  open,
  onOpenChange,
  onConnected,
}: {
  connector: Connector | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnected: (id: string) => void;
}) {
  const t = useTranslations("connections");
  const locale = useLocale() as Lang;
  const [stage, setStage] = React.useState<Stage>("authorize");

  // Reset to "authorize" whenever the dialog transitions to open, a render-time
  // state adjustment (not an effect) per React's guidance for resetting state
  // when a prop changes: https://react.dev/learn/you-might-not-need-an-effect
  const [prevOpen, setPrevOpen] = React.useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setStage("authorize");
  }

  // `onConnected`/`onOpenChange` are ordinary (unmemoized) callback props,
  // stash the latest in a ref so the stage-transition effect below only
  // re-runs when the stage itself changes, not on every parent re-render
  // (an unstable dep here previously caused an infinite update loop).
  const callbacksRef = React.useRef({ onConnected, onOpenChange });
  React.useEffect(() => {
    callbacksRef.current = { onConnected, onOpenChange };
  });

  React.useEffect(() => {
    if (!open || !connector) return;
    if (stage === "connecting") {
      const id = setTimeout(() => setStage("success"), CONNECTING_MS);
      return () => clearTimeout(id);
    }
    if (stage === "success") {
      callbacksRef.current.onConnected(connector.id);
      const id = setTimeout(
        () => callbacksRef.current.onOpenChange(false),
        SUCCESS_MS,
      );
      return () => clearTimeout(id);
    }
  }, [open, connector, stage]);

  if (!connector) return null;
  const name = connector.name[locale];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-[420px]"
        showClose={stage === "authorize"}
      >
        <DialogTitle className="sr-only">
          {t("oauth.title", { name })}
        </DialogTitle>
        <AnimatePresence mode="wait">
          {stage === "authorize" && (
            <motion.div
              key="authorize"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col items-center text-center"
            >
              <ConnectorAvatar
                tile={connector.tile}
                label={name}
                className="size-12 text-xl"
              />
              <p
                className="text-h3 text-navy mt-4 font-extrabold"
                aria-hidden="true"
              >
                {t("oauth.title", { name })}
              </p>
              <DialogDescription className="text-sm">
                {t("oauth.scope")}
              </DialogDescription>
              <p className="text-text-secondary mt-5 flex items-center gap-1.5 text-xs font-medium">
                <ShieldCheck
                  className="text-accent size-4 shrink-0"
                  aria-hidden="true"
                />
                {t("oauth.note")}
              </p>
              <div className="mt-6 flex w-full justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onOpenChange(false)}
                >
                  {t("cancel")}
                </Button>
                <Button size="sm" onClick={() => setStage("connecting")}>
                  {t("oauth.authorize")}
                </Button>
              </div>
            </motion.div>
          )}

          {stage === "connecting" && (
            <motion.div
              key="connecting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col items-center py-6 text-center"
            >
              <svg
                viewBox="0 0 24 24"
                className="faheem-spin text-accent size-10"
                fill="none"
                aria-hidden="true"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="9"
                  stroke="currentColor"
                  strokeWidth="3"
                  opacity="0.25"
                />
                <path
                  d="M21 12a9 9 0 0 0-9-9"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </svg>
              <p className="text-navy mt-4 text-sm font-medium">
                {t("oauth.connecting")}
              </p>
            </motion.div>
          )}

          {stage === "success" && (
            <motion.div
              key="success"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col items-center py-6 text-center"
            >
              <CheckDraw size={40} />
              <p className="text-h3 text-navy mt-4 font-extrabold">
                {t("oauth.success")}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
