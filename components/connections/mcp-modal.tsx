"use client";

import * as React from "react";
import { Collapsible as RCollapsible } from "radix-ui";
import { ChevronRight, CircleAlert, CircleCheck } from "lucide-react";
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

/** Add-source type selector order. MCP is the one implemented path; the rest
 *  are selectable but land on the MVP-roadmap note (no speculative machinery). */
const SOURCE_TYPES: ConnectorSourceType[] = [
  "mcp",
  "api",
  "files",
  "app",
  "feed",
];

/** Exported for unit tests, must be `https://` with a non-empty host. */
export function isValidMcpUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" && url.hostname.length > 0;
  } catch {
    return false;
  }
}

/**
 * "Add a data source" modal. A type selector (MCP · API · Files · App · Feed)
 * where MCP is one type, not the page framing. The MCP path keeps the real
 * fake wizard: Name + URL (always `dir="ltr"`, live-validated HTTPS shape) + a
 * collapsed-by-default Advanced accordion (auth header / timeout, visual only).
 * The other types are selectable but land on the MVP-roadmap note. No shared
 * Accordion primitive exists yet, so this uses radix-ui's Collapsible directly,
 * scoped to this one modal, not a new components/ui primitive.
 */
export function McpModal({
  open,
  onOpenChange,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (name: string) => void;
}) {
  const t = useTranslations("connections");
  const [type, setType] = React.useState<ConnectorSourceType>("mcp");
  const [name, setName] = React.useState("");
  const [url, setUrl] = React.useState("");
  const [urlTouched, setUrlTouched] = React.useState(false);
  const [advancedOpen, setAdvancedOpen] = React.useState(false);

  // Reset the form whenever the dialog transitions to open, a render-time
  // state adjustment (not an effect) per React's guidance for resetting state
  // when a prop changes: https://react.dev/learn/you-might-not-need-an-effect
  const [prevOpen, setPrevOpen] = React.useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setType("mcp");
      setName("");
      setUrl("");
      setUrlTouched(false);
      setAdvancedOpen(false);
    }
  }

  const isMcp = type === "mcp";
  const urlValid = isValidMcpUrl(url);
  const showError = urlTouched && url.length > 0 && !urlValid;

  function submit() {
    if (!isMcp) return;
    setUrlTouched(true);
    if (!urlValid || name.trim().length === 0) return;
    onAdd(name.trim());
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[480px]">
        <DialogTitle>{t("mcp.title")}</DialogTitle>
        <DialogDescription className="text-[0.8125rem]">
          {t("mcp.caption")}
        </DialogDescription>

        <div className="mt-5 flex flex-col gap-4">
          <div>
            <label className="text-navy mb-1.5 block text-[0.8125rem] font-semibold">
              {t("addSource.type")}
            </label>
            <div className="flex flex-wrap gap-2">
              {SOURCE_TYPES.map((ty) => (
                <button
                  key={ty}
                  type="button"
                  onClick={() => setType(ty)}
                  aria-pressed={ty === type}
                  className={cn(
                    "rounded-btn focus-visible:ring-accent focus-visible:ring-offset-card border px-3 py-1.5 text-[0.8125rem] font-semibold tracking-[0.02em] uppercase transition-colors duration-[var(--duration-fast)] ease-[var(--ease)] outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
                    ty === type
                      ? "border-accent bg-accent-50 text-accent-700"
                      : "border-border text-text-secondary hover:border-navy-300 hover:text-navy",
                  )}
                >
                  {t(`sourceType.${ty}`)}
                </button>
              ))}
            </div>
          </div>

          {isMcp ? (
            <>
              <div>
                <label
                  htmlFor="mcp-name"
                  className="text-navy mb-1.5 block text-[0.8125rem] font-semibold"
                >
                  {t("mcp.name")}
                </label>
                <Input
                  id="mcp-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("mcp.namePlaceholder")}
                />
              </div>

              <div>
                <label
                  htmlFor="mcp-url"
                  className="text-navy mb-1.5 block text-[0.8125rem] font-semibold"
                >
                  {t("mcp.url")}
                </label>
                <Input
                  id="mcp-url"
                  dir="ltr"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onBlur={() => setUrlTouched(true)}
                  placeholder={t("mcp.urlPlaceholder")}
                  invalid={showError}
                  className="font-mono text-sm"
                  endSlot={
                    urlTouched && urlValid ? (
                      <CircleCheck
                        className="text-accent size-4"
                        aria-hidden="true"
                      />
                    ) : undefined
                  }
                />
                {showError && (
                  <p className="text-danger mt-1.5 flex items-center gap-1.5 text-[0.8125rem] font-medium">
                    <CircleAlert
                      className="size-4 shrink-0"
                      aria-hidden="true"
                    />
                    {t("mcp.urlError")}
                  </p>
                )}
              </div>

              <RCollapsible.Root
                open={advancedOpen}
                onOpenChange={setAdvancedOpen}
              >
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
                  <div>
                    <label
                      htmlFor="mcp-auth"
                      className="text-navy mb-1.5 block text-[0.8125rem] font-semibold"
                    >
                      {t("mcp.authHeader")}
                    </label>
                    <Input
                      id="mcp-auth"
                      dir="ltr"
                      placeholder={t("mcp.authHeaderPlaceholder")}
                      className="font-mono text-sm"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="mcp-timeout"
                      className="text-navy mb-1.5 block text-[0.8125rem] font-semibold"
                    >
                      {t("mcp.timeout")}
                    </label>
                    <Input
                      id="mcp-timeout"
                      inputMode="numeric"
                      placeholder={t("mcp.timeoutPlaceholder")}
                      className="financial"
                    />
                  </div>
                </RCollapsible.Content>
              </RCollapsible.Root>
            </>
          ) : (
            <p className="text-text-secondary rounded-card bg-navy-50 px-3.5 py-3 text-[0.8125rem] leading-relaxed">
              {t("addSource.roadmap")}
            </p>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            {t("cancel")}
          </Button>
          <Button size="sm" onClick={submit} disabled={!isMcp}>
            {t("mcp.submit")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
