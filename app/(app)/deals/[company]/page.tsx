import fs from "node:fs";
import path from "node:path";
import { notFound } from "next/navigation";
import {
  WorkspaceView,
  type WorkspaceChat,
} from "@/components/deals/workspace-view";
import type { WorkspaceStat } from "@/components/deals/workspace-overview";
import { LEADERS, dealById } from "@/lib/deals";
import { SEED_CHATS } from "@/lib/chats";
import manifest from "@/data/corpus/manifest.json";
import modelInputs from "@/data/model-inputs.json";
import {
  ArtifactMetaSchema,
  type ArtifactMeta,
  type CorpusDoc,
  type ModelInput,
} from "@/lib/types";

const DOCS = manifest as CorpusDoc[];
const INPUTS = modelInputs as ModelInput[];

/** Company docs first, then the Lunar mandate docs, then the shared market packs. */
function workspaceDocs(companyId: string): CorpusDoc[] {
  const own = DOCS.filter((d) => d.workspace === companyId);
  const lunar = DOCS.filter((d) => d.type === "lunar");
  const packs = DOCS.filter((d) => d.type === "public" && !d.workspace);
  return [...own, ...lunar, ...packs];
}

function workspaceChats(companyId: string): WorkspaceChat[] {
  return SEED_CHATS.filter(
    (c) => c.context.kind === "workspace" && c.context.companyId === companyId,
  ).map((c) => ({
    id: c.id,
    title: c.title,
    createdAt: c.createdAt,
    messageCount: c.messages.length,
  }));
}

/** data/artifacts.json is written by the generate route (T4.3), absent until then, a valid empty state. */
function workspaceArtifacts(companyId: string): ArtifactMeta[] {
  const file = path.join(process.cwd(), "data/artifacts.json");
  if (!fs.existsSync(file)) return [];
  const parsed = ArtifactMetaSchema.array().safeParse(
    JSON.parse(fs.readFileSync(file, "utf-8")),
  );
  return parsed.success
    ? parsed.data.filter((a) => a.workspace === companyId)
    : [];
}

/**
 * Jahez key figures, the three headline FY2025 entries read VERBATIM from
 * model-inputs.json (rule 5: no invented numbers), each carrying its source
 * doc + page for the caption. NI additionally shows the disclosed YoY delta.
 */
const JAHEZ_STATS: { key: string; input: string; delta?: string }[] = [
  { key: "gmv", input: "fy25.gmv" },
  { key: "netRevenue", input: "fy25.net_revenue" },
  { key: "netIncome", input: "fy25.net_income", delta: "fy25.net_income_yoy" },
];

function jahezStats(): WorkspaceStat[] {
  const byKey = new Map(INPUTS.map((i) => [i.key, i]));
  return JAHEZ_STATS.flatMap(({ key, input, delta }) => {
    const entry = byKey.get(input);
    const doc = entry && DOCS.find((d) => d.id === entry.sourceDoc);
    if (!entry || !doc) return [];
    const deltaEntry = delta ? byKey.get(delta) : undefined;
    return [
      {
        key,
        value: entry.value,
        docTitle: doc.title,
        page: entry.page,
        ...(deltaEntry ? { deltaPct: deltaEntry.value } : {}),
      },
    ];
  });
}

export default async function WorkspacePage({
  params,
}: {
  params: Promise<{ company: string }>;
}) {
  const { company } = await params;
  const deal = dealById(company);
  if (!deal) notFound();

  return (
    <WorkspaceView
      deal={deal}
      docs={workspaceDocs(company)}
      chats={workspaceChats(company)}
      artifacts={workspaceArtifacts(company)}
      leaders={company === "jahez" ? LEADERS : []}
      stats={company === "jahez" ? jahezStats() : []}
      hasModel={company === "jahez"}
    />
  );
}
