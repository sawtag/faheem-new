/**
 * POST /api/generate/[artifact], artifact ∈ xlsx|docx|pptx|all. Streams
 * choreographed progress (assembling → building → writing, per artifact,
 * loosely modeled on the chat SSE stage/done shapes, protocol in
 * components/generate/protocol.ts), calls the real T4.1/T4.2 builders, writes
 * Lunar-branded files to public/artifacts/, and upserts data/artifacts.json
 * (idempotent, regenerating an artifact replaces its file + entry, keyed
 * `${workspace}-${kind}`, never duplicates). One audit entry per artifact.
 *
 * FAHEEM_ARTIFACTS_DIR / FAHEEM_ARTIFACTS_JSON override the write targets
 * (tests only, never the committed demo fallbacks). FAHEEM_GENERATE_STEP_MS
 * paces the per-phase choreography (default 600ms; tests set 0).
 */
import fs from "node:fs";
import path from "node:path";
import { buildJahezWorkbook } from "@/lib/generate/xlsx";
import { buildIcMemo } from "@/lib/generate/docx";
import { buildBoardDeck } from "@/lib/generate/pptx";
import { buildDarbMemo, darbSourceCount } from "@/lib/generate/darb-memo";
import { loadModelInputs } from "@/lib/generate/shared";
import { appendAudit } from "@/lib/audit";
import {
  ArtifactMetaSchema,
  type ArtifactMeta,
  type Localized,
} from "@/lib/types";
import {
  ARTIFACT_KINDS,
  serializeGenerateEvent,
  type ArtifactKind,
  type GenerateEvent,
} from "@/components/generate/protocol";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_WORKSPACE = "jahez"; // ?workspace= default, keeps existing jahez behavior byte-for-byte

/** Per-workspace builder/meta registry. A workspace only supports the kinds it lists. */
interface WorkspaceRegistry {
  builders: Partial<Record<ArtifactKind, () => Promise<Buffer>>>;
  fileNames: Partial<Record<ArtifactKind, string>>;
  names: Partial<Record<ArtifactKind, Localized>>;
  /** distinct cited source docs for this workspace's artifacts; defaults to the Jahez model-inputs count. */
  sourceCount?: () => number;
}

const WORKSPACES: Record<string, WorkspaceRegistry> = {
  jahez: {
    builders: {
      xlsx: buildJahezWorkbook,
      docx: buildIcMemo,
      pptx: buildBoardDeck,
    },
    fileNames: {
      xlsx: "jahez-valuation-model.xlsx",
      docx: "jahez-ic-memo.docx",
      pptx: "jahez-board-deck.pptx",
    },
    names: {
      xlsx: { en: "Jahez · Valuation Model", ar: "جاهز · نموذج التقييم" },
      docx: { en: "Jahez · IC Memo", ar: "جاهز · مذكرة لجنة الاستثمار" },
      pptx: {
        en: "Jahez · Board Deck",
        ar: "جاهز · العرض التقديمي لمجلس الإدارة",
      },
    },
  },
  darb: {
    builders: { docx: buildDarbMemo },
    fileNames: { docx: "darb-screening-memo.docx" },
    names: {
      docx: {
        en: "Darb Screening Memo",
        ar: "مذكرة فرز درب للجنة الاستثمار",
      },
    },
    sourceCount: darbSourceCount,
  },
};

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

function stepMs(): number {
  const raw = process.env.FAHEEM_GENERATE_STEP_MS;
  const n = raw !== undefined ? Number.parseInt(raw, 10) : NaN;
  // 400ms per phase: the three-stage choreography reads as real work per
  // artifact (~1.3s each, ~4s for the three-file package on a warm server)
  // without stalling the stage. Override with FAHEEM_GENERATE_STEP_MS.
  return Number.isFinite(n) ? n : 400;
}

/** public/artifacts by default; FAHEEM_ARTIFACTS_DIR overrides (tests only). */
function publicDir(): string {
  return (
    process.env.FAHEEM_ARTIFACTS_DIR ||
    path.join(process.cwd(), "public/artifacts")
  );
}

/** data/artifacts.json by default; FAHEEM_ARTIFACTS_JSON overrides (tests only). */
function jsonPath(): string {
  return (
    process.env.FAHEEM_ARTIFACTS_JSON ||
    path.join(process.cwd(), "data/artifacts.json")
  );
}

/** Distinct cited source docs behind the model, same figure for every Jahez
 * artifact (all three builders read the same model-inputs.json); other
 * workspaces supply their own `sourceCount()` in the registry. */
function distinctSources(): number {
  const docs = new Set<string>();
  // Jahez inputs only: model-inputs.json also carries the darb.* screening
  // figures, whose data-room source must not inflate the Jahez artifacts'
  // "Verified · N sources" caption.
  for (const [key, input] of loadModelInputs()) {
    if (!key.startsWith("darb.")) docs.add(input.sourceDoc);
  }
  return docs.size;
}

/** Atomic upsert keyed by id, regenerating replaces the entry, never duplicates. */
function upsertArtifact(meta: ArtifactMeta): void {
  const file = jsonPath();
  let entries: ArtifactMeta[] = [];
  if (fs.existsSync(file)) {
    const parsed = ArtifactMetaSchema.array().safeParse(
      JSON.parse(fs.readFileSync(file, "utf-8")),
    );
    if (parsed.success) entries = parsed.data;
  }
  entries = entries.filter((e) => e.id !== meta.id);
  entries.push(meta);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(entries, null, 2) + "\n");
  fs.renameSync(tmp, file);
}

async function generateOne(
  workspace: string,
  registry: WorkspaceRegistry,
  kind: ArtifactKind,
  emit: (event: GenerateEvent) => void,
  ms: number,
): Promise<void> {
  try {
    emit({
      type: "stage",
      artifact: kind,
      phase: "assembling",
      status: "start",
    });
    if (ms > 0) await sleep(ms);
    emit({
      type: "stage",
      artifact: kind,
      phase: "assembling",
      status: "done",
    });

    emit({ type: "stage", artifact: kind, phase: "building", status: "start" });
    const buf = await registry.builders[kind]!();
    if (ms > 0) await sleep(ms);
    emit({ type: "stage", artifact: kind, phase: "building", status: "done" });

    emit({ type: "stage", artifact: kind, phase: "writing", status: "start" });
    const dir = publicDir();
    fs.mkdirSync(dir, { recursive: true });
    const fileName = registry.fileNames[kind]!;
    fs.writeFileSync(path.join(dir, fileName), buf);
    if (ms > 0) await sleep(ms);
    emit({ type: "stage", artifact: kind, phase: "writing", status: "done" });

    const meta: ArtifactMeta = {
      id: `${workspace}-${kind}`,
      kind,
      name: registry.names[kind]!,
      workspace,
      file: `/artifacts/${fileName}`,
      createdAt: new Date().toISOString(),
      sources: (registry.sourceCount ?? distinctSources)(),
    };
    upsertArtifact(meta);
    appendAudit({
      ts: meta.createdAt,
      user: "Ali",
      context: `workspace:${workspace}`,
      action: "artifact",
      artifact: fileName,
    });
    emit({ type: "artifact", artifact: kind, meta, sizeBytes: buf.length });
  } catch (err) {
    emit({
      type: "error",
      artifact: kind,
      message: err instanceof Error ? err.message : "Generation failed",
    });
  }
}

/** Kinds to generate for a workspace/artifact-param pair, "all" = every kind that workspace registers. */
function parseKinds(
  registry: WorkspaceRegistry,
  param: string,
): ArtifactKind[] | null {
  if (param === "all") {
    return ARTIFACT_KINDS.filter((k) => registry.builders[k]);
  }
  if (
    (ARTIFACT_KINDS as readonly string[]).includes(param) &&
    registry.builders[param as ArtifactKind]
  ) {
    return [param as ArtifactKind];
  }
  return null;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ artifact: string }> },
): Promise<Response> {
  const { artifact } = await params;
  const workspace =
    new URL(request.url).searchParams.get("workspace") || DEFAULT_WORKSPACE;
  const registry = WORKSPACES[workspace];
  const kinds = registry ? parseKinds(registry, artifact) : null;
  if (!registry || !kinds) {
    return Response.json({ error: "Unknown artifact" }, { status: 400 });
  }

  const ms = stepMs();
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (event: GenerateEvent): void => {
        controller.enqueue(encoder.encode(serializeGenerateEvent(event)));
      };
      for (const kind of kinds) {
        await generateOne(workspace, registry, kind, emit, ms);
      }
      emit({ type: "done" });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
