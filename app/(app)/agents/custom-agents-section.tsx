"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { AnimatePresence, motion } from "motion/react";
import { Bot, CircleAlert, Plus, Sparkles, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { CustomAgent, Lang } from "@/lib/types";

const EASE = [0.4, 0, 0.2, 1] as const; // mirrors --ease

const NAME_MIN = 2;
const NAME_MAX = 60;
const ROLE_MIN = 2;
const ROLE_MAX = 80;
const DESC_MIN = 10;
const DESC_MAX = 2000;

/**
 * User-created agents section (final block on the Agents page, after the
 * last human-gate marker). Custom agents are deliberately outside the
 * AGENT_IDS/@-mention protocol: a standalone roster, not wired into
 * orchestration (see lib/types.ts CustomAgentSchema doc comment).
 */
export function CustomAgentsSection({
  initialAgents,
}: {
  initialAgents: CustomAgent[];
}) {
  const t = useTranslations("agents");
  const router = useRouter();
  const [agents, setAgents] = React.useState(initialAgents);
  const [dialogOpen, setDialogOpen] = React.useState(false);

  // Sync local state when the server list changes (router.refresh() after a
  // create/delete round-trip), a render-time prop adjustment, same
  // convention as DraftToIc/AddAgentDialog's open-tracking below, not an
  // effect (avoids the extra cascading render).
  const [prevInitial, setPrevInitial] = React.useState(initialAgents);
  if (initialAgents !== prevInitial) {
    setPrevInitial(initialAgents);
    setAgents(initialAgents);
  }

  function handleCreated(agent: CustomAgent) {
    setAgents((prev) => [...prev, agent]);
    setDialogOpen(false);
    router.refresh();
  }

  function handleDeleted(id: string) {
    setAgents((prev) => prev.filter((a) => a.id !== id));
    router.refresh();
  }

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h3 className="text-h3 text-navy font-extrabold">{t("customTitle")}</h3>
        <span className="text-text-secondary text-[0.8125rem]">
          {t("customCaption")}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {agents.map((agent) => (
          <CustomAgentCard
            key={agent.id}
            agent={agent}
            onDeleted={() => handleDeleted(agent.id)}
          />
        ))}
        <AddAgentTile
          label={t("addAgent")}
          onClick={() => setDialogOpen(true)}
        />
      </div>
      <AddAgentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreated={handleCreated}
      />
    </section>
  );
}

function CustomAgentCard({
  agent,
  onDeleted,
}: {
  agent: CustomAgent;
  onDeleted: () => void;
}) {
  const t = useTranslations("agents");
  const [deleting, setDeleting] = React.useState(false);

  async function handleDelete() {
    if (deleting) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/agents", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: agent.id }),
      });
      if (res.ok) {
        onDeleted();
        return;
      }
    } catch {
      /* leave the card in place on failure */
    }
    setDeleting(false);
  }

  return (
    <Card hover data-testid={`agent-card-${agent.id}`}>
      <div className="flex items-start justify-between">
        <span className="bg-accent-50 text-accent-700 rounded-btn grid size-9 shrink-0 place-items-center">
          <Bot className="size-4.5" aria-hidden="true" />
        </span>
        <Tooltip content={t("deleteAgent")}>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            aria-label={t("deleteAgent")}
            data-testid={`custom-agent-delete-${agent.id}`}
            className="text-text-secondary hover:bg-danger-50 hover:text-danger focus-visible:ring-accent focus-visible:ring-offset-card rounded-btn grid size-8 shrink-0 place-items-center transition-colors duration-[var(--duration-fast)] ease-[var(--ease)] outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-55"
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </button>
        </Tooltip>
      </div>
      <div className="mt-3 flex flex-col gap-3">
        <div className="flex flex-col gap-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-navy text-[0.9375rem] font-bold">
              {agent.name}
            </span>
            <Badge size="sm">{t("customBadge")}</Badge>
          </div>
          <span className="text-text-secondary text-xs font-medium">
            {agent.role}
          </span>
        </div>
        <p className="text-text-secondary line-clamp-3 text-[0.8125rem] font-medium">
          {agent.description}
        </p>
      </div>
    </Card>
  );
}

function AddAgentTile({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid="add-agent-tile"
      className="rounded-card border-border text-text-secondary hover:border-navy-300 hover:bg-navy-50/50 hover:text-navy focus-visible:ring-accent focus-visible:ring-offset-bg flex min-h-[9.5rem] flex-col items-center justify-center gap-2 border border-dashed p-6 text-[0.8125rem] font-semibold transition-colors duration-[var(--duration-fast)] ease-[var(--ease)] outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
    >
      <Plus className="size-5" aria-hidden="true" />
      {label}
    </button>
  );
}

function AddAgentDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (agent: CustomAgent) => void;
}) {
  const t = useTranslations("agents");
  const locale = useLocale() as Lang;

  const [name, setName] = React.useState("");
  const [role, setRole] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [enhancing, setEnhancing] = React.useState(false);
  const [enhanced, setEnhanced] = React.useState(false);
  const prevDescription = React.useRef("");
  const [creating, setCreating] = React.useState(false);
  const [error, setError] = React.useState(false);

  // Reset the form every time the dialog opens (render-time state
  // adjustment, same convention as DraftToIc / ShareWorkspace); edits never
  // leak between opens.
  const [prevOpen, setPrevOpen] = React.useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setName("");
      setRole("");
      setDescription("");
      setEnhancing(false);
      setEnhanced(false);
      setCreating(false);
      setError(false);
    }
  }

  const nameValid =
    name.trim().length >= NAME_MIN && name.trim().length <= NAME_MAX;
  const roleValid =
    role.trim().length >= ROLE_MIN && role.trim().length <= ROLE_MAX;
  const descValid =
    description.trim().length >= DESC_MIN &&
    description.trim().length <= DESC_MAX;
  const canCreate = nameValid && roleValid && descValid && !creating;
  const hasDescription = description.trim().length > 0;

  async function enhance() {
    const d = description.trim();
    if (!d || enhancing) return;
    setEnhancing(true);
    try {
      const res = await fetch("/api/agents/enhance", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          description: d,
          name: name.trim() || undefined,
          role: role.trim() || undefined,
          lang: locale,
        }),
      });
      const data = (await res.json()) as { enhanced?: unknown };
      if (typeof data.enhanced === "string" && data.enhanced.trim()) {
        prevDescription.current = description;
        setDescription(data.enhanced);
        setEnhanced(true);
      }
    } catch {
      /* keep the original description on failure */
    } finally {
      setEnhancing(false);
    }
  }

  function undo() {
    setDescription(prevDescription.current);
    setEnhanced(false);
  }

  async function create() {
    if (!canCreate) return;
    setCreating(true);
    setError(false);
    try {
      const res = await fetch("/api/agents", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          role: role.trim(),
          description: description.trim(),
        }),
      });
      if (!res.ok) {
        setError(true);
        return;
      }
      const data = (await res.json()) as { agent: CustomAgent };
      onCreated(data.agent);
    } catch {
      setError(true);
    } finally {
      setCreating(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="add-agent-dialog" className="max-w-[520px]">
        <DialogTitle>{t("dialogTitle")}</DialogTitle>
        <DialogDescription>{t("dialogHint")}</DialogDescription>

        <div className="mt-5 flex flex-col gap-4">
          <label className="block">
            <span className="text-navy mb-1.5 block text-[0.8125rem] font-semibold">
              {t("nameLabel")}
            </span>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("namePlaceholder")}
              maxLength={NAME_MAX}
              data-testid="agent-name-input"
            />
          </label>

          <label className="block">
            <span className="text-navy mb-1.5 block text-[0.8125rem] font-semibold">
              {t("roleLabel")}
            </span>
            <Input
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder={t("rolePlaceholder")}
              maxLength={ROLE_MAX}
              data-testid="agent-role-input"
            />
          </label>

          <div>
            <span className="text-navy mb-1.5 block text-[0.8125rem] font-semibold">
              {t("descLabel")}
            </span>
            <div
              className={cn(
                "border-border bg-card rounded-card focus-within:border-navy-300 border px-2.5 pt-2.5 transition-colors duration-[var(--duration)] ease-[var(--ease)]",
                enhanced && "border-accent-300 bg-accent-50/30",
              )}
            >
              <textarea
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  if (enhanced) setEnhanced(false);
                }}
                rows={6}
                maxLength={DESC_MAX}
                placeholder={t("descPlaceholder")}
                data-testid="agent-description-input"
                className="text-navy placeholder:text-text-secondary/60 block w-full resize-none bg-transparent px-1 text-[0.9375rem] leading-relaxed outline-none"
              />
              <div className="flex items-center justify-end gap-1 pt-1 pb-2">
                <AnimatePresence mode="wait">
                  {enhanced && hasDescription ? (
                    <motion.button
                      key="undo"
                      type="button"
                      onClick={undo}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.15, ease: EASE }}
                      className="text-accent-700 hover:text-accent-800 focus-visible:ring-accent focus-visible:ring-offset-card rounded-btn px-2 py-1 text-sm font-semibold underline-offset-2 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-offset-2"
                    >
                      {t("undo")}
                    </motion.button>
                  ) : (enhancing || hasDescription) && !enhanced ? (
                    <motion.button
                      key="wand"
                      type="button"
                      onClick={enhance}
                      disabled={enhancing || !hasDescription}
                      data-testid="agent-enhance-button"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.15, ease: EASE }}
                      className="text-accent-700 hover:bg-accent-50 focus-visible:ring-accent focus-visible:ring-offset-card rounded-btn inline-flex items-center gap-1.5 px-2 py-1 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-60"
                    >
                      <Sparkles
                        className={cn("size-4", enhancing && "faheem-spin")}
                        aria-hidden="true"
                      />
                      {enhancing ? t("enhancing") : t("enhance")}
                    </motion.button>
                  ) : null}
                </AnimatePresence>
              </div>
            </div>
            <span className="text-text-secondary mt-1.5 block text-xs">
              {t("descHint")}
            </span>
          </div>

          {error && (
            <p
              data-testid="agent-create-error"
              className="text-danger flex items-center gap-1.5 text-[0.8125rem] font-medium"
            >
              <CircleAlert className="size-4 shrink-0" aria-hidden="true" />
              {t("createError")}
            </p>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            {t("cancel")}
          </Button>
          <Button
            size="sm"
            onClick={create}
            disabled={!canCreate}
            loading={creating}
            data-testid="agent-create-button"
          >
            {creating ? t("creating") : t("create")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
