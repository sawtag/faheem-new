"use client";

import * as React from "react";
import { ArrowUp, Square } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The Faheem IC advisory input — a focused, controlled composer scoped to the
 * committee room (`context: {kind:"ic"}`). Controlled `value` so the suggested
 * questions can fill it for review before sending. It shares the answer engine
 * (streamChat + the chat render components) but stays deliberately lean: no
 * @/# typeahead or source picker — the committee asks, Faheem advises.
 */
export function IcComposer({
  value,
  onChange,
  onSubmit,
  streaming,
  onStop,
  placeholder,
  sendLabel,
  stopLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  streaming: boolean;
  onStop: () => void;
  placeholder: string;
  sendLabel: string;
  stopLabel: string;
}) {
  const ref = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [value]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!streaming) onSubmit();
    }
  }

  const canSend = value.trim().length > 0;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!streaming) onSubmit();
      }}
      className="border-border bg-card rounded-card focus-within:border-navy-300 border px-2.5 pt-2.5 shadow-[var(--shadow-card)] transition-colors duration-[var(--duration)] ease-[var(--ease)]"
    >
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        rows={1}
        placeholder={placeholder}
        aria-label={placeholder}
        className="text-navy placeholder:text-text-secondary/60 block w-full resize-none bg-transparent px-1 text-[0.9375rem] leading-relaxed outline-none"
      />
      <div className="flex items-center pt-1 pb-2">
        <button
          type={streaming ? "button" : "submit"}
          onClick={streaming ? onStop : undefined}
          disabled={!streaming && !canSend}
          aria-label={streaming ? stopLabel : sendLabel}
          title={streaming ? stopLabel : sendLabel}
          className={cn(
            "focus-visible:ring-accent focus-visible:ring-offset-card rounded-pill ms-auto grid size-9 shrink-0 place-items-center transition-colors duration-[var(--duration-fast)] ease-[var(--ease)] outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
            streaming
              ? "bg-navy text-card hover:bg-navy-800"
              : canSend
                ? "bg-accent text-card hover:bg-accent-600"
                : "bg-navy-100 text-text-secondary/60 cursor-not-allowed",
          )}
        >
          {streaming ? (
            <Square className="size-3.5 fill-current" aria-hidden="true" />
          ) : (
            <ArrowUp className="size-[18px]" aria-hidden="true" />
          )}
        </button>
      </div>
    </form>
  );
}
