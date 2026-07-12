/**
 * Corpus manifest loader + document-block builder for the chat engine.
 *
 * Context filtering (per AGENTS.md data policy + T2.1 card):
 *   workspace → that workspace's docs + all Lunar docs + the two firm-wide packs
 *   ic        → thara-analysis + lunar-ic-charter + lunar-portfolio + the packs
 *               (+ workspace docs of any analysis- or ic-review-stage deal — the
 *               IC room compares analysis-complete deals, so Jahez's filings are
 *               live-rankable even while its deal sits at stage "analysis")
 *   firm      → Lunar docs + the packs
 *   #-refs (docIds) → restrict to the listed ids, but always keep the Lunar IC
 *               Charter available to the screening / IC flavors (they must cite it)
 *
 * Doc ORDER is manifest order — citation `document_index` maps back through this
 * exact array, so the ordering here is load-bearing for citation → docId mapping.
 */
import fs from "node:fs";
import path from "node:path";
import {
  CorpusDocSchema,
  DealSchema,
  type ChatContext,
  type ChatRequest,
  type CorpusDoc,
  type Lang,
} from "@/lib/types";

const repoRoot = process.cwd();
const FIRM_PACKS = ["industry-news-pack", "market-data-comps"];
const IC_CHARTER = "lunar-ic-charter";

let manifestCache: CorpusDoc[] | null = null;
let icRankableWorkspacesCache: Set<string> | null = null;

export function loadManifest(): CorpusDoc[] {
  if (!manifestCache) {
    const raw = JSON.parse(
      fs.readFileSync(
        path.join(repoRoot, "data/corpus/manifest.json"),
        "utf-8",
      ),
    );
    manifestCache = CorpusDocSchema.array().parse(raw);
  }
  return manifestCache;
}

/**
 * Workspaces (deal ids) rankable by the IC room — deals at stage "analysis" or
 * "ic-review" (data-driven from deals.json). Gate C(a) follow-up: Jahez stays
 * stage "analysis" yet must be live-rankable from its filings.
 */
function icRankableWorkspaces(): Set<string> {
  if (!icRankableWorkspacesCache) {
    let ids: string[] = [];
    try {
      const raw = JSON.parse(
        fs.readFileSync(path.join(repoRoot, "data/deals.json"), "utf-8"),
      );
      ids = DealSchema.array()
        .parse(raw)
        .filter((d) => d.stage === "analysis" || d.stage === "ic-review")
        .map((d) => d.id);
    } catch {
      ids = [];
    }
    icRankableWorkspacesCache = new Set(ids);
  }
  return icRankableWorkspacesCache;
}

/** Filter the manifest for a context, returning docs in manifest order. */
export function filterDocs(
  context: ChatContext,
  docIds?: string[],
  agent?: string,
): CorpusDoc[] {
  const manifest = loadManifest();

  // #-refs: narrow to exactly the listed docs (+ charter for screening / IC).
  if (docIds && docIds.length > 0) {
    const keepCharter = context.kind === "ic" || agent === "screening";
    const wanted = new Set(
      docIds.filter((id) => manifest.some((d) => d.id === id)),
    );
    if (keepCharter) wanted.add(IC_CHARTER);
    return manifest.filter((d) => wanted.has(d.id));
  }

  const isPack = (d: CorpusDoc) => FIRM_PACKS.includes(d.id);
  const wanted = new Set<string>();

  if (context.kind === "workspace") {
    for (const d of manifest) {
      if (
        d.workspace === context.companyId ||
        d.type === "lunar" ||
        isPack(d)
      ) {
        wanted.add(d.id);
      }
    }
  } else if (context.kind === "ic") {
    const icWs = icRankableWorkspaces();
    for (const d of manifest) {
      if (
        d.id === "thara-analysis" ||
        d.id === IC_CHARTER ||
        d.id === "lunar-portfolio" ||
        isPack(d) ||
        (d.workspace !== undefined && icWs.has(d.workspace))
      ) {
        wanted.add(d.id);
      }
    }
  } else {
    for (const d of manifest) {
      if (d.type === "lunar" || isPack(d)) wanted.add(d.id);
    }
  }

  return manifest.filter((d) => wanted.has(d.id));
}

// ─────────────────────────── document blocks ───────────────────────────

type DocSource =
  | { type: "file"; file_id: string }
  | { type: "base64"; media_type: "application/pdf"; data: string };

export interface DocBlock {
  type: "document";
  source: DocSource;
  title: string;
  citations: { enabled: true };
  cache_control?: { type: "ephemeral"; ttl: "1h" };
}

/** File-reader seam — the default reads from disk; tests inject fake bytes. */
export type FileReader = (absolutePath: string) => Buffer;

const defaultRead: FileReader = (absolutePath) => fs.readFileSync(absolutePath);

/**
 * One document block per doc, in the given order. Files-API `file_id` reference
 * when the manifest has a fileId, else base64. `cache_control` (1h TTL) lands on
 * the LAST block only — that single breakpoint caches the system prompt + all
 * docs; only the trailing question varies.
 */
export function buildDocBlocks(
  docs: CorpusDoc[],
  lang: Lang,
  readFileBytes: FileReader = defaultRead,
): DocBlock[] {
  const last = docs.length - 1;
  return docs.map((doc, i) => {
    const source: DocSource = doc.fileId
      ? { type: "file", file_id: doc.fileId }
      : {
          type: "base64",
          media_type: "application/pdf",
          data: readFileBytes(path.join(repoRoot, doc.path)).toString("base64"),
        };
    const block: DocBlock = {
      type: "document",
      source,
      title: doc.title[lang],
      citations: { enabled: true },
    };
    if (i === last) block.cache_control = { type: "ephemeral", ttl: "1h" };
    return block;
  });
}

export interface CorpusContext {
  docs: CorpusDoc[];
  blocks: DocBlock[];
}

/** Filtered docs + parallel document blocks for a chat request. */
export function buildCorpusContext(
  req: ChatRequest,
  readFileBytes?: FileReader,
): CorpusContext {
  const docs = filterDocs(req.context, req.docIds, req.agent);
  const blocks = buildDocBlocks(docs, req.lang, readFileBytes);
  return { docs, blocks };
}
