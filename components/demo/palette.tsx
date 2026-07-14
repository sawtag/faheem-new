"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  GOLDEN_QUESTIONS,
  filterGoldenQuestions,
  groupGoldenQuestions,
  type GoldenQuestion,
} from "@/lib/demo/golden-questions";
import { publishGoldenSelection } from "@/lib/demo/golden-bus";
import {
  MODEL_EDIT_BEATS,
  MODEL_EDIT_COMPANY_ID,
  MODEL_EDIT_PATH,
  type ModelEditBeat,
} from "@/lib/demo/model-edit-questions";
import { publishModelEditPrefill } from "@/lib/demo/model-edit-bus";
import { parseContext, resolveChat, serializeContext } from "@/lib/chats";
import type { ChatContext, Lang } from "@/lib/types";
import { cn } from "@/lib/utils";

const GROUP_LABEL_KEY: Record<string, string> = {
  firm: "groupFirm",
  ic: "groupIc",
};

/** Reads the live URL (not a hook) — avoids a `useSearchParams()` Suspense
 *  requirement on the global (app) layout for a value only needed at the
 *  instant the palette opens or a selection is made. */
function currentPageContext(): ChatContext | null {
  const { pathname, search } = window.location;
  if (pathname === "/ic") return { kind: "ic" };
  const match = /^\/chat\/([^/]+)$/.exec(pathname);
  if (match) {
    const id = match[1]!;
    if (id === "new") {
      return parseContext(new URLSearchParams(search).get("context"));
    }
    return resolveChat(id)?.context ?? null;
  }
  return null;
}

function currentDealCompanyId(): string | null {
  return (
    /^\/deals\/([^/]+)(?:\/model)?\/?$/.exec(window.location.pathname)?.[1] ??
    null
  );
}

/**
 * ⌘K stage-only demo palette (P5a) — opens ONLY on ⌘K/Ctrl+K, no visible
 * affordance. Lists the golden questions (data/golden-questions.json)
 * filtered to the current page's context + language, grouped, bilingual.
 * Selecting one publishes the exact recorded {text, agent, docIds} onto the
 * golden-bus, navigating first only if the current page isn't already the
 * right chat surface — so the submitted ChatRequest is byte-identical to the
 * recorded one and always hits the exact-key cache (kills the "typo = cache
 * miss = surprise live call" risk class).
 */
export function DemoPalette() {
  const t = useTranslations("demo.palette");
  const tModelLabel = useTranslations("demo.palette.modelEdits");
  const tChip = useTranslations("model.edit.chips");
  const locale = useLocale() as Lang;
  const router = useRouter();

  const [open, setOpen] = React.useState(false);
  const [ctx, setCtx] = React.useState<ChatContext | null>(null);

  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCtx(currentPageContext());
        setOpen((o) => !o);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const filtered = React.useMemo(
    () => filterGoldenQuestions(GOLDEN_QUESTIONS, ctx, locale),
    [ctx, locale],
  );
  const groups = React.useMemo(
    () => groupGoldenQuestions(filtered),
    [filtered],
  );

  // The model beat exists for one company. A deal page has no chat context,
  // so inspect its route separately while leaving non-deal firm pages visible.
  const dealCompanyId = open && !ctx ? currentDealCompanyId() : null;
  const showModelSection =
    ctx?.kind === "firm" ||
    (ctx?.kind === "workspace" && ctx.companyId === MODEL_EDIT_COMPANY_ID) ||
    (!ctx &&
      (dealCompanyId === null || dealCompanyId === MODEL_EDIT_COMPANY_ID));

  function selectModelEdit(beat: ModelEditBeat) {
    publishModelEditPrefill(tChip(beat.chipKey));
    if (window.location.pathname !== MODEL_EDIT_PATH) {
      router.push(MODEL_EDIT_PATH);
    }
    setOpen(false);
  }

  function select(entry: GoldenQuestion) {
    const here = currentPageContext();
    publishGoldenSelection({
      context: entry.request.context,
      text: entry.request.question,
      agent: entry.request.agent,
      docIds: entry.request.docIds,
    });
    const same =
      here &&
      serializeContext(here) === serializeContext(entry.request.context);
    if (!same) {
      const href =
        entry.request.context.kind === "ic"
          ? "/ic"
          : `/chat/new?context=${encodeURIComponent(serializeContext(entry.request.context))}`;
      router.push(href);
    }
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        showClose={false}
        className="max-w-lg p-0"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="border-border flex items-center justify-between border-b px-4 py-3">
          <DialogTitle className="text-navy text-sm font-bold">
            {t("title")}
          </DialogTitle>
          <kbd className="border-border text-text-secondary rounded-btn border px-1.5 py-0.5 font-mono text-[0.6875rem]">
            {t("kbdHint")}
          </kbd>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2">
          {filtered.length === 0 && !showModelSection && (
            <p className="text-text-secondary px-3 py-6 text-center text-sm">
              {t("empty")}
            </p>
          )}
          {[...groups.entries()].map(([key, entries]) => (
            <div key={key} className="mb-1 last:mb-0">
              <p className="text-text-secondary px-3 py-1.5 text-[0.6875rem] font-bold tracking-[0.04em] uppercase">
                {GROUP_LABEL_KEY[key]
                  ? t(GROUP_LABEL_KEY[key]!)
                  : t("groupWorkspace")}
              </p>
              {entries.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  data-testid={`palette-item-${entry.id}`}
                  onClick={() => select(entry)}
                  className={cn(
                    "rounded-btn hover:bg-navy-50 focus-visible:ring-accent focus-visible:-ring-offset-1 flex w-full flex-col items-start gap-0.5 px-3 py-2 text-start outline-none focus-visible:ring-2",
                  )}
                >
                  <span className="text-navy text-sm font-semibold">
                    {entry.label[locale]}
                  </span>
                  <span className="text-text-secondary line-clamp-1 text-xs">
                    {entry.request.question}
                  </span>
                </button>
              ))}
            </div>
          ))}
          {showModelSection && (
            <div className="mb-1 last:mb-0">
              <p className="text-text-secondary px-3 py-1.5 text-[0.6875rem] font-bold tracking-[0.04em] uppercase">
                {t("groupModel")}
              </p>
              {MODEL_EDIT_BEATS.map((beat) => (
                <button
                  key={beat.id}
                  type="button"
                  data-testid={`palette-item-${beat.id}`}
                  onClick={() => selectModelEdit(beat)}
                  className={cn(
                    "rounded-btn hover:bg-navy-50 focus-visible:ring-accent focus-visible:-ring-offset-1 flex w-full flex-col items-start gap-0.5 px-3 py-2 text-start outline-none focus-visible:ring-2",
                  )}
                >
                  <span className="text-navy text-sm font-semibold">
                    {tModelLabel(beat.chipKey)}
                  </span>
                  <span className="text-text-secondary line-clamp-1 text-xs">
                    {tChip(beat.chipKey)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
