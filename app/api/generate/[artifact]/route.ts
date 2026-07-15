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

const WORKSPACE = "jahez"; // the demo's single deliverables workspace

const FILE_NAMES: Record<ArtifactKind, string> = {
  xlsx: "jahez-valuation-model.xlsx",
  docx: "jahez-ic-memo.docx",
  pptx: "jahez-board-deck.pptx",
};

const ARTIFACT_NAMES: Record<ArtifactKind, Localized> = {
  xlsx: { en: "Jahez · Valuation Model", ar: "جاهز · نموذج التقييم" },
  docx: { en: "Jahez · IC Memo", ar: "جاهز · مذكرة لجنة الاستثمار" },
  pptx: {
    en: "Jahez · Board Deck",
    ar: "جاهز · العرض التقديمي لمجلس الإدارة",
  },
};

const BUILDERS: Record<ArtifactKind, () => Promise<Buffer>> = {
  xlsx: buildJahezWorkbook,
  docx: buildIcMemo,
  pptx: buildBoardDeck,
};

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

function stepMs(): number {
  const raw = process.env.FAHEEM_GENERATE_STEP_MS;
  const n = raw !== undefined ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(n) ? n : 600;
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

/** Distinct cited source docs behind the model, same figure for every artifact
 * (all three builders read the same model-inputs.json). */
function distinctSources(): number {
  const docs = new Set<string>();
  for (const input of loadModelInputs().values()) docs.add(input.sourceDoc);
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
    const buf = await BUILDERS[kind]();
    if (ms > 0) await sleep(ms);
    emit({ type: "stage", artifact: kind, phase: "building", status: "done" });

    emit({ type: "stage", artifact: kind, phase: "writing", status: "start" });
    const dir = publicDir();
    fs.mkdirSync(dir, { recursive: true });
    const fileName = FILE_NAMES[kind];
    fs.writeFileSync(path.join(dir, fileName), buf);
    if (ms > 0) await sleep(ms);
    emit({ type: "stage", artifact: kind, phase: "writing", status: "done" });

    const meta: ArtifactMeta = {
      id: `${WORKSPACE}-${kind}`,
      kind,
      name: ARTIFACT_NAMES[kind],
      workspace: WORKSPACE,
      file: `/artifacts/${fileName}`,
      createdAt: new Date().toISOString(),
      sources: distinctSources(),
    };
    upsertArtifact(meta);
    appendAudit({
      ts: meta.createdAt,
      user: "Ali",
      context: `workspace:${WORKSPACE}`,
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

function parseArtifact(param: string): ArtifactKind[] | null {
  if (param === "all") return [...ARTIFACT_KINDS];
  return (ARTIFACT_KINDS as readonly string[]).includes(param)
    ? [param as ArtifactKind]
    : null;
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ artifact: string }> },
): Promise<Response> {
  const { artifact } = await params;
  const kinds = parseArtifact(artifact);
  if (!kinds) {
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
        await generateOne(kind, emit, ms);
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
