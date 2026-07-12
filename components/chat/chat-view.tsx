"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { CircleAlert } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/skeleton";
import { Composer, type ComposerSubmit } from "@/components/chat/composer";
import { AgentActivity } from "@/components/chat/agent-activity";
import { MessageStream } from "@/components/chat/message-stream";
import { SourcesAccordion } from "@/components/chat/sources-accordion";
import { VerifiedBadge } from "@/components/chat/verified-badge";
import { reduceEvents, type AnswerView } from "@/components/chat/reduce";
import { streamChat } from "@/components/chat/stream";
import { GenerationPanel } from "@/components/generate/generation-panel";
import { isDeliverablesQuestion } from "@/lib/demo/deliverables";
import {
  subscribeGoldenSelection,
  takeGoldenSelection,
  type GoldenSelection,
} from "@/lib/demo/golden-bus";
import {
  appendAssistantTurn,
  appendUserTurn,
  createRuntimeChat,
  parseContext,
  resolveChat,
  serializeContext,
} from "@/lib/chats";
import manifest from "@/data/corpus/manifest.json";
import dealsData from "@/data/deals.json";
import type {
  ChatRequest,
  CorpusDoc,
  Lang,
  Localized,
  SeedChat,
  SSEEvent,
} from "@/lib/types";

const PdfPanel = dynamic(() => import("@/components/chat/pdf-panel"), {
  ssr: false,
  loading: () => <div className="bg-card size-full" />,
});

const DOC_TITLES = new Map(
  (manifest as CorpusDoc[]).map((d) => [d.id, d.title]),
);
const DEAL_NAMES = new Map<string, Localized>(
  dealsData.map((d) => [d.id, d.name]),
);

interface LiveTurn {
  id: string;
  question: string;
  events: SSEEvent[];
  streaming: boolean;
  elapsedMs?: number;
  /** P5a deliverables beat: an exact match on the "deliverables" golden
   *  question renders GenerationPanel inline instead of streaming an answer
   *  — no /api/chat call for this turn. */
  kind?: "generation";
}
interface OpenDoc {
  docId: string;
  page: number;
}

export function ChatView({ id }: { id: string }) {
  const t = useTranslations("chat");
  const locale = useLocale() as Lang;
  const router = useRouter();
  const searchParams = useSearchParams();

  const [chat, setChat] = React.useState<SeedChat | null | undefined>(
    undefined,
  );
  const [liveTurns, setLiveTurns] = React.useState<LiveTurn[]>([]);
  const [openDoc, setOpenDoc] = React.useState<OpenDoc | null>(null);
  const [goldenPrefill, setGoldenPrefill] = React.useState<
    GoldenSelection | undefined
  >();
  const abortRef = React.useRef<AbortController | null>(null);
  const startedFor = React.useRef<string | null>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const stick = React.useRef(true);
  // Carries the full submit payload (incl. agent/docIds — not part of the
  // persisted SeedChat message schema) across the `/chat/new` → `/chat/[id]`
  // hand-off, so a golden-question palette selection with a chip reproduces
  // the exact recorded ChatRequest on the very first turn of a fresh chat.
  const pendingNewPayload = React.useRef<ComposerSubmit | null>(null);

  const docTitle = React.useCallback(
    (docId: string) => DOC_TITLES.get(docId)?.[locale] ?? docId,
    [locale],
  );
  const openDocTitle = openDoc ? docTitle(openDoc.docId) : "";

  const runStream = React.useCallback(
    async (payload: ComposerSubmit, target: SeedChat, persistUser: boolean) => {
      if (persistUser) {
        appendUserTurn(target.id, payload.question);
      }
      const turnId = crypto.randomUUID();
      const startedAt = performance.now();
      setLiveTurns((prev) => [
        ...prev,
        { id: turnId, question: payload.question, events: [], streaming: true },
      ]);

      const controller = new AbortController();
      abortRef.current = controller;
      const req: ChatRequest = {
        question: payload.question,
        lang: locale,
        context: target.context,
        ...(payload.agent ? { agent: payload.agent } : {}),
        ...(payload.docIds?.length ? { docIds: payload.docIds } : {}),
      };

      const collected: SSEEvent[] = [];
      try {
        await streamChat(req, controller.signal, (ev) => {
          collected.push(ev);
          setLiveTurns((prev) =>
            prev.map((turn) =>
              turn.id === turnId
                ? { ...turn, events: [...turn.events, ev] }
                : turn,
            ),
          );
        });
      } catch {
        /* aborted or network drop — leave the partial turn as-is */
      } finally {
        const elapsedMs = performance.now() - startedAt;
        setLiveTurns((prev) =>
          prev.map((turn) =>
            turn.id === turnId
              ? { ...turn, streaming: false, elapsedMs }
              : turn,
          ),
        );
        abortRef.current = null;
        const completed = collected.some((e) => e.type === "done");
        if (completed) {
          appendAssistantTurn(
            target.id,
            reduceEvents(collected).text,
            collected,
          );
        }
      }
    },
    [locale],
  );

  // P5a deliverables beat: renders GenerationPanel inline instead of a
  // streamed answer — no /api/chat call, no SSEEvents to reduce. The panel
  // owns its own progress UI and audits its own artifacts (one entry per
  // artifact via /api/generate/[artifact]), so there is nothing further to
  // persist here beyond the user's turn.
  const runGeneration = React.useCallback(
    (payload: ComposerSubmit, target: SeedChat, persistUser: boolean) => {
      if (persistUser) {
        appendUserTurn(target.id, payload.question);
      }
      const turnId = crypto.randomUUID();
      setLiveTurns((prev) => [
        ...prev,
        {
          id: turnId,
          question: payload.question,
          events: [],
          streaming: false,
          kind: "generation",
        },
      ]);
    },
    [],
  );

  // ⌘K demo palette hand-off: apply a golden-question selection only when it
  // targets THIS chat's context (guards against a stray live event reaching
  // an unrelated, still-mounted chat mid-navigation) — `take()` catches a
  // selection published just before `/chat/new` navigation completes,
  // `subscribe` catches one fired while already on the right chat.
  React.useEffect(() => {
    function apply(sel: GoldenSelection) {
      if (
        !chat ||
        serializeContext(sel.context) !== serializeContext(chat.context)
      ) {
        return;
      }
      setGoldenPrefill(sel);
    }
    // Only consume the pending selection once the chat has resolved — take()
    // clears the stash, so pulling it while `chat` is still null (fresh
    // /chat/new mount, resolution runs in a later effect) destroys the
    // palette/skill hand-off before it can ever apply.
    if (chat) {
      const pending = takeGoldenSelection();
      if (pending) apply(pending);
    }
    return subscribeGoldenSelection(apply);
  }, [chat]);

  // Resolve the chat client-side (localStorage overlay + URL). `/chat/new?q=…`
  // mints a runtime chat and redirects; `/chat/new` with no query is the empty
  // state. Resolution reads localStorage / searchParams, so it can only run
  // after mount — a legitimate external-store sync, not derived state.
  React.useEffect(() => {
    const context = parseContext(searchParams.get("context"));
    if (id === "new") {
      const q = searchParams.get("q")?.trim();
      if (q) {
        router.replace(`/chat/${createRuntimeChat(context, q).id}`);
        return;
      }
    }
    const next: SeedChat | null =
      id === "new"
        ? {
            id: "new",
            title: { en: "", ar: "" },
            context,
            createdAt: new Date().toISOString(),
            messages: [],
          }
        : (resolveChat(id) ?? null);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setChat(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const messages = chat?.messages ?? [];
  const pendingUser =
    messages.length > 0 && messages[messages.length - 1]!.role === "user"
      ? messages[messages.length - 1]!
      : null;
  const historical = pendingUser ? messages.slice(0, -1) : messages;

  // Auto-stream a trailing user turn (the /chat/new → /chat/[id] hand-off).
  // Prefers the full payload stashed by onSubmit (carries agent/docIds, which
  // the persisted SeedChat message schema has no field for) over the bare
  // question text — otherwise a golden-question chip fired from an empty
  // `/chat/new` composer would silently lose its agent/doc scoping.
  React.useEffect(() => {
    if (!chat || !pendingUser) return;
    if (startedFor.current === chat.id) return;
    startedFor.current = chat.id;
    const payload = pendingNewPayload.current ?? { question: pendingUser.text };
    pendingNewPayload.current = null;
    if (isDeliverablesQuestion(payload.question)) {
      runGeneration(payload, chat, false);
    } else {
      void runStream(payload, chat, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chat]);

  // Auto-stick scrolling: follow the bottom only when already near it.
  const contentSignal =
    historical.length + liveTurns.reduce((n, tn) => n + tn.events.length, 0);
  React.useEffect(() => {
    const el = scrollRef.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [contentSignal, chat]);

  function onScroll() {
    const el = scrollRef.current;
    if (!el) return;
    stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 96;
  }

  function onSubmit(payload: ComposerSubmit) {
    if (!chat) return;
    stick.current = true;
    if (chat.id === "new") {
      const created = createRuntimeChat(chat.context, payload.question);
      pendingNewPayload.current = payload;
      router.push(`/chat/${created.id}`);
      return;
    }
    if (isDeliverablesQuestion(payload.question)) {
      runGeneration(payload, chat, true);
      return;
    }
    void runStream(payload, chat, true);
  }

  const streaming = liveTurns.some((turn) => turn.streaming);
  const companyName =
    chat?.context.kind === "workspace"
      ? (DEAL_NAMES.get(chat.context.companyId)?.[locale] ??
        chat.context.companyId)
      : undefined;

  if (chat === undefined) return <ChatSkeleton />;

  const title =
    chat && chat.messages.length > 0 ? chat.title[locale] : t("empty.title");
  const isEmpty = historical.length === 0 && liveTurns.length === 0;
  const slideFrom = locale === "ar" ? -28 : 28;

  return (
    <div className="flex h-screen">
      <section className="flex min-w-0 flex-1 flex-col">
        <header className="border-border flex h-16 shrink-0 items-center border-b px-6">
          <h1 className="text-navy truncate text-[0.9375rem] font-bold">
            {chat ? title : t("empty.title")}
          </h1>
        </header>

        <div
          ref={scrollRef}
          onScroll={onScroll}
          className="flex-1 overflow-y-auto"
        >
          <div className="mx-auto flex max-w-3xl flex-col gap-8 px-6 py-8">
            {isEmpty && chat && (
              <div className="flex flex-col items-center py-16 text-center">
                <h2 className="text-navy text-h2 font-extrabold">
                  {t("empty.title")}
                </h2>
                <p className="text-text-secondary mt-2 max-w-md text-[0.9375rem]">
                  {t("empty.subtitle")}
                </p>
              </div>
            )}

            {historical.map((m, i) =>
              m.role === "user" ? (
                <UserBubble key={`h${i}`} text={m.text} />
              ) : (
                <AssistantBlock
                  key={`h${i}`}
                  view={m.events ? reduceEvents(m.events) : plainView(m.text)}
                  streaming={false}
                  docTitle={docTitle}
                  onOpenDoc={(docId, page) => setOpenDoc({ docId, page })}
                  locale={locale}
                />
              ),
            )}

            {liveTurns.map((turn) =>
              turn.kind === "generation" ? (
                <React.Fragment key={turn.id}>
                  <UserBubble text={turn.question} />
                  <GenerationPanel workspace="jahez" />
                </React.Fragment>
              ) : (
                <React.Fragment key={turn.id}>
                  <UserBubble text={turn.question} />
                  <AssistantBlock
                    view={reduceEvents(turn.events)}
                    streaming={turn.streaming}
                    elapsedMs={turn.elapsedMs}
                    docTitle={docTitle}
                    onOpenDoc={(docId, page) => setOpenDoc({ docId, page })}
                    locale={locale}
                  />
                </React.Fragment>
              ),
            )}
          </div>
        </div>

        <div className="border-border shrink-0 border-t px-6 py-4">
          <div className="mx-auto max-w-3xl">
            {chat && (
              <Composer
                context={chat.context}
                companyName={companyName}
                onSubmit={onSubmit}
                onStop={() => abortRef.current?.abort()}
                streaming={streaming}
                lang={locale}
                prefill={
                  goldenPrefill
                    ? {
                        text: goldenPrefill.text,
                        nonce: goldenPrefill.nonce,
                        agent: goldenPrefill.agent,
                        docIds: goldenPrefill.docIds,
                      }
                    : undefined
                }
              />
            )}
          </div>
        </div>
      </section>

      <AnimatePresence>
        {openDoc && (
          <motion.aside
            key="pdf"
            initial={{ opacity: 0, x: slideFrom }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: slideFrom }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className="border-border h-screen w-[45%] max-w-[640px] min-w-[400px] shrink-0 border-s"
          >
            <PdfPanel
              key={openDoc.docId}
              docId={openDoc.docId}
              page={openDoc.page}
              title={openDocTitle}
              onClose={() => setOpenDoc(null)}
              onPageChange={(page) =>
                setOpenDoc((d) => (d ? { ...d, page } : d))
              }
            />
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}

function plainView(text: string): AnswerView {
  return {
    stageRows: [],
    agentCount: 0,
    text,
    citations: [],
    done: true,
    cached: false,
  };
}

function UserBubble({ text }: { text: string }) {
  return (
    <div className="flex justify-end">
      <div className="bg-navy-50 text-navy max-w-[85%] rounded-2xl px-4 py-2.5 text-[0.9375rem] leading-relaxed">
        {text}
      </div>
    </div>
  );
}

function AssistantBlock({
  view,
  streaming,
  elapsedMs,
  docTitle,
  onOpenDoc,
  locale,
}: {
  view: AnswerView;
  streaming: boolean;
  elapsedMs?: number;
  docTitle: (docId: string) => string;
  onOpenDoc: (docId: string, page: number) => void;
  locale: Lang;
}) {
  const t = useTranslations("chat");
  return (
    <div>
      {view.stageRows.length > 0 && (
        <AgentActivity
          stageRows={view.stageRows}
          done={view.done}
          elapsedMs={elapsedMs}
          sourcesCount={view.citations.length}
          docTitle={docTitle}
          lang={locale}
        />
      )}
      {streaming && view.stageRows.length === 0 && view.text === "" && (
        <p className="text-text-secondary text-sm">{t("thinking")}</p>
      )}
      {view.text && (
        <MessageStream
          text={view.text}
          citations={view.citations}
          streaming={streaming}
          onOpenDoc={onOpenDoc}
        />
      )}
      {view.error && (
        <div className="border-warning-50 bg-warning-50 text-warning-700 rounded-card mt-2 flex items-start gap-2 border px-3 py-2.5 text-sm">
          <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{view.error}</span>
        </div>
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

function ChatSkeleton() {
  return (
    <div className="flex h-screen flex-col">
      <div className="border-border h-16 border-b" />
      <div className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-6 py-8">
        <Skeleton className="ms-auto h-10 w-1/2 rounded-2xl" />
        <Skeleton className="rounded-card h-24 w-full" />
        <Skeleton className="rounded-card h-40 w-full" />
      </div>
    </div>
  );
}
