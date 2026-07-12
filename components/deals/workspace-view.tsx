"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowLeft,
  BadgeCheck,
  Download,
  FileText,
  MessageSquareText,
  Presentation,
  Sheet,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { GlyphBackdrop } from "@/components/ui/glyph-backdrop";
import { Logo } from "@/components/ui/logo";
import { LogoTile } from "@/components/ui/logo-tile";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Composer, type ComposerSubmit } from "@/components/chat/composer";
import { DocumentsTab } from "@/components/deals/documents-tab";
import { LeadershipGrid } from "@/components/deals/leadership-grid";
import { StageBanner } from "@/components/deals/stage-banner";
import {
  WorkspaceOverview,
  type WorkspaceStat,
} from "@/components/deals/workspace-overview";
import { recordStageAdvance } from "@/app/(app)/deals/[company]/actions";
import { serializeContext } from "@/lib/chats";
import { cn, formatDate } from "@/lib/utils";
import type { Leader } from "@/lib/deals";
import type {
  ArtifactMeta,
  Cite,
  CorpusDoc,
  Deal,
  Lang,
  Localized,
} from "@/lib/types";

const PdfPanel = dynamic(() => import("@/components/chat/pdf-panel"), {
  ssr: false,
  loading: () => <div className="bg-card size-full" />,
});

const EASE = [0.4, 0, 0.2, 1] as const;

const KIND_TILE: Record<
  ArtifactMeta["kind"],
  { icon: typeof Sheet; tile: string }
> = {
  xlsx: { icon: Sheet, tile: "bg-accent-50 text-accent-700" },
  docx: { icon: FileText, tile: "bg-navy-50 text-navy-700" },
  pptx: { icon: Presentation, tile: "bg-warning-50 text-warning-700" },
};

export interface WorkspaceChat {
  id: string;
  title: Localized;
  createdAt: string;
  messageCount: number;
}

/**
 * Company workspace (T3.3): serif display title (serif home #2), scoped
 * composer, stage banner with the human gate, and the five tabs. The PdfPanel
 * slides in as a fixed inline-end panel for scorecard citations, document-room
 * "Open", and leadership source links — one viewer, three entry points.
 */
export function WorkspaceView({
  deal,
  docs,
  chats,
  artifacts,
  leaders,
  stats,
}: {
  deal: Deal;
  docs: CorpusDoc[];
  chats: WorkspaceChat[];
  artifacts: ArtifactMeta[];
  leaders: Leader[];
  stats: WorkspaceStat[];
}) {
  const t = useTranslations("deals.workspace");
  const locale = useLocale() as Lang;
  const router = useRouter();

  const [stage, setStage] = React.useState(deal.stage);
  const [openDoc, setOpenDoc] = React.useState<Cite | null>(null);

  const docTitle = (docId: string) =>
    docs.find((d) => d.id === docId)?.title[locale] ?? docId;

  function onComposerSubmit({ question }: ComposerSubmit) {
    const context = serializeContext({
      kind: "workspace",
      companyId: deal.id,
    });
    router.push(
      `/chat/new?q=${encodeURIComponent(question)}&context=${encodeURIComponent(context)}`,
    );
  }

  function onAdvance() {
    setStage("analysis");
    void recordStageAdvance(deal.id);
  }

  const openCite = (cite: Cite) => setOpenDoc(cite);
  const slideFrom = locale === "ar" ? -28 : 28;

  return (
    <>
      <motion.main
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: EASE }}
        className="mx-auto max-w-[1040px] px-8 pt-10 pb-16"
      >
        <Link
          href="/deals"
          className="text-text-secondary hover:text-navy focus-visible:ring-accent focus-visible:ring-offset-bg rounded-btn inline-flex items-center gap-1.5 text-[0.8125rem] font-semibold transition-colors duration-[var(--duration-fast)] ease-[var(--ease)] outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
        >
          <ArrowLeft className="size-4 rtl:-scale-x-100" aria-hidden="true" />
          {t("back")}
        </Link>

        <header className="relative isolate mt-5 flex items-center gap-4">
          <GlyphBackdrop variant="panel" />
          {deal.logo ? (
            <span className="border-border bg-card rounded-card grid size-14 shrink-0 place-items-center border p-2.5 shadow-[var(--shadow-card)]">
              <Image
                src={deal.logo}
                alt=""
                width={36}
                height={36}
                unoptimized
                className="size-full object-contain"
              />
            </span>
          ) : (
            <span className="border-border bg-card rounded-card grid size-14 shrink-0 place-items-center border p-2 shadow-[var(--shadow-card)]">
              <LogoTile
                label={deal.name.en}
                initial={deal.name[locale].charAt(0)}
                size={40}
              />
            </span>
          )}
          <div className="min-w-0">
            {/* Serif display title (serif home #2). The explicit var stack
                mirrors the --font-serif token: the next/font variables are
                declared on <body>, so `font-serif`'s :root-level var() chain
                computes as invalid there (flagged to fable) — referencing the
                font vars at this element resolves them correctly either way. */}
            <h1
              className="text-navy font-serif text-4xl leading-tight font-bold"
              style={{
                fontFamily:
                  "var(--font-lora), var(--font-amiri), Georgia, serif",
              }}
            >
              {deal.name[locale]}
            </h1>
            <p className="text-text-secondary mt-1 text-[0.9375rem]">
              {deal.sector[locale]}
              <span className="mx-2" aria-hidden="true">
                ·
              </span>
              {deal.statusLine[locale]}
            </p>
          </div>
        </header>

        <section
          aria-label={t("ask", { company: deal.name[locale] })}
          className="mt-8"
        >
          <h2 className="text-navy mb-3 text-[0.9375rem] font-bold">
            {t("ask", { company: deal.name[locale] })}
          </h2>
          <Composer
            context={{ kind: "workspace", companyId: deal.id }}
            companyName={deal.name[locale]}
            onSubmit={onComposerSubmit}
            lang={locale}
          />
        </section>

        <div className="mt-6">
          <StageBanner
            stage={stage}
            declineReason={deal.declineReason?.[locale]}
            onAdvance={onAdvance}
          />
        </div>

        <Tabs defaultValue="overview" className="mt-8">
          <TabsList>
            <TabsTrigger value="overview">{t("tabs.overview")}</TabsTrigger>
            <TabsTrigger value="documents">{t("tabs.documents")}</TabsTrigger>
            <TabsTrigger value="chats">{t("tabs.chats")}</TabsTrigger>
            <TabsTrigger value="artifacts">{t("tabs.artifacts")}</TabsTrigger>
            {leaders.length > 0 && (
              <TabsTrigger value="leadership">
                {t("tabs.leadership")}
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <WorkspaceOverview deal={deal} stats={stats} onCite={openCite} />
          </TabsContent>

          <TabsContent value="documents" className="mt-6">
            <DocumentsTab
              docs={docs}
              onOpen={(docId) => setOpenDoc({ docId, page: 1 })}
            />
          </TabsContent>

          <TabsContent value="chats" className="mt-6">
            <ChatsTab chats={chats} />
          </TabsContent>

          <TabsContent value="artifacts" className="mt-6">
            <ArtifactsTab artifacts={artifacts} />
          </TabsContent>

          {leaders.length > 0 && (
            <TabsContent value="leadership" className="mt-6">
              <LeadershipGrid
                leaders={leaders}
                onSource={(packPage) =>
                  setOpenDoc({ docId: "leadership-pack", page: packPage })
                }
              />
            </TabsContent>
          )}
        </Tabs>
      </motion.main>

      <AnimatePresence>
        {openDoc && (
          <motion.aside
            key="pdf"
            initial={{ opacity: 0, x: slideFrom }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: slideFrom }}
            transition={{ duration: 0.25, ease: EASE }}
            className="border-border bg-card fixed inset-y-0 end-0 z-40 w-[44%] max-w-[640px] min-w-[400px] border-s shadow-[var(--shadow-modal)]"
          >
            <PdfPanel
              key={openDoc.docId}
              docId={openDoc.docId}
              page={openDoc.page}
              title={docTitle(openDoc.docId)}
              onClose={() => setOpenDoc(null)}
              onPageChange={(page) =>
                setOpenDoc((d) => (d ? { ...d, page } : d))
              }
            />
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}

// ─────────────────────────────── tab bodies ───────────────────────────────

function ChatsTab({ chats }: { chats: WorkspaceChat[] }) {
  const t = useTranslations("deals.chats");
  const locale = useLocale() as Lang;

  if (chats.length === 0) {
    return (
      <p className="text-text-secondary py-12 text-center text-sm">
        {t("empty")}
      </p>
    );
  }

  return (
    <Card padding="none" elevated>
      <ul>
        {chats.map((chat, i) => (
          <li
            key={chat.id}
            className={cn(i < chats.length - 1 && "border-border border-b")}
          >
            <Link
              href={`/chat/${chat.id}`}
              className="hover:bg-navy-50/50 focus-visible:ring-accent focus-visible:ring-offset-card flex items-center gap-3 px-5 py-3.5 transition-colors duration-[var(--duration-fast)] ease-[var(--ease)] outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            >
              <span className="bg-navy-50 text-navy-600 rounded-btn grid size-9 shrink-0 place-items-center">
                <MessageSquareText className="size-4" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-navy truncate text-sm font-semibold">
                  {chat.title[locale]}
                </p>
                <p className="text-text-secondary financial mt-0.5 text-xs">
                  {formatDate(chat.createdAt, locale)}
                  <span className="mx-1.5" aria-hidden="true">
                    ·
                  </span>
                  {t("messages", { count: chat.messageCount })}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function ArtifactsTab({ artifacts }: { artifacts: ArtifactMeta[] }) {
  const t = useTranslations("deals.artifacts");
  const locale = useLocale() as Lang;

  if (artifacts.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <Logo
          variant="icon"
          tone="mono"
          decorative
          size={48}
          className="text-navy-300"
        />
        <div className="flex flex-col gap-1.5">
          <p className="text-navy text-[0.9375rem] font-semibold">
            {t("emptyTitle")}
          </p>
          <p className="text-text-secondary text-[0.8125rem]">
            {t("emptyCaption")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {artifacts.map((artifact) => {
        const { icon: Icon, tile } = KIND_TILE[artifact.kind];
        return (
          <li key={artifact.id} className="min-w-0">
            <Card hover elevated className="group relative p-5">
              <div className="flex items-start justify-between">
                <span
                  className={cn(
                    "rounded-btn grid size-10 shrink-0 place-items-center",
                    tile,
                  )}
                >
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <a
                  href={artifact.file}
                  download
                  aria-label={t("download")}
                  className="text-text-secondary hover:bg-navy-50 hover:text-navy focus-visible:ring-accent focus-visible:ring-offset-card rounded-btn grid size-8 place-items-center opacity-0 transition-opacity duration-[var(--duration-fast)] ease-[var(--ease)] outline-none group-focus-within:opacity-100 group-hover:opacity-100 focus-visible:ring-2 focus-visible:ring-offset-2"
                >
                  <Download className="size-4" aria-hidden="true" />
                </a>
              </div>
              <p className="text-navy mt-3 truncate text-sm font-semibold">
                {artifact.name[locale]}
              </p>
              <p className="text-text-secondary financial mt-1 text-xs">
                {formatDate(artifact.createdAt, locale)}
              </p>
              {artifact.sources !== undefined && (
                <p className="text-accent-700 mt-2 flex items-center gap-1.5 text-xs font-medium">
                  <BadgeCheck
                    className="size-3.5 shrink-0"
                    aria-hidden="true"
                  />
                  {t("verified", { n: artifact.sources })}
                </p>
              )}
            </Card>
          </li>
        );
      })}
    </ul>
  );
}
