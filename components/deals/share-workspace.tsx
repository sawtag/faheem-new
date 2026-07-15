"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import { Lock, Share2, Users, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { CheckDraw } from "@/components/connections/check-draw";
import type { Lang, Localized } from "@/lib/types";

type Role = "view" | "comment" | "edit";
const ROLES: Role[] = ["view", "comment", "edit"];
const SUCCESS_MS = 400;

/**
 * Share-workspace dialog (enterprise-flourish #2), reference: the design
 * screenshot pack under context/, swappy-20260709_182820.png (ideas, not
 * layout law).
 * Cosmetic/no-persistence: chips, role, and "shared" state all reset the
 * next time the dialog opens. Mirrors the connections OAuth modal's
 * authorize -> success -> auto-close shape (same CheckDraw wow-detail).
 */
export function ShareWorkspace({ companyName }: { companyName: Localized }) {
  const t = useTranslations("deals.share");
  const tShell = useTranslations("shell");
  const locale = useLocale() as Lang;

  const [open, setOpen] = React.useState(false);
  const [recipient, setRecipient] = React.useState("");
  const [chips, setChips] = React.useState<string[]>([]);
  const [role, setRole] = React.useState<Role>("view");
  const [stage, setStage] = React.useState<"form" | "success">("form");

  // Reset whenever the dialog transitions to open, a render-time state
  // adjustment (React's guidance for resetting state on a prop change),
  // matching the connections OAuth/MCP modals' existing convention.
  const [prevOpen, setPrevOpen] = React.useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setRecipient("");
      setChips([]);
      setRole("view");
      setStage("form");
    }
  }

  React.useEffect(() => {
    if (stage !== "success") return;
    const id = setTimeout(() => setOpen(false), SUCCESS_MS);
    return () => clearTimeout(id);
  }, [stage]);

  function addChip() {
    const value = recipient.trim();
    if (value.length === 0) return;
    setChips((c) => (c.includes(value) ? c : [...c, value]));
    setRecipient("");
  }

  function removeChip(value: string) {
    setChips((c) => c.filter((v) => v !== value));
  }

  function submit() {
    addChip();
    setStage("success");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          startIcon={<Share2 className="size-4" aria-hidden="true" />}
          className="ms-auto shrink-0"
        >
          {t("trigger")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[440px]" showClose={stage === "form"}>
        <AnimatePresence mode="wait">
          {stage === "form" ? (
            <motion.div
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <DialogTitle>
                {t("title", { company: companyName[locale] })}
              </DialogTitle>

              <div className="mt-5 flex items-center gap-2">
                <Input
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addChip();
                    }
                  }}
                  placeholder={t("recipientPlaceholder")}
                  aria-label={t("recipientPlaceholder")}
                  className="flex-1"
                />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="shrink-0">
                      {t(`role.${role}`)}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    {ROLES.map((r) => (
                      <DropdownMenuItem key={r} onSelect={() => setRole(r)}>
                        {t(`role.${r}`)}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {chips.length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-1.5">
                  {chips.map((chip) => (
                    <li key={chip}>
                      <Badge
                        variant="neutral"
                        size="md"
                        className="gap-1.5 pe-1.5"
                      >
                        <bdi dir="ltr">{chip}</bdi>
                        <button
                          type="button"
                          onClick={() => removeChip(chip)}
                          aria-label={t("removeChip", { value: chip })}
                          className="hover:bg-navy-200 rounded-pill grid size-4 place-items-center"
                        >
                          <X className="size-3" aria-hidden="true" />
                        </button>
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}

              <p className="text-text-secondary mt-6 text-[0.6875rem] font-bold tracking-[0.04em] uppercase">
                {t("peopleWithAccess")}
              </p>
              <ul className="border-border divide-border rounded-card mt-2 divide-y border">
                <li className="flex items-center gap-3 px-3.5 py-2.5">
                  <Avatar name={tShell("analyst")} size="sm" square />
                  <p className="text-navy min-w-0 flex-1 truncate text-[0.8125rem] font-semibold">
                    {tShell("analyst")}{" "}
                    <span className="text-text-secondary font-normal">
                      ({t("you")})
                    </span>
                  </p>
                  <span className="text-text-secondary shrink-0 text-xs">
                    {t("owner")}
                  </span>
                </li>
                <li className="flex items-center gap-3 px-3.5 py-2.5">
                  <span
                    aria-hidden="true"
                    className="bg-navy-100 text-navy-700 rounded-pill grid size-8 shrink-0 place-items-center"
                  >
                    <Users className="size-4" />
                  </span>
                  <p className="text-navy min-w-0 flex-1 truncate text-[0.8125rem] font-semibold">
                    {t("group")}
                  </p>
                  <span className="text-text-secondary shrink-0 text-xs">
                    {t("role.view")}
                  </span>
                </li>
              </ul>

              <div className="border-border mt-6 flex items-center justify-between gap-3 border-t pt-4">
                <p className="text-text-secondary flex items-center gap-1.5 text-[0.75rem]">
                  <Lock className="size-3.5 shrink-0" aria-hidden="true" />
                  {t("footerCaption")}
                </p>
                <Button size="sm" onClick={submit} className="shrink-0">
                  {t("submit")}
                </Button>
              </div>
            </motion.div>
          ) : (
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
                {t("success")}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
