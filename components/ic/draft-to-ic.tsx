"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { Mail, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, type ButtonProps } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { dealById } from "@/lib/deals";
import { computeModel } from "@/lib/model/compute";
import { buildMailtoHref } from "@/lib/ic/mailto";
import { cn, formatPercent, formatSAR } from "@/lib/utils";
import type { ArtifactMeta, Lang } from "@/lib/types";
import { recordIcDraft } from "./draft-actions";

/**
 * Draft-to-IC compose modal (WS-E, live-model-provenance plan §3). Everything
 * is prefilled from REAL data, the base-case DCF (lib/model/compute, the
 * same engine the Live Model and Office builders share) and the just-landed
 * artifact names, never a live model call (this workstream is deterministic
 * template UI, AGENTS.md rule 10). "Open in Outlook" is a genuine
 * `mailto:` handoff: Faheem never sends anything, the human does.
 */
/** Lunar's IC alias, a role-based group, not a fabricated named roster (no
 * individual Lunar IC members exist in the seed data). Kept as data, not a
 * message string: an email address has no bilingual form (see
 * messages/*.json "defaultRecipientName" for the translatable display name;
 * next-intl's rich-text tag syntax also rejects raw "<...>" in plain t()
 * strings, so the two never share one message value). */
const DEFAULT_IC_EMAIL = "ic@lunar-inv.sa";

function composeBody(
  t: ReturnType<typeof useTranslations>,
  company: string,
  locale: Lang,
  artifactNames: string[],
): string {
  const result = computeModel();
  const perShare = formatSAR(result.base.perShare, locale, {
    unit: "abs",
    decimals: 2,
  });
  const irr = formatPercent(result.weightedReturn * 100, locale, {
    decimals: 1,
  });
  const hurdle = formatPercent(result.ic.hurdle, locale, { decimals: 0 });
  const shariah = t(
    result.shariah.pass ? "body.shariahPass" : "body.shariahFail",
  );

  const lines = [
    t("body.greeting"),
    "",
    t("body.summary", { company, perShare, irr, hurdle, shariah }),
    "",
    t("body.materialsLabel"),
    ...artifactNames.map((name) => `- ${name}`),
    "",
    t("body.closing"),
    "",
    t("body.signOff"),
  ];
  return lines.join("\n");
}

export function DraftToIc({
  workspace,
  artifacts,
  variant = "outline",
  size = "sm",
  className,
}: {
  workspace: string;
  artifacts: ArtifactMeta[];
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  className?: string;
}) {
  const t = useTranslations("generate.draft");
  const locale = useLocale() as Lang;

  const [open, setOpen] = React.useState(false);
  const [to, setTo] = React.useState<string[]>([]);
  const [recipient, setRecipient] = React.useState("");
  const [subject, setSubject] = React.useState("");
  const [body, setBody] = React.useState("");

  const company = dealById(workspace)?.name[locale] ?? workspace;
  const artifactNames = artifacts.map((a) => a.name[locale]);

  // Reset the whole form to a fresh, fully-sourced draft every time the
  // dialog opens (render-time state adjustment, same convention as
  // ShareWorkspace), edits never leak between opens, and re-opening after
  // a fresh generate run always reflects the CURRENT numbers/artifacts.
  const [prevOpen, setPrevOpen] = React.useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setTo([`${t("defaultRecipientName")} <${DEFAULT_IC_EMAIL}>`]);
      setRecipient("");
      setSubject(t("subject", { company }));
      setBody(composeBody(t, company, locale, artifactNames));
    }
  }

  const { href: mailtoHref } = React.useMemo(
    () => buildMailtoHref({ to, subject, body }),
    [to, subject, body],
  );

  function addRecipient() {
    const value = recipient.trim();
    if (value.length === 0) return;
    setTo((prev) => (prev.includes(value) ? prev : [...prev, value]));
    setRecipient("");
  }

  function removeRecipient(value: string) {
    setTo((prev) => prev.filter((v) => v !== value));
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant={variant}
          size={size}
          startIcon={<Mail className="size-4" aria-hidden="true" />}
          className={className}
        >
          {t("trigger")}
        </Button>
      </DialogTrigger>
      <DialogContent data-testid="draft-to-ic-dialog" className="max-w-[520px]">
        <DialogTitle>{t("title")}</DialogTitle>

        <div className="mt-5 flex flex-col gap-4">
          <div>
            <p className="text-text-secondary mb-1.5 text-[0.6875rem] font-bold tracking-[0.04em] uppercase">
              {t("toLabel")}
            </p>
            <Input
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addRecipient();
                }
              }}
              placeholder={t("recipientPlaceholder")}
              aria-label={t("recipientPlaceholder")}
            />
            {to.length > 0 && (
              <ul
                data-testid="draft-to-ic-recipients"
                className="mt-2 flex flex-wrap gap-1.5"
              >
                {to.map((chip) => (
                  <li key={chip}>
                    <Badge
                      variant="neutral"
                      size="md"
                      className="gap-1.5 pe-1.5"
                    >
                      <bdi dir="ltr">{chip}</bdi>
                      <button
                        type="button"
                        onClick={() => removeRecipient(chip)}
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
          </div>

          <div>
            <p className="text-text-secondary mb-1.5 text-[0.6875rem] font-bold tracking-[0.04em] uppercase">
              {t("subjectLabel")}
            </p>
            <Input
              data-testid="draft-to-ic-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              aria-label={t("subjectLabel")}
            />
          </div>

          <div>
            <p className="text-text-secondary mb-1.5 text-[0.6875rem] font-bold tracking-[0.04em] uppercase">
              {t("bodyLabel")}
            </p>
            <textarea
              data-testid="draft-to-ic-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              aria-label={t("bodyLabel")}
              rows={10}
              className={cn(
                "rounded-btn bg-card text-navy placeholder:text-text-secondary/60 border-border hover:border-navy-300 focus-visible:ring-accent focus-visible:ring-offset-bg w-full border p-3.5 text-[0.875rem] leading-relaxed transition-colors duration-[var(--duration-fast)] ease-[var(--ease)] outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
              )}
            />
          </div>
        </div>

        <div className="border-border mt-6 flex items-center justify-between gap-3 border-t pt-4">
          <p className="text-text-secondary text-[0.75rem]">{t("caption")}</p>
          <div className="flex shrink-0 items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
              {t("cancel")}
            </Button>
            <Button asChild size="sm">
              <a
                href={mailtoHref}
                data-testid="draft-to-ic-open-in-outlook"
                onClick={() => {
                  void recordIcDraft(workspace, subject);
                  setOpen(false);
                }}
              >
                {t("openInOutlook")}
              </a>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
