import fs from "node:fs";
import path from "node:path";
import { getLocale, getTranslations } from "next-intl/server";
import { GlyphBackdrop } from "@/components/ui/glyph-backdrop";
import { SentimentCard } from "@/components/deals/sentiment-card";
import { WorkspaceAnalytics } from "@/components/deals/workspace-analytics";
import { DEALS, dealById } from "@/lib/deals";
import {
  FIRM,
  icQueue,
  pipelineSummary,
  sectorCapWarn,
  sectorHeadroomPp,
} from "@/lib/firm";
import { runById, runElapsedMinutes } from "@/lib/runs";
import { getAgent } from "@/lib/ai/agents";
import manifest from "@/data/corpus/manifest.json";
import artifactsData from "@/data/artifacts.json";
import {
  ArtifactMetaSchema,
  AuditEntrySchema,
  type AuditEntry,
  type CorpusDoc,
  type Lang,
  type Localized,
} from "@/lib/types";
import { StatsRow, type DashboardStats } from "./stats-row";
import {
  RunsPanel,
  type OutputDisplay,
  type RunDisplay,
  type ScreeningRunDisplay,
} from "./runs-panel";
import { MacroCard, type MacroLineData } from "./macro-card";
import { RecentActivity, type RecentDeal } from "./recent-activity";

const DOC_TITLES = new Map(
  (manifest as CorpusDoc[]).map((d) => [d.id, d.title]),
);
function docTitle(id: string): Localized {
  return DOC_TITLES.get(id) ?? { en: id, ar: id };
}

/** Newest audit entries (default corpus file); a valid empty list if unreadable. */
function loadRecentActivity(limit = 6): AuditEntry[] {
  const file = path.join(process.cwd(), "data/audit-log.json");
  if (!fs.existsSync(file)) return [];
  const parsed = AuditEntrySchema.array().safeParse(
    JSON.parse(fs.readFileSync(file, "utf-8")),
  );
  if (!parsed.success) return [];
  return [...parsed.data]
    .sort((a, b) => b.ts.localeCompare(a.ts))
    .slice(0, limit);
}

/** Real on-disk size for a landed artifact (feeds the FileCard size chip). */
function artifactSize(file: string): number {
  const abs = path.join(process.cwd(), "public", file);
  return fs.existsSync(abs) ? fs.statSync(abs).size : 0;
}

/**
 * /dashboard, the investment firm's mission control (differentiation surface):
 * a governance-first overview of the firm, the orchestrated analysis runs, the
 * Jahez focus + Saudi macro backdrop, and the recent-analyses / activity rows.
 * Purely additive, new route + seeded data (data/firm.json, data/runs.json),
 * no chat-engine or golden contact. Every figure resolves to a source
 * (AGENTS.md rule 5); the loaders (lib/firm.ts, lib/runs.ts) zod-validate.
 */
export default async function DashboardPage() {
  const t = await getTranslations("dashboard");
  const locale = (await getLocale()) as Lang;

  const dateLine = new Intl.DateTimeFormat(
    locale === "ar" ? "ar-u-nu-latn" : "en-US",
    { weekday: "long", year: "numeric", month: "long", day: "numeric" },
  ).format(new Date());

  // ── stats ──
  const pipeline = pipelineSummary(DEALS);
  const queue = icQueue(DEALS);
  const stats: DashboardStats = {
    pipeline: { activeCount: pipeline.activeCount, byStage: pipeline.byStage },
    aum: { value: FIRM.aumSarBn.value, page: FIRM.aumSarBn.page },
    mandate: {
      exposure: FIRM.sectorExposurePct.value,
      cap: FIRM.sectorCapPct.value,
      headroomPp: sectorHeadroomPp(),
      warn: sectorCapWarn(),
      expPage: FIRM.sectorExposurePct.page,
      capPage: FIRM.sectorCapPct.page,
    },
    icQueue: { count: queue.count, nextName: queue.next?.name ?? null },
  };

  // ── analysis runs ──
  const deepDive = runById("run-jahez-deep-dive-001")!;
  const jahez = dealById("jahez")!;
  const run: RunDisplay = {
    workspace: deepDive.workspace,
    workspaceName: jahez.name,
    workspaceLogo: jahez.logo,
    citationsTotal: deepDive.citationsTotal,
    elapsedMin: runElapsedMinutes(deepDive),
    lanes: deepDive.lanes.map((lane) => {
      const agent = getAgent(lane.agent);
      return {
        agent: lane.agent,
        icon: agent.icon,
        nameEn: agent.name.en,
        nameAr: agent.name.ar,
        summary: lane.summary,
        docs: lane.docIds.map((id) => ({ id, title: docTitle(id) })),
      };
    }),
  };

  const artifacts = ArtifactMetaSchema.array().parse(artifactsData);
  const artifactById = new Map(artifacts.map((a) => [a.id, a]));
  const outputs: OutputDisplay[] = deepDive.outputs.flatMap((id) => {
    const meta = artifactById.get(id);
    return meta ? [{ meta, sizeBytes: artifactSize(meta.file) }] : [];
  });

  const screeningRun = runById("run-darb-screening-001")!;
  const darb = dealById("darb")!;
  const screening: ScreeningRunDisplay = {
    workspace: screeningRun.workspace,
    workspaceName: darb.name,
    workspaceLogo: darb.logo,
    checks: darb.screening?.rows.length ?? screeningRun.lanes.length,
  };

  // ── macro + recent + activity ──
  const macroLines: MacroLineData[] = FIRM.macro.map((m) => ({
    key: m.key,
    value: m.value,
    page: m.page,
  }));

  const recentDeals: RecentDeal[] = DEALS.map((d) => ({
    id: d.id,
    name: d.name,
    sector: d.sector,
    stage: d.stage,
    statusLine: d.statusLine,
    logo: d.logo,
  }));

  const workspaceNames: Record<string, Localized> = Object.fromEntries(
    DEALS.map((d) => [d.id, d.name]),
  );
  const activity = loadRecentActivity();

  return (
    <main className="mx-auto max-w-[1240px] px-8 pt-10 pb-16">
      <header className="relative isolate -mx-8 -mt-10 mb-8 px-8 pt-10 pb-6">
        <GlyphBackdrop variant="panel" />
        <h1 className="text-h1 text-navy relative z-10 font-extrabold">
          {t("title")}
        </h1>
        <p className="text-text-secondary relative z-10 mt-1.5 text-sm font-medium">
          {dateLine}
        </p>
        <p className="text-text-secondary relative z-10 mt-1 text-xs">
          {t("caption")}
        </p>
      </header>

      <div className="flex flex-col gap-8">
        <StatsRow stats={stats} />
        <RunsPanel run={run} outputs={outputs} screening={screening} />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="min-w-0 lg:col-span-2">
            <WorkspaceAnalytics />
          </div>
          <div className="flex flex-col gap-4">
            <MacroCard lines={macroLines} />
            <SentimentCard companyId="jahez" compact />
          </div>
        </div>
        <RecentActivity
          deals={recentDeals}
          activity={activity}
          workspaceNames={workspaceNames}
        />
      </div>
    </main>
  );
}
