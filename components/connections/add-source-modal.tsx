"use client";

import * as React from "react";
import { Collapsible as RCollapsible } from "radix-ui";
import {
  Check,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  Copy,
  Eye,
  EyeOff,
  FolderOpen,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { ConnectorSourceType } from "@/lib/connectors";

/** Add-source type selector order, MCP first as the flagship path. */
const SOURCE_TYPES: ConnectorSourceType[] = [
  "mcp",
  "api",
  "files",
  "app",
  "feed",
];

/** Exported for unit tests, must be `https://` with a non-empty host. */
export function isValidHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" && url.hostname.length > 0;
  } catch {
    return false;
  }
}

/** `smb://host/share` or a `\\server\share` UNC path (needs credentials). */
export function isSmbPath(value: string): boolean {
  const v = value.trim();
  return /^smb:\/\/.+/i.test(v) || /^\\\\.+/.test(v);
}

/** Files live behind HTTPS (data-room / WebDAV links) or an SMB share. */
export function isValidFilesTarget(value: string): boolean {
  return isValidHttpsUrl(value) || isSmbPath(value);
}

const LABEL = "text-navy mb-1.5 block text-[0.8125rem] font-semibold";

const ICON_BTN =
  "rounded-btn text-text-secondary hover:bg-navy-50 hover:text-navy focus-visible:ring-accent grid size-8 shrink-0 place-items-center outline-none transition-colors duration-[var(--duration-fast)] ease-[var(--ease)] focus-visible:ring-2";

function chip(active: boolean, extra?: string) {
  return cn(
    "rounded-btn focus-visible:ring-accent focus-visible:ring-offset-card border px-3 py-1.5 text-[0.8125rem] font-semibold transition-colors duration-[var(--duration-fast)] ease-[var(--ease)] outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
    active
      ? "border-accent bg-accent-50 text-accent-700"
      : "border-border text-text-secondary hover:border-navy-300 hover:text-navy",
    extra,
  );
}

/** Label + control + optional error row, the field layout every form uses. */
function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string | false;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className={LABEL}>
        {label}
      </label>
      {children}
      {error && (
        <p className="text-danger mt-1.5 flex items-center gap-1.5 text-[0.8125rem] font-medium">
          <CircleAlert className="size-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
}

/** Value + touched + validity for a URL-shaped input (error only after blur). */
function useValidatedUrl(validate: (v: string) => boolean) {
  const [value, setValue] = React.useState("");
  const [touched, setTouched] = React.useState(false);
  const valid = validate(value);
  return {
    value,
    valid,
    touched,
    showError: touched && value.length > 0 && !valid,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setValue(e.target.value),
    onBlur: () => setTouched(true),
    touch: () => setTouched(true),
  };
}

/** Green check that appears once a URL field is blurred and valid. */
function ValidCheck({ show }: { show: boolean }) {
  if (!show) return null;
  return <CircleCheck className="text-accent size-4" aria-hidden="true" />;
}

/**
 * Masked secret field (API key, SMB password) with an in-field reveal toggle
 * and, when `copyable`, a copy-to-clipboard button. Secrets are Latin tokens,
 * so the whole control renders LTR: the input's end padding and the overlaid
 * buttons then share the same edge in Arabic too.
 */
function SecretInput({
  id,
  value,
  onChange,
  placeholder,
  copyable = false,
}: {
  id: string;
  value: string;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
  placeholder?: string;
  copyable?: boolean;
}) {
  const t = useTranslations("connections.addSource");
  const [visible, setVisible] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      return; // clipboard permission denied: no false "copied" feedback
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="relative" dir="ltr">
      <Input
        id={id}
        type={visible ? "text" : "password"}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete="off"
        className={cn("font-mono text-sm", copyable ? "pe-18" : "pe-11")}
      />
      <span className="absolute inset-y-0 end-0 flex items-center gap-0.5 pe-1.5">
        {copyable && (
          <button
            type="button"
            aria-label={copied ? t("copied") : t("copy")}
            onClick={copy}
            className={ICON_BTN}
          >
            {copied ? (
              <Check className="text-accent size-4" aria-hidden="true" />
            ) : (
              <Copy className="size-4" aria-hidden="true" />
            )}
          </button>
        )}
        <button
          type="button"
          aria-label={visible ? t("hide") : t("show")}
          onClick={() => setVisible((v) => !v)}
          className={ICON_BTN}
        >
          {visible ? (
            <EyeOff className="size-4" aria-hidden="true" />
          ) : (
            <Eye className="size-4" aria-hidden="true" />
          )}
        </button>
      </span>
    </div>
  );
}

/** Shared Cancel / Add footer; submit stays enabled and validates on click. */
function Footer({
  onCancel,
  onSubmit,
}: {
  onCancel: () => void;
  onSubmit: () => void;
}) {
  const t = useTranslations("connections");
  return (
    <div className="mt-2 flex justify-end gap-2">
      <Button variant="ghost" size="sm" onClick={onCancel}>
        {t("cancel")}
      </Button>
      <Button size="sm" onClick={onSubmit}>
        {t("mcp.submit")}
      </Button>
    </div>
  );
}

/** Each form validates its own fields, then reports the display name up. */
interface FormProps {
  onAdd: (name: string) => void;
  onCancel: () => void;
}

function McpForm({ onAdd, onCancel }: FormProps) {
  const t = useTranslations("connections");
  const [name, setName] = React.useState("");
  const url = useValidatedUrl(isValidHttpsUrl);
  const [advancedOpen, setAdvancedOpen] = React.useState(false);

  function submit() {
    url.touch();
    if (!url.valid || name.trim().length === 0) return;
    onAdd(name);
  }

  return (
    <>
      <Field id="mcp-name" label={t("mcp.name")}>
        <Input
          id="mcp-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("mcp.namePlaceholder")}
        />
      </Field>

      <Field
        id="mcp-url"
        label={t("mcp.url")}
        error={url.showError && t("mcp.urlError")}
      >
        <Input
          id="mcp-url"
          dir="ltr"
          value={url.value}
          onChange={url.onChange}
          onBlur={url.onBlur}
          placeholder={t("mcp.urlPlaceholder")}
          invalid={url.showError}
          className="font-mono text-sm"
          endSlot={<ValidCheck show={url.touched && url.valid} />}
        />
      </Field>

      <RCollapsible.Root open={advancedOpen} onOpenChange={setAdvancedOpen}>
        <RCollapsible.Trigger className="text-navy flex w-full items-center gap-1.5 text-[0.8125rem] font-semibold outline-none">
          <ChevronRight
            className={cn(
              "size-4 shrink-0 transition-transform duration-[var(--duration-fast)] ease-[var(--ease)]",
              advancedOpen ? "rotate-90" : "rtl:rotate-180",
            )}
            aria-hidden="true"
          />
          {t("mcp.advanced")}
        </RCollapsible.Trigger>
        <RCollapsible.Content className="mt-3 flex flex-col gap-4">
          <Field id="mcp-auth" label={t("mcp.authHeader")}>
            <Input
              id="mcp-auth"
              dir="ltr"
              placeholder={t("mcp.authHeaderPlaceholder")}
              className="font-mono text-sm"
            />
          </Field>
          <Field id="mcp-timeout" label={t("mcp.timeout")}>
            <Input
              id="mcp-timeout"
              inputMode="numeric"
              placeholder={t("mcp.timeoutPlaceholder")}
              className="financial"
            />
          </Field>
        </RCollapsible.Content>
      </RCollapsible.Root>

      <Footer onCancel={onCancel} onSubmit={submit} />
    </>
  );
}

function ApiForm({ onAdd, onCancel }: FormProps) {
  const t = useTranslations("connections");
  const base = useValidatedUrl(isValidHttpsUrl);
  const [name, setName] = React.useState("");
  const [key, setKey] = React.useState("");

  function submit() {
    base.touch();
    if (!base.valid || name.trim().length === 0 || key.trim().length === 0)
      return;
    onAdd(name);
  }

  return (
    <>
      <Field id="api-name" label={t("mcp.name")}>
        <Input
          id="api-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("addSource.api.namePlaceholder")}
        />
      </Field>

      <Field
        id="api-base"
        label={t("addSource.api.base")}
        error={base.showError && t("mcp.urlError")}
      >
        <Input
          id="api-base"
          dir="ltr"
          value={base.value}
          onChange={base.onChange}
          onBlur={base.onBlur}
          placeholder={t("addSource.api.basePlaceholder")}
          invalid={base.showError}
          className="font-mono text-sm"
          endSlot={<ValidCheck show={base.touched && base.valid} />}
        />
      </Field>

      <Field id="api-key" label={t("addSource.api.key")}>
        <SecretInput
          id="api-key"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder={t("addSource.api.keyPlaceholder")}
          copyable
        />
      </Field>

      <Footer onCancel={onCancel} onSubmit={submit} />
    </>
  );
}

function FilesForm({ onAdd, onCancel }: FormProps) {
  const t = useTranslations("connections");
  const [name, setName] = React.useState("");
  const [mode, setMode] = React.useState<"upload" | "path">("upload");
  const [folder, setFolder] = React.useState<{
    name: string;
    count: number;
  } | null>(null);
  const [pickTouched, setPickTouched] = React.useState(false);
  const path = useValidatedUrl(isValidFilesTarget);
  const smb = isSmbPath(path.value);
  const [user, setUser] = React.useState("");
  const [pass, setPass] = React.useState("");
  const fileRef = React.useRef<HTMLInputElement | null>(null);

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const folderName = files[0]!.webkitRelativePath.split("/")[0]!;
    setFolder({ name: folderName, count: files.length });
    setName((n) => (n.trim().length === 0 ? folderName : n));
    e.target.value = "";
  }

  function submit() {
    if (mode === "upload") {
      setPickTouched(true);
      if (!folder || name.trim().length === 0) return;
    } else {
      path.touch();
      if (!path.valid || name.trim().length === 0) return;
      if (smb && (user.trim().length === 0 || pass.length === 0)) return;
    }
    onAdd(name);
  }

  return (
    <>
      <Field id="files-name" label={t("mcp.name")}>
        <Input
          id="files-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("addSource.files.namePlaceholder")}
        />
      </Field>

      <div>
        <span className={LABEL}>{t("addSource.location")}</span>
        <div className="flex flex-wrap gap-2">
          {(["upload", "path"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              aria-pressed={m === mode}
              className={chip(m === mode)}
            >
              {t(`addSource.files.${m}`)}
            </button>
          ))}
        </div>
      </div>

      {mode === "upload" ? (
        <div>
          {/* webkitdirectory is set via the ref callback: React's TS types
              don't know the (non-standard, universally supported) attribute. */}
          <input
            ref={(node) => {
              fileRef.current = node;
              node?.setAttribute("webkitdirectory", "");
            }}
            type="file"
            multiple
            className="hidden"
            onChange={onPick}
          />
          <Button
            variant="outline"
            size="sm"
            startIcon={<FolderOpen className="size-4" />}
            onClick={() => fileRef.current?.click()}
          >
            {t("addSource.files.chooseFolder")}
          </Button>
          {folder && (
            <p className="text-navy mt-2 flex items-center gap-1.5 text-[0.8125rem] font-medium">
              <CircleCheck
                className="text-accent size-4 shrink-0"
                aria-hidden="true"
              />
              {t("addSource.files.picked", {
                name: folder.name,
                count: folder.count,
              })}
            </p>
          )}
          {pickTouched && !folder && (
            <p className="text-danger mt-2 flex items-center gap-1.5 text-[0.8125rem] font-medium">
              <CircleAlert className="size-4 shrink-0" aria-hidden="true" />
              {t("addSource.files.pickError")}
            </p>
          )}
        </div>
      ) : (
        <>
          <Field
            id="files-path"
            label={t("addSource.files.pathLabel")}
            error={path.showError && t("addSource.files.pathError")}
          >
            <Input
              id="files-path"
              dir="ltr"
              value={path.value}
              onChange={path.onChange}
              onBlur={path.onBlur}
              placeholder={t("addSource.files.pathPlaceholder")}
              invalid={path.showError}
              className="font-mono text-sm"
              endSlot={<ValidCheck show={path.touched && path.valid} />}
            />
          </Field>

          {smb && (
            <>
              <p className="text-text-secondary rounded-card bg-navy-50 px-3.5 py-3 text-[0.8125rem] leading-relaxed">
                {t("addSource.files.smbNote")}
              </p>
              <Field id="files-user" label={t("addSource.files.username")}>
                <Input
                  id="files-user"
                  dir="ltr"
                  value={user}
                  onChange={(e) => setUser(e.target.value)}
                  placeholder={t("addSource.files.usernamePlaceholder")}
                  autoComplete="off"
                  className="font-mono text-sm"
                />
              </Field>
              <Field id="files-pass" label={t("addSource.files.password")}>
                <SecretInput
                  id="files-pass"
                  value={pass}
                  onChange={(e) => setPass(e.target.value)}
                />
              </Field>
            </>
          )}
        </>
      )}

      <Footer onCancel={onCancel} onSubmit={submit} />
    </>
  );
}

function AppForm({ onAdd, onCancel }: FormProps) {
  const t = useTranslations("connections");
  const [name, setName] = React.useState("");
  const url = useValidatedUrl(isValidHttpsUrl);

  function submit() {
    url.touch();
    if (!url.valid || name.trim().length === 0) return;
    onAdd(name);
  }

  return (
    <>
      <Field id="app-name" label={t("mcp.name")}>
        <Input
          id="app-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("addSource.app.namePlaceholder")}
        />
      </Field>

      <Field
        id="app-url"
        label={t("addSource.app.url")}
        error={url.showError && t("mcp.urlError")}
      >
        <Input
          id="app-url"
          dir="ltr"
          value={url.value}
          onChange={url.onChange}
          onBlur={url.onBlur}
          placeholder={t("addSource.app.urlPlaceholder")}
          invalid={url.showError}
          className="font-mono text-sm"
          endSlot={<ValidCheck show={url.touched && url.valid} />}
        />
      </Field>

      <p className="text-text-secondary rounded-card bg-navy-50 px-3.5 py-3 text-[0.8125rem] leading-relaxed">
        {t("addSource.app.note")}
      </p>

      <Footer onCancel={onCancel} onSubmit={submit} />
    </>
  );
}

function FeedForm({ onAdd, onCancel }: FormProps) {
  const t = useTranslations("connections");
  const [name, setName] = React.useState("");
  const url = useValidatedUrl(isValidHttpsUrl);

  function submit() {
    url.touch();
    if (!url.valid || name.trim().length === 0) return;
    onAdd(name);
  }

  return (
    <>
      <Field id="feed-name" label={t("mcp.name")}>
        <Input
          id="feed-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("addSource.feed.namePlaceholder")}
        />
      </Field>

      <Field
        id="feed-url"
        label={t("addSource.feed.url")}
        error={url.showError && t("mcp.urlError")}
      >
        <Input
          id="feed-url"
          dir="ltr"
          value={url.value}
          onChange={url.onChange}
          onBlur={url.onBlur}
          placeholder={t("addSource.feed.urlPlaceholder")}
          invalid={url.showError}
          className="font-mono text-sm"
          endSlot={<ValidCheck show={url.touched && url.valid} />}
        />
      </Field>

      <Field id="feed-refresh" label={t("addSource.feed.refresh")}>
        <Input
          id="feed-refresh"
          inputMode="numeric"
          placeholder={t("addSource.feed.refreshPlaceholder")}
          className="financial"
        />
      </Field>

      <Footer onCancel={onCancel} onSubmit={submit} />
    </>
  );
}

const FORMS: Record<ConnectorSourceType, React.ComponentType<FormProps>> = {
  mcp: McpForm,
  api: ApiForm,
  files: FilesForm,
  app: AppForm,
  feed: FeedForm,
};

/**
 * "Add a data source" modal: a type selector (MCP · API · Files · App · Feed)
 * where every type carries a working add-flow. MCP keeps the Name + HTTPS URL
 * wizard with the Advanced accordion; API adds a masked key with in-field
 * copy/reveal buttons; Files uploads a local folder through the system picker
 * or points at an HTTPS/SMB location (SMB asks for read-only credentials);
 * App takes a workspace URL with the read-only OAuth note; Feed takes a feed
 * URL and refresh cadence. Everything is UI-only per the mock boundary
 * (AGENTS.md rule 10): submitting appends a typed cosmetic connector.
 */
export function AddSourceModal({
  open,
  onOpenChange,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (name: string, sourceType: ConnectorSourceType) => void;
}) {
  const t = useTranslations("connections");
  const [type, setType] = React.useState<ConnectorSourceType>("mcp");

  // Reset the selector whenever the dialog transitions to open, a render-time
  // state adjustment (not an effect) per React's guidance for resetting state
  // when a prop changes: https://react.dev/learn/you-might-not-need-an-effect
  // The per-type forms reset themselves by unmounting with the dialog.
  const [prevOpen, setPrevOpen] = React.useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setType("mcp");
  }

  const Form = FORMS[type];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[480px]">
        <DialogTitle>{t("mcp.title")}</DialogTitle>
        <DialogDescription className="text-[0.8125rem]">
          {t("mcp.caption")}
        </DialogDescription>

        <div className="mt-5 flex flex-col gap-4">
          <div>
            <span className={LABEL}>{t("addSource.type")}</span>
            <div className="flex flex-wrap gap-2">
              {SOURCE_TYPES.map((ty) => (
                <button
                  key={ty}
                  type="button"
                  onClick={() => setType(ty)}
                  aria-pressed={ty === type}
                  className={chip(ty === type, "tracking-[0.02em] uppercase")}
                >
                  {t(`sourceType.${ty}`)}
                </button>
              ))}
            </div>
          </div>

          <Form
            key={type}
            onAdd={(name) => {
              onAdd(name.trim(), type);
              onOpenChange(false);
            }}
            onCancel={() => onOpenChange(false)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
