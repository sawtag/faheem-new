"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { AnimatePresence, motion } from "motion/react";
import {
  CircleAlert,
  Copy,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  Wrench,
} from "lucide-react";
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
import { Toggle } from "@/components/ui/toggle";
import { Tooltip } from "@/components/ui/tooltip";
import { publishGoldenSelection } from "@/lib/demo/golden-bus";
import { cn } from "@/lib/utils";
import { SKILL_CATEGORIES, type SkillCategory } from "@/lib/skills";
import type { CustomSkill } from "@/lib/custom-skills";
import type { Lang } from "@/lib/types";

const EASE = [0.4, 0, 0.2, 1] as const; // mirrors --ease
const DIM =
  "opacity-55 transition-opacity duration-[var(--duration-fast)] ease-[var(--ease)]";

const NAME_MIN = 2;
export const NAME_MAX = 60;
const DESC_MIN = 10;
export const DESC_MAX = 200;
const PREFILL_MIN = 10;
const PREFILL_MAX = 2000;

/** The four user-editable fields, used to seed the dialog in copy mode. */
export interface SkillDraft {
  name: string;
  category: SkillCategory;
  description: string;
  prefill: string;
}

/** What the skill dialog is doing: creating blank, creating from a copy, or editing in place. */
export type SkillDialogMode =
  | { kind: "add" }
  | { kind: "copy"; initial: SkillDraft }
  | { kind: "edit"; skill: CustomSkill };

const ICON_BUTTON =
  "text-text-secondary focus-visible:ring-accent focus-visible:ring-offset-card rounded-btn grid size-8 shrink-0 place-items-center transition-colors duration-[var(--duration-fast)] ease-[var(--ease)] outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-55";

/**
 * One store-backed skill card (Lunar-authored seed or the analyst's own):
 * same Card visual family as SkillCard, a Wrench icon tile in place of the
 * registry's per-skill lucide icon, an author badge (Lunar vs Custom), and
 * the full lifecycle the built-in registry deliberately lacks: toggle
 * (persisted via PATCH, dims like the registry toggle without gating Run),
 * edit, copy, delete. Run fires the exact prefill mechanism a
 * `prefill`-mapped registry skill uses (see run-skill.ts's prefill branch):
 * publish onto the golden-bus, then navigate to a fresh firm-context chat.
 */
export function CustomSkillCard({
  skill,
  onDeleted,
  onEdit,
  onCopy,
  onToggled,
}: {
  skill: CustomSkill;
  onDeleted: () => void;
  onEdit: () => void;
  onCopy: () => void;
  onToggled: (skill: CustomSkill) => void;
}) {
  const t = useTranslations("skills");
  const router = useRouter();
  const [deleting, setDeleting] = React.useState(false);
  const on = skill.enabled;

  function onRun() {
    publishGoldenSelection({
      context: { kind: "firm" },
      text: skill.prefill,
    });
    router.push("/chat/new?context=firm");
  }

  async function handleToggle(next: boolean) {
    onToggled({ ...skill, enabled: next }); // optimistic; server confirms below
    try {
      const res = await fetch("/api/skills", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: skill.id, enabled: next }),
      });
      if (!res.ok) throw new Error();
      const data = (await res.json()) as { skill: CustomSkill };
      onToggled(data.skill);
    } catch {
      onToggled(skill); // revert on failure
    }
  }

  async function handleDelete() {
    if (deleting) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/skills", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: skill.id }),
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
    <Card hover data-testid={`skill-card-${skill.id}`} data-dimmed={!on}>
      <div className="flex items-start justify-between gap-3">
        <span
          className={cn(
            "bg-accent-50 text-accent-700 rounded-btn grid size-10 shrink-0 place-items-center",
            !on && "grayscale",
          )}
        >
          <Wrench className="size-5" aria-hidden="true" />
        </span>
        <Toggle
          checked={on}
          onCheckedChange={handleToggle}
          aria-label={skill.name}
          data-testid={`custom-skill-toggle-${skill.id}`}
        />
      </div>

      <div className={cn("mt-4 flex flex-col gap-3", !on && DIM)}>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-navy text-base font-bold">{skill.name}</h3>
          <Badge
            size="sm"
            variant={skill.author === "lunar" ? "navy" : "neutral"}
          >
            {skill.author === "lunar" ? t("lunarBadge") : t("customBadge")}
          </Badge>
        </div>
        <span className="text-text-secondary text-xs font-medium">
          {t(`categories.${skill.category}`)}
        </span>
        <p className="text-text-secondary text-sm">{skill.description}</p>
      </div>

      <div className="border-border mt-5 flex items-center justify-between gap-3 border-t pt-4">
        <div className="flex items-center gap-1">
          <Tooltip content={t("edit")}>
            <button
              type="button"
              onClick={onEdit}
              aria-label={t("edit")}
              data-testid={`custom-skill-edit-${skill.id}`}
              className={cn(ICON_BUTTON, "hover:bg-navy-50 hover:text-navy")}
            >
              <Pencil className="size-4" aria-hidden="true" />
            </button>
          </Tooltip>
          <Tooltip content={t("copy")}>
            <button
              type="button"
              onClick={onCopy}
              aria-label={t("copy")}
              data-testid={`custom-skill-copy-${skill.id}`}
              className={cn(ICON_BUTTON, "hover:bg-navy-50 hover:text-navy")}
            >
              <Copy className="size-4" aria-hidden="true" />
            </button>
          </Tooltip>
          <Tooltip content={t("deleteSkill")}>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              aria-label={t("deleteSkill")}
              data-testid={`custom-skill-delete-${skill.id}`}
              className={cn(
                ICON_BUTTON,
                "hover:bg-danger-50 hover:text-danger",
              )}
            >
              <Trash2 className="size-4" aria-hidden="true" />
            </button>
          </Tooltip>
        </div>
        <Button
          size="sm"
          onClick={onRun}
          className={cn(!on && DIM)}
          data-testid={`custom-skill-run-${skill.id}`}
        >
          {t("run")}
        </Button>
      </div>
    </Card>
  );
}

export function AddSkillTile({
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
      data-testid="add-skill-tile"
      className="rounded-card border-border text-text-secondary hover:border-navy-300 hover:bg-navy-50/50 hover:text-navy focus-visible:ring-accent focus-visible:ring-offset-bg flex min-h-[9.5rem] flex-col items-center justify-center gap-2 border border-dashed p-6 text-[0.8125rem] font-semibold transition-colors duration-[var(--duration-fast)] ease-[var(--ease)] outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
    >
      <Plus className="size-5" aria-hidden="true" />
      {label}
    </button>
  );
}

function draftFor(mode: SkillDialogMode): SkillDraft {
  if (mode.kind === "add")
    return { name: "", category: "valuation", description: "", prefill: "" };
  if (mode.kind === "copy") return mode.initial;
  const { name, category, description, prefill } = mode.skill;
  return { name, category, description, prefill };
}

/**
 * The one skill form, in three modes: add (blank), copy (seeded from any
 * skill, built-in or store-backed, saved as a new custom skill via POST),
 * edit (seeded from a store-backed skill, saved in place via PATCH). The
 * Enhance wand reuses `/api/improve` (the composer's Improve route) on the
 * Run prefill in every mode.
 */
export function SkillDialog({
  mode,
  onClose,
  onSaved,
}: {
  mode: SkillDialogMode | null;
  onClose: () => void;
  onSaved: (skill: CustomSkill, kind: "created" | "updated") => void;
}) {
  const t = useTranslations("skills");
  const locale = useLocale() as Lang;
  const editing = mode?.kind === "edit";

  const [name, setName] = React.useState("");
  const [category, setCategory] = React.useState<SkillCategory>("valuation");
  const [description, setDescription] = React.useState("");
  const [prefill, setPrefill] = React.useState("");
  const [enhancing, setEnhancing] = React.useState(false);
  const [enhanced, setEnhanced] = React.useState(false);
  const prevPrefill = React.useRef("");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState(false);

  // Seed the form every time the dialog opens (render-time state
  // adjustment, same convention as DraftToIc / ShareWorkspace); edits never
  // leak between opens.
  const [prevMode, setPrevMode] = React.useState(mode);
  if (mode !== prevMode) {
    setPrevMode(mode);
    if (mode) {
      const draft = draftFor(mode);
      setName(draft.name);
      setCategory(draft.category);
      setDescription(draft.description);
      setPrefill(draft.prefill);
      setEnhancing(false);
      setEnhanced(false);
      setSaving(false);
      setError(false);
    }
  }

  const nameValid =
    name.trim().length >= NAME_MIN && name.trim().length <= NAME_MAX;
  const descValid =
    description.trim().length >= DESC_MIN &&
    description.trim().length <= DESC_MAX;
  const prefillValid =
    prefill.trim().length >= PREFILL_MIN &&
    prefill.trim().length <= PREFILL_MAX;
  const canSave = nameValid && descValid && prefillValid && !saving;
  const hasPrefill = prefill.trim().length > 0;

  async function enhance() {
    const p = prefill.trim();
    if (!p || enhancing) return;
    setEnhancing(true);
    try {
      const res = await fetch("/api/improve", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: p, lang: locale }),
      });
      const data = (await res.json()) as { improved?: unknown };
      if (typeof data.improved === "string" && data.improved.trim()) {
        prevPrefill.current = prefill;
        setPrefill(data.improved);
        setEnhanced(true);
      }
    } catch {
      /* keep the original prefill on failure */
    } finally {
      setEnhancing(false);
    }
  }

  function undo() {
    setPrefill(prevPrefill.current);
    setEnhanced(false);
  }

  async function save() {
    if (!canSave || !mode) return;
    setSaving(true);
    setError(false);
    const fields = {
      name: name.trim(),
      category,
      description: description.trim(),
      prefill: prefill.trim(),
    };
    try {
      const res = await fetch("/api/skills", {
        method: editing ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(
          editing && mode.kind === "edit"
            ? { id: mode.skill.id, ...fields }
            : fields,
        ),
      });
      if (!res.ok) {
        setError(true);
        return;
      }
      const data = (await res.json()) as { skill: CustomSkill };
      onSaved(data.skill, editing ? "updated" : "created");
    } catch {
      setError(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={mode !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent data-testid="add-skill-dialog" className="max-w-[520px]">
        <DialogTitle>{editing ? t("editTitle") : t("dialogTitle")}</DialogTitle>
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
              data-testid="skill-name-input"
            />
          </label>

          <div>
            <span className="text-navy mb-1.5 block text-[0.8125rem] font-semibold">
              {t("categoryLabel")}
            </span>
            <div className="flex flex-wrap gap-2">
              {SKILL_CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  aria-pressed={c === category}
                  data-testid={`skill-category-${c}`}
                  className={cn(
                    "rounded-pill px-3.5 py-1.5 text-[0.8125rem] font-semibold transition-colors duration-[var(--duration-fast)] ease-[var(--ease)] outline-none",
                    c === category
                      ? "bg-accent-50 text-accent-700"
                      : "bg-card border-border text-text-secondary hover:text-navy border",
                  )}
                >
                  {t(`categories.${c}`)}
                </button>
              ))}
            </div>
          </div>

          <label className="block">
            <span className="text-navy mb-1.5 block text-[0.8125rem] font-semibold">
              {t("descLabel")}
            </span>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("descPlaceholder")}
              maxLength={DESC_MAX}
              data-testid="skill-description-input"
            />
          </label>

          <div>
            <span className="text-navy mb-1.5 block text-[0.8125rem] font-semibold">
              {t("prefillLabel")}
            </span>
            <div
              className={cn(
                "border-border bg-card rounded-card focus-within:border-navy-300 border px-2.5 pt-2.5 transition-colors duration-[var(--duration)] ease-[var(--ease)]",
                enhanced && "border-accent-300 bg-accent-50/30",
              )}
            >
              <textarea
                value={prefill}
                onChange={(e) => {
                  setPrefill(e.target.value);
                  if (enhanced) setEnhanced(false);
                }}
                rows={6}
                maxLength={PREFILL_MAX}
                placeholder={t("prefillPlaceholder")}
                data-testid="skill-prefill-input"
                className="text-navy placeholder:text-text-secondary/60 block w-full resize-none bg-transparent px-1 text-[0.9375rem] leading-relaxed outline-none"
              />
              <div className="flex items-center justify-end gap-1 pt-1 pb-2">
                <AnimatePresence mode="wait">
                  {enhanced && hasPrefill ? (
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
                  ) : (enhancing || hasPrefill) && !enhanced ? (
                    <motion.button
                      key="wand"
                      type="button"
                      onClick={enhance}
                      disabled={enhancing || !hasPrefill}
                      data-testid="skill-enhance-button"
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
              {t("prefillHint")}
            </span>
          </div>

          {error && (
            <p
              data-testid="skill-create-error"
              className="text-danger flex items-center gap-1.5 text-[0.8125rem] font-medium"
            >
              <CircleAlert className="size-4 shrink-0" aria-hidden="true" />
              {editing ? t("updateError") : t("createError")}
            </p>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button
            size="sm"
            onClick={save}
            disabled={!canSave}
            loading={saving}
            data-testid="skill-create-button"
          >
            {saving
              ? editing
                ? t("saving")
                : t("creating")
              : editing
                ? t("save")
                : t("create")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
