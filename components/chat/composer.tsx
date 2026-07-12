"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  AlertCircle,
  ArrowUp,
  Check,
  ChevronDown,
  FileText,
  Loader2,
  Mic,
  Paperclip,
  RotateCw,
  Sparkles,
  Square,
  X,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Toggle } from "@/components/ui/toggle";
import { Tooltip } from "@/components/ui/tooltip";
import { LucideIcon } from "@/components/shell/lucide-icon";
import { AGENTS, getAgent } from "@/lib/ai/agents";
import { postUpload, precheckPdf } from "@/lib/upload-client";
import manifest from "@/data/corpus/manifest.json";
import type { AgentId, ChatContext, CorpusDoc, Lang } from "@/lib/types";
import { cn } from "@/lib/utils";

const DOCS = manifest as CorpusDoc[];
const MODEL_TIERS = ["auto", "max", "light"] as const;
type ModelTier = (typeof MODEL_TIERS)[number];

const EXTERNAL_SOURCES = [
  { key: "tadawul", icon: "building-2" },
  { key: "argaam", icon: "newspaper" },
  { key: "news", icon: "rss" },
  { key: "web", icon: "globe" },
] as const;
const INTERNAL_SOURCES = [
  { key: "dataroom", icon: "folder-lock" },
  { key: "templates", icon: "layout-template" },
  { key: "mandate", icon: "scroll-text" },
] as const;

export interface ComposerSubmit {
  question: string;
  agent?: AgentId;
  docIds?: string[];
}

/** A paperclip upload in flight (spinner chip) or failed (danger chip). */
interface PendingUpload {
  tempId: string;
  filename: string;
  file: File;
  status: "uploading" | "error";
  message?: string;
}

interface TriggerState {
  kind: "@" | "#";
  query: string;
  start: number;
  caret: number;
  index: number;
}

/** Detect an `@…`/`#…` token immediately before the caret. */
function detectTrigger(
  text: string,
  caret: number,
): Omit<TriggerState, "index"> | null {
  const before = text.slice(0, caret);
  const m = /(^|\s)([@#])([\p{L}\w-]*)$/u.exec(before);
  if (!m) return null;
  const query = m[3] ?? "";
  return {
    kind: m[2] as "@" | "#",
    query,
    start: caret - query.length - 1,
    caret,
  };
}

/**
 * The omnibox composer — shared by the chat page and (later) the home hero.
 * Owns: auto-grow textarea, @-agent / #-doc typeahead → removable chips (which
 * set ChatRequest.agent / docIds), the source-picker flyout, the model-tier
 * selector, the Improve wand (+Undo), and the idle→active→streaming send button.
 * Purely presentational for sources/model (cosmetic per spec); the load-bearing
 * output is `onSubmit({ question, agent, docIds })`.
 */
export function Composer({
  context,
  companyName,
  onSubmit,
  onStop,
  streaming = false,
  lang,
  autoFocus = false,
  variant = "docked",
  placeholder,
  prefill,
  onFocusChange,
}: {
  context: ChatContext;
  companyName?: string;
  onSubmit: (payload: ComposerSubmit) => void;
  onStop?: () => void;
  streaming?: boolean;
  lang: Lang;
  autoFocus?: boolean;
  variant?: "docked" | "hero";
  /** Overrides the context-derived placeholder; successive values crossfade
   *  (the home hero rotates it). Absent → the native placeholder is used. */
  placeholder?: string;
  /** Push text into the composer + focus it (quick-action pills). Bump `nonce`
   *  to re-apply the same text. `agent`/`docIds` (P5a demo palette) also seed
   *  the chips, so a golden-question selection reproduces the exact recorded
   *  ChatRequest — backward-compatible, both optional. */
  prefill?: { text: string; nonce: number; agent?: AgentId; docIds?: string[] };
  onFocusChange?: (focused: boolean) => void;
}) {
  const t = useTranslations("chat.composer");
  const tu = useTranslations("upload");
  const locale = useLocale() as Lang;

  const [text, setText] = React.useState("");
  const [agentChip, setAgentChip] = React.useState<AgentId | null>(null);
  const [docChips, setDocChips] = React.useState<string[]>([]);
  const [model, setModel] = React.useState<ModelTier>("max");
  const [trigger, setTrigger] = React.useState<TriggerState | null>(null);

  // Paperclip attach: uploaded docs become # chips + join the # typeahead for
  // this session; in-flight / failed uploads render as transient chips.
  const [uploadedDocs, setUploadedDocs] = React.useState<CorpusDoc[]>([]);
  const [pending, setPending] = React.useState<PendingUpload[]>([]);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [improving, setImproving] = React.useState(false);
  const [improved, setImproved] = React.useState(false);
  const prevText = React.useRef("");

  const ref = React.useRef<HTMLTextAreaElement>(null);
  const pendingCaret = React.useRef<number | null>(null);

  // auto-grow
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [text]);

  // Apply a caret position requested after a typeahead chip insert. A layout
  // effect lands it synchronously with the value update (before the next
  // keystroke), so removing an @/#-token never scrambles subsequent typing.
  React.useLayoutEffect(() => {
    if (pendingCaret.current == null) return;
    const el = ref.current;
    if (el) {
      el.focus();
      el.setSelectionRange(pendingCaret.current, pendingCaret.current);
    }
    pendingCaret.current = null;
  });

  React.useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);

  // Quick-action prefill: replace the text, drop any typeahead/improve state,
  // then focus with the caret at the end (pendingCaret layout effect below).
  const lastPrefill = React.useRef<number | undefined>(undefined);
  React.useEffect(() => {
    if (!prefill || prefill.nonce === lastPrefill.current) return;
    lastPrefill.current = prefill.nonce;
    setText(prefill.text);
    setAgentChip(prefill.agent ?? null);
    setDocChips(prefill.docIds ?? []);
    setImproved(false);
    setTrigger(null);
    pendingCaret.current = prefill.text.length;
  }, [prefill]);

  // filtered typeahead items for the current trigger
  const items = React.useMemo(() => {
    if (!trigger) return [];
    const q = trigger.query.toLowerCase();
    if (trigger.kind === "@") {
      return AGENTS.filter(
        (a) =>
          a.id.includes(q) ||
          a.name.en.toLowerCase().includes(q) ||
          a.name.ar.includes(trigger.query),
      ).slice(0, 6);
    }
    return [...uploadedDocs, ...DOCS]
      .filter(
        (d) =>
          d.id.includes(q) ||
          d.title.en.toLowerCase().includes(q) ||
          d.title.ar.includes(trigger.query),
      )
      .slice(0, 6);
  }, [trigger, uploadedDocs]);

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const showWand =
    !streaming && !improved && !improving && wordCount >= 2 && wordCount <= 8;

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const value = e.target.value;
    setText(value);
    if (improved) setImproved(false);
    const caret = e.target.selectionStart ?? value.length;
    const t = detectTrigger(value, caret);
    setTrigger(t ? { ...t, index: 0 } : null);
  }

  function removeTriggerToken(start: number, caret: number) {
    setText(text.slice(0, start) + text.slice(caret));
    setTrigger(null);
    pendingCaret.current = start;
  }

  function pickAgent(id: AgentId) {
    if (trigger) removeTriggerToken(trigger.start, trigger.caret);
    setAgentChip(id);
  }
  function pickDoc(id: string) {
    if (trigger) removeTriggerToken(trigger.start, trigger.caret);
    setDocChips((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }

  // ─── paperclip upload ───
  async function runUpload(file: File, tempId: string) {
    const workspace =
      context.kind === "workspace" ? context.companyId : undefined;
    const result = await postUpload(file, { lang, workspace });
    if (result.ok) {
      const { doc } = result;
      setUploadedDocs((prev) =>
        prev.some((d) => d.id === doc.id) ? prev : [...prev, doc],
      );
      setDocChips((prev) => (prev.includes(doc.id) ? prev : [...prev, doc.id]));
      setPending((prev) => prev.filter((p) => p.tempId !== tempId));
    } else {
      setPending((prev) =>
        prev.map((p) =>
          p.tempId === tempId
            ? { ...p, status: "error", message: result.error ?? tu("failed") }
            : p,
        ),
      );
    }
  }

  function addFiles(list: FileList | null) {
    if (!list) return;
    for (const file of Array.from(list)) {
      const tempId = crypto.randomUUID();
      const code = precheckPdf(file);
      if (code) {
        setPending((prev) => [
          ...prev,
          {
            tempId,
            filename: file.name,
            file,
            status: "error",
            message: tu(code),
          },
        ]);
        continue;
      }
      setPending((prev) => [
        ...prev,
        { tempId, filename: file.name, file, status: "uploading" },
      ]);
      void runUpload(file, tempId);
    }
  }

  function retryUpload(tempId: string) {
    const p = pending.find((x) => x.tempId === tempId);
    if (!p) return;
    const code = precheckPdf(p.file);
    if (code) {
      setPending((prev) =>
        prev.map((x) =>
          x.tempId === tempId ? { ...x, message: tu(code) } : x,
        ),
      );
      return;
    }
    setPending((prev) =>
      prev.map((x) =>
        x.tempId === tempId
          ? { ...x, status: "uploading", message: undefined }
          : x,
      ),
    );
    void runUpload(p.file, tempId);
  }

  function submit() {
    const q = text.trim();
    if (!q || streaming) return;
    onSubmit({
      question: q,
      agent: agentChip ?? undefined,
      docIds: docChips.length > 0 ? docChips : undefined,
    });
    setText("");
    setAgentChip(null);
    setDocChips([]);
    setTrigger(null);
    setImproved(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (trigger && items.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setTrigger((s) =>
          s ? { ...s, index: (s.index + 1) % items.length } : s,
        );
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setTrigger((s) =>
          s ? { ...s, index: (s.index - 1 + items.length) % items.length } : s,
        );
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        const it = items[trigger.index];
        if (it) {
          if (trigger.kind === "@")
            pickAgent((it as (typeof AGENTS)[number]).id);
          else pickDoc((it as CorpusDoc).id);
        }
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setTrigger(null);
        return;
      }
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  async function improve() {
    const q = text.trim();
    if (!q || improving) return;
    setImproving(true);
    try {
      const res = await fetch("/api/improve", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: q, lang }),
      });
      const data = (await res.json()) as { improved?: unknown };
      if (typeof data.improved === "string" && data.improved.trim()) {
        prevText.current = text;
        setText(data.improved);
        setImproved(true);
      }
    } catch {
      /* keep the original text on failure */
    } finally {
      setImproving(false);
    }
  }

  function undo() {
    setText(prevText.current);
    setImproved(false);
    ref.current?.focus();
  }

  const contextPlaceholder =
    context.kind === "workspace" && companyName
      ? t("placeholderWorkspace", { company: companyName })
      : t("placeholder");
  const placeholderText = placeholder ?? contextPlaceholder;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="relative"
    >
      {/* typeahead menu (floats above the input) */}
      <AnimatePresence>
        {trigger && items.length > 0 && (
          <TypeaheadMenu
            trigger={trigger}
            items={items}
            lang={locale}
            headerAgents={t("agentsHeader")}
            headerDocs={t("docsHeader")}
            onPickAgent={pickAgent}
            onPickDoc={pickDoc}
          />
        )}
      </AnimatePresence>

      <div
        className={cn(
          "border-border bg-card rounded-card focus-within:border-navy-300 border shadow-[var(--shadow-card)] transition-colors duration-[var(--duration)] ease-[var(--ease)]",
          improved && "border-accent-300 bg-accent-50/30",
          variant === "hero" ? "px-3 pt-3" : "px-2.5 pt-2.5",
        )}
      >
        {/* chips */}
        {(agentChip || docChips.length > 0 || pending.length > 0) && (
          <div className="flex flex-wrap gap-1.5 px-1 pb-2">
            {agentChip && (
              <Chip
                icon={
                  <LucideIcon
                    name={getAgent(agentChip).icon}
                    className="size-3"
                  />
                }
                label={`@${agentChip}`}
                mono
                removeLabel={t("removeChip")}
                onRemove={() => setAgentChip(null)}
              />
            )}
            {docChips.map((id) => {
              const doc =
                DOCS.find((d) => d.id === id) ??
                uploadedDocs.find((d) => d.id === id);
              return (
                <Chip
                  key={id}
                  icon={<FileText className="size-3" />}
                  label={doc ? doc.title[locale] : id}
                  removeLabel={t("removeChip")}
                  onRemove={() =>
                    setDocChips((prev) => prev.filter((d) => d !== id))
                  }
                />
              );
            })}
            {pending.map((p) => (
              <UploadChip
                key={p.tempId}
                pending={p}
                uploadingLabel={tu("uploading")}
                retryLabel={tu("retry")}
                dismissLabel={tu("dismiss")}
                onRetry={() => retryUpload(p.tempId)}
                onDismiss={() =>
                  setPending((prev) =>
                    prev.filter((x) => x.tempId !== p.tempId),
                  )
                }
              />
            ))}
          </div>
        )}

        <div className="relative">
          <textarea
            ref={ref}
            value={text}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onFocus={() => onFocusChange?.(true)}
            onBlur={() => onFocusChange?.(false)}
            rows={1}
            // custom placeholder → crossfading overlay (below); else native
            placeholder={
              placeholder === undefined ? placeholderText : undefined
            }
            aria-label={contextPlaceholder}
            className={cn(
              "text-navy placeholder:text-text-secondary/60 block w-full resize-none bg-transparent px-1 leading-relaxed outline-none",
              variant === "hero" ? "text-base" : "text-[0.9375rem]",
            )}
          />
          {/* Rotating placeholder: a crossfade-capable overlay that mirrors the
              textarea's box, shown only while empty. Keyed on the text so
              successive values fade through each other (--duration). */}
          {placeholder !== undefined && text === "" && (
            <div
              aria-hidden="true"
              className={cn(
                "text-text-secondary/60 pointer-events-none absolute inset-0 leading-relaxed",
                variant === "hero" ? "text-base" : "text-[0.9375rem]",
              )}
            >
              <AnimatePresence initial={false}>
                <motion.span
                  key={placeholderText}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                  className="absolute inset-0 block truncate px-1"
                >
                  {placeholderText}
                </motion.span>
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* toolbar */}
        <div className="flex items-center gap-1 pt-1 pb-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,.pdf"
            multiple
            data-testid="composer-file-input"
            className="hidden"
            onChange={(e) => {
              addFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <ToolbarButton
            label={t("attach")}
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip className="size-[18px]" />
          </ToolbarButton>
          <SourcePicker
            externalLabel={t("sourcesExternal")}
            internalLabel={t("sourcesInternal")}
            sourcesLabel={t("sources")}
          />

          <div className="ms-auto flex items-center gap-1">
            <AnimatePresence mode="wait">
              {improved ? (
                <motion.button
                  key="undo"
                  type="button"
                  onClick={undo}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-accent-700 hover:text-accent-800 focus-visible:ring-accent focus-visible:ring-offset-card rounded-btn px-2 py-1 text-sm font-semibold underline-offset-2 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-offset-2"
                >
                  {t("undo")}
                </motion.button>
              ) : showWand || improving ? (
                <motion.button
                  key="wand"
                  type="button"
                  onClick={improve}
                  disabled={improving}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-accent-700 hover:bg-accent-50 focus-visible:ring-accent focus-visible:ring-offset-card rounded-btn inline-flex items-center gap-1.5 px-2 py-1 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-60"
                >
                  <Sparkles
                    className={cn("size-4", improving && "faheem-spin")}
                    aria-hidden="true"
                  />
                  {improving ? t("improving") : t("improve")}
                </motion.button>
              ) : null}
            </AnimatePresence>

            <ModelSelector
              model={model}
              onChange={setModel}
              label={t("modelLabel")}
            />

            <ToolbarButton label={t("mic")}>
              <Mic className="size-[18px]" />
            </ToolbarButton>

            <SendButton
              streaming={streaming}
              disabled={!streaming && text.trim().length === 0}
              onClick={() => (streaming ? onStop?.() : submit())}
              sendLabel={t("send")}
              stopLabel={t("stop")}
            />
          </div>
        </div>
      </div>
    </form>
  );
}

// ─────────────────────────────── sub-components ───────────────────────────────

function Chip({
  icon,
  label,
  mono = false,
  removeLabel,
  onRemove,
  dimmed = false,
}: {
  icon: React.ReactNode;
  label: string;
  mono?: boolean;
  removeLabel: string;
  onRemove: () => void;
  dimmed?: boolean;
}) {
  return (
    <span
      className={cn(
        "bg-navy-50 text-navy-700 rounded-pill inline-flex max-w-[16rem] items-center gap-1 py-0.5 ps-2 pe-1 text-xs font-semibold",
        dimmed && "opacity-50",
      )}
    >
      {icon}
      <bdi className={cn("truncate", mono && "font-mono")} dir="ltr">
        {label}
      </bdi>
      <button
        type="button"
        onClick={onRemove}
        aria-label={removeLabel}
        className="hover:bg-navy-100 rounded-pill grid size-4 shrink-0 place-items-center"
      >
        <X className="size-3" aria-hidden="true" />
      </button>
    </span>
  );
}

/** Transient chip for a paperclip upload: spinner while in flight, danger + retry on failure. */
function UploadChip({
  pending,
  uploadingLabel,
  retryLabel,
  dismissLabel,
  onRetry,
  onDismiss,
}: {
  pending: PendingUpload;
  uploadingLabel: string;
  retryLabel: string;
  dismissLabel: string;
  onRetry: () => void;
  onDismiss: () => void;
}) {
  const error = pending.status === "error";
  return (
    <span
      title={error ? pending.message : uploadingLabel}
      className={cn(
        "rounded-pill inline-flex max-w-[16rem] items-center gap-1 py-0.5 ps-2 pe-1 text-xs font-semibold",
        error ? "bg-danger-50 text-danger-700" : "bg-navy-50 text-navy-700",
      )}
    >
      {error ? (
        <AlertCircle className="size-3 shrink-0" aria-hidden="true" />
      ) : (
        <Loader2 className="faheem-spin size-3 shrink-0" aria-hidden="true" />
      )}
      <bdi className="truncate" dir="ltr">
        {pending.filename}
      </bdi>
      {error ? (
        <>
          <button
            type="button"
            onClick={onRetry}
            aria-label={retryLabel}
            className="hover:bg-danger-100 rounded-pill grid size-4 shrink-0 place-items-center"
          >
            <RotateCw className="size-3" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={onDismiss}
            aria-label={dismissLabel}
            className="hover:bg-danger-100 rounded-pill grid size-4 shrink-0 place-items-center"
          >
            <X className="size-3" aria-hidden="true" />
          </button>
        </>
      ) : (
        <span className="sr-only">{uploadingLabel}</span>
      )}
    </span>
  );
}

function ToolbarButton({
  label,
  children,
  onClick,
}: {
  label: string;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="text-text-secondary hover:bg-navy-50 hover:text-navy focus-visible:ring-accent focus-visible:ring-offset-card rounded-btn grid size-8 place-items-center transition-colors duration-[var(--duration-fast)] ease-[var(--ease)] outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
    >
      {children}
    </button>
  );
}

function SendButton({
  streaming,
  disabled,
  onClick,
  sendLabel,
  stopLabel,
}: {
  streaming: boolean;
  disabled: boolean;
  onClick: () => void;
  sendLabel: string;
  stopLabel: string;
}) {
  return (
    <button
      type={streaming ? "button" : "submit"}
      onClick={streaming ? onClick : undefined}
      disabled={disabled}
      aria-label={streaming ? stopLabel : sendLabel}
      title={streaming ? stopLabel : sendLabel}
      className={cn(
        "focus-visible:ring-accent focus-visible:ring-offset-card rounded-pill grid size-9 shrink-0 place-items-center transition-colors duration-[var(--duration-fast)] ease-[var(--ease)] outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        streaming
          ? "bg-navy text-card hover:bg-navy-800"
          : disabled
            ? "bg-navy-100 text-text-secondary/60 cursor-not-allowed"
            : "bg-accent text-card hover:bg-accent-600",
      )}
    >
      {streaming ? (
        <Square className="size-3.5 fill-current" aria-hidden="true" />
      ) : (
        <ArrowUp className="size-[18px]" aria-hidden="true" />
      )}
    </button>
  );
}

function ModelSelector({
  model,
  onChange,
  label,
}: {
  model: ModelTier;
  onChange: (m: ModelTier) => void;
  label: string;
}) {
  const t = useTranslations("chat.model");
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={label}
          className="text-text-secondary hover:bg-navy-50 hover:text-navy focus-visible:ring-accent focus-visible:ring-offset-card rounded-btn inline-flex items-center gap-1 px-2 py-1.5 text-[0.8125rem] font-semibold whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
        >
          {t(`${model}.name`)}
          <ChevronDown className="size-3.5" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        {MODEL_TIERS.map((m) => (
          <DropdownMenuItem
            key={m}
            onSelect={() => onChange(m)}
            className="items-start gap-2"
          >
            <Check
              className={cn(
                "text-accent mt-0.5 size-4 shrink-0",
                model !== m && "opacity-0",
              )}
              aria-hidden="true"
            />
            <span className="min-w-0">
              <span className="text-navy block text-sm font-semibold">
                {t(`${m}.name`)}
              </span>
              <span className="text-text-secondary block text-xs">
                {t(`${m}.desc`)}
              </span>
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function TypeaheadMenu({
  trigger,
  items,
  lang,
  headerAgents,
  headerDocs,
  onPickAgent,
  onPickDoc,
}: {
  trigger: TriggerState;
  items: readonly ((typeof AGENTS)[number] | CorpusDoc)[];
  lang: Lang;
  headerAgents: string;
  headerDocs: string;
  onPickAgent: (id: AgentId) => void;
  onPickDoc: (id: string) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }}
      transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
      className="border-border bg-card shadow-hover rounded-card absolute inset-x-0 bottom-full z-20 mb-2 max-h-64 overflow-y-auto border p-1.5"
    >
      <p className="text-text-secondary px-2.5 py-1 text-[0.6875rem] font-bold tracking-[0.04em] uppercase">
        {trigger.kind === "@" ? headerAgents : headerDocs}
      </p>
      {items.map((it, i) => {
        const active = i === trigger.index;
        if (trigger.kind === "@") {
          const a = it as (typeof AGENTS)[number];
          return (
            <button
              key={a.id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                onPickAgent(a.id);
              }}
              className={cn(
                "rounded-btn flex w-full items-center gap-2.5 px-2 py-1.5 text-start transition-colors",
                active ? "bg-navy-50" : "hover:bg-navy-50",
              )}
            >
              <span className="bg-accent-50 text-accent-700 rounded-btn grid size-6 shrink-0 place-items-center">
                <LucideIcon name={a.icon} className="size-3.5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="text-navy block truncate text-sm font-semibold">
                  {a.name[lang]}
                </span>
              </span>
              <bdi className="text-text-secondary font-mono text-xs" dir="ltr">
                @{a.id}
              </bdi>
            </button>
          );
        }
        const d = it as CorpusDoc;
        return (
          <button
            key={d.id}
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              onPickDoc(d.id);
            }}
            className={cn(
              "rounded-btn flex w-full items-center gap-2.5 px-2 py-1.5 text-start transition-colors",
              active ? "bg-navy-50" : "hover:bg-navy-50",
            )}
          >
            <span className="bg-navy-50 text-navy-600 rounded-btn grid size-6 shrink-0 place-items-center">
              <FileText className="size-3.5" />
            </span>
            <span className="text-navy min-w-0 flex-1 truncate text-sm font-medium">
              {d.title[lang]}
            </span>
          </button>
        );
      })}
    </motion.div>
  );
}

function SourcePicker({
  externalLabel,
  internalLabel,
  sourcesLabel,
}: {
  externalLabel: string;
  internalLabel: string;
  sourcesLabel: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [groups, setGroups] = React.useState({
    external: true,
    internal: true,
  });
  const rootRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={sourcesLabel}
        aria-expanded={open}
        className="text-text-secondary hover:bg-navy-50 hover:text-navy focus-visible:ring-accent focus-visible:ring-offset-card rounded-btn inline-flex h-8 items-center gap-1.5 px-2 text-[0.8125rem] font-semibold outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
      >
        <LucideIcon name="sliders-horizontal" className="size-[18px]" />
        <span className="max-sm:sr-only">{sourcesLabel}</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
            className="border-border bg-card shadow-hover rounded-card absolute start-0 bottom-full z-20 mb-2 w-72 border p-2"
          >
            <SourceGroup
              label={externalLabel}
              on={groups.external}
              onToggle={(v) => setGroups((g) => ({ ...g, external: v }))}
              sources={EXTERNAL_SOURCES}
            />
            <div className="bg-border my-1.5 h-px" />
            <SourceGroup
              label={internalLabel}
              on={groups.internal}
              onToggle={(v) => setGroups((g) => ({ ...g, internal: v }))}
              sources={INTERNAL_SOURCES}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SourceGroup({
  label,
  on,
  onToggle,
  sources,
}: {
  label: string;
  on: boolean;
  onToggle: (v: boolean) => void;
  sources: readonly { key: string; icon: string }[];
}) {
  const t = useTranslations("chat.source");
  return (
    <div>
      <div className="flex items-center justify-between px-1.5 py-1">
        <span className="text-text-secondary text-[0.6875rem] font-bold tracking-[0.04em] uppercase">
          {label}
        </span>
        <Toggle checked={on} onCheckedChange={onToggle} aria-label={label} />
      </div>
      {sources.map((s) => (
        <Tooltip key={s.key} side="right" content={t(`${s.key}.desc`)}>
          <div
            className={cn(
              "rounded-btn flex items-center gap-2.5 px-1.5 py-1.5 transition-opacity",
              !on && "opacity-45",
            )}
          >
            <span className="bg-navy-50 text-navy-600 rounded-btn grid size-6 shrink-0 place-items-center">
              <LucideIcon name={s.icon} className="size-3.5" />
            </span>
            <span className="text-navy flex-1 text-sm font-medium">
              {t(`${s.key}.name`)}
            </span>
          </div>
        </Tooltip>
      ))}
    </div>
  );
}
