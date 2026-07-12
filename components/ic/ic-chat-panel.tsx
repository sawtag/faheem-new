"use client";

import * as React from "react";
import { Scale } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { AgentActivity } from "@/components/chat/agent-activity";
import { MessageStream } from "@/components/chat/message-stream";
import { SourcesAccordion } from "@/components/chat/sources-accordion";
import { VerifiedBadge } from "@/components/chat/verified-badge";
import { reduceEvents } from "@/components/chat/reduce";
import { streamChat } from "@/components/chat/stream";
import { IcComposer } from "@/components/ic/ic-composer";
import {
  subscribeGoldenSelection,
  takeGoldenSelection,
  type GoldenSelection,
} from "@/lib/demo/golden-bus";
import manifest from "@/data/corpus/manifest.json";
import type { ChatRequest, CorpusDoc, Lang, SSEEvent } from "@/lib/types";

const DOC_TITLES = new Map(
  (manifest as CorpusDoc[]).map((d) => [d.id, d.title]),
);

const SUGGESTIONS = ["suggest1", "suggest2", "suggest3"] as const;

interface Turn {
  id: string;
  question: string;
  events: SSEEvent[];
  streaming: boolean;
  elapsedMs?: number;
}

/**
 * Faheem IC advisory chat — the committee asks, Faheem answers with citations
 * into both analyses + the mandate, always advisory. It reuses the exact chat
 * engine (streamChat) and render components (AgentActivity, MessageStream,
 * SourcesAccordion, VerifiedBadge) as `/chat/[id]`, only scoped to
 * `context: {kind:"ic"}` — nothing is forked.
 */
export function IcChatPanel({
  onOpenDoc,
}: {
  onOpenDoc: (docId: string, page: number) => void;
}) {
  const t = useTranslations("ic.chat");
  const locale = useLocale() as Lang;

  const [value, setValue] = React.useState("");
  const [turns, setTurns] = React.useState<Turn[]>([]);
  const abortRef = React.useRef<AbortController | null>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const stick = React.useRef(true);

  const docTitle = React.useCallback(
    (docId: string) => DOC_TITLES.get(docId)?.[locale] ?? docId,
    [locale],
  );

  const streaming = turns.some((turn) => turn.streaming);

  // ⌘K demo palette hand-off — only an "ic"-context golden selection is ever
  // applied here (the workspace ones target ChatView's Composer instead).
  React.useEffect(() => {
    function apply(sel: GoldenSelection) {
      if (sel.context.kind === "ic") setValue(sel.text);
    }
    const pending = takeGoldenSelection();
    if (pending) apply(pending);
    return subscribeGoldenSelection(apply);
  }, []);

  const run = React.useCallback(
    async (question: string) => {
      const id = crypto.randomUUID();
      const startedAt = performance.now();
      stick.current = true;
      setTurns((prev) => [
        ...prev,
        { id, question, events: [], streaming: true },
      ]);

      const controller = new AbortController();
      abortRef.current = controller;
      const req: ChatRequest = {
        question,
        lang: locale,
        context: { kind: "ic" },
      };

      const collected: SSEEvent[] = [];
      try {
        await streamChat(req, controller.signal, (ev) => {
          collected.push(ev);
          setTurns((prev) =>
            prev.map((turn) =>
              turn.id === id ? { ...turn, events: [...turn.events, ev] } : turn,
            ),
          );
        });
      } catch {
        /* aborted or network drop — keep the partial turn */
      } finally {
        const elapsedMs = performance.now() - startedAt;
        setTurns((prev) =>
          prev.map((turn) =>
            turn.id === id ? { ...turn, streaming: false, elapsedMs } : turn,
          ),
        );
        abortRef.current = null;
      }
    },
    [locale],
  );

  function submit() {
    const q = value.trim();
    if (!q || streaming) return;
    setValue("");
    void run(q);
  }

  // Follow the bottom only while the user is already near it.
  const signal = turns.reduce((n, turn) => n + turn.events.length, 0);
  React.useEffect(() => {
    const el = scrollRef.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [signal]);

  function onScroll() {
    const el = scrollRef.current;
    if (!el) return;
    stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 96;
  }

  const isEmpty = turns.length === 0;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="border-border flex shrink-0 items-center gap-2.5 border-b px-5 py-4">
        <span className="bg-accent-50 text-accent-700 rounded-btn grid size-8 shrink-0 place-items-center">
          <Scale className="size-4" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 className="text-navy text-[0.9375rem] font-bold">{t("title")}</h2>
          <p className="text-text-secondary truncate text-xs">{t("scope")}</p>
        </div>
      </header>

      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="flex-1 overflow-y-auto"
      >
        <div className="flex flex-col gap-6 px-5 py-5">
          {isEmpty && (
            <div className="text-text-secondary py-6 text-center">
              <p className="mx-auto max-w-xs text-sm leading-relaxed">
                {t("intro")}
              </p>
            </div>
          )}
          {turns.map((turn) => (
            <React.Fragment key={turn.id}>
              <div className="flex justify-end">
                <div className="bg-navy-50 text-navy max-w-[85%] rounded-2xl px-4 py-2.5 text-[0.9375rem] leading-relaxed">
                  {turn.question}
                </div>
              </div>
              <AssistantTurn
                turn={turn}
                locale={locale}
                docTitle={docTitle}
                onOpenDoc={onOpenDoc}
                thinking={t("thinking")}
              />
            </React.Fragment>
          ))}
        </div>
      </div>

      <div className="border-border shrink-0 border-t px-5 py-4">
        <div className="mb-2.5 flex flex-wrap gap-1.5">
          {SUGGESTIONS.map((key) => (
            <button
              key={key}
              type="button"
              data-testid="ic-suggested-pill"
              onClick={() => setValue(t(key))}
              className="border-border text-navy-700 hover:border-navy-300 hover:bg-navy-50 focus-visible:ring-accent focus-visible:ring-offset-card rounded-pill border px-3 py-1.5 text-xs font-semibold transition-colors duration-[var(--duration-fast)] ease-[var(--ease)] outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            >
              {t(key)}
            </button>
          ))}
        </div>
        <IcComposer
          value={value}
          onChange={setValue}
          onSubmit={submit}
          streaming={streaming}
          onStop={() => abortRef.current?.abort()}
          placeholder={t("placeholder")}
          sendLabel={t("send")}
          stopLabel={t("stop")}
        />
      </div>
    </div>
  );
}

function AssistantTurn({
  turn,
  locale,
  docTitle,
  onOpenDoc,
  thinking,
}: {
  turn: Turn;
  locale: Lang;
  docTitle: (docId: string) => string;
  onOpenDoc: (docId: string, page: number) => void;
  thinking: string;
}) {
  const view = reduceEvents(turn.events);
  return (
    <div>
      {view.stageRows.length > 0 && (
        <AgentActivity
          stageRows={view.stageRows}
          done={view.done}
          elapsedMs={turn.elapsedMs}
          sourcesCount={view.citations.length}
          docTitle={docTitle}
          lang={locale}
        />
      )}
      {turn.streaming && view.stageRows.length === 0 && view.text === "" && (
        <p className="text-text-secondary text-sm">{thinking}</p>
      )}
      {view.text && (
        <MessageStream
          text={view.text}
          citations={view.citations}
          streaming={turn.streaming}
          onOpenDoc={onOpenDoc}
        />
      )}
      {view.done && !view.error && (
        <VerifiedBadge count={view.citations.length} />
      )}
      {view.done && !view.error && (
        <SourcesAccordion
          citations={view.citations}
          docTitle={docTitle}
          onOpenDoc={onOpenDoc}
        />
      )}
    </div>
  );
}
