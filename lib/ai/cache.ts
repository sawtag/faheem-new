/**
 * Golden-path cache: the demo's record/replay store, keyed exactly per the
 * cache-key spec in lib/types.ts. scripts/record-goldens.ts and the ⌘K demo
 * palette MUST compute the same key — the formula lives here, nowhere else.
 *
 *   contextKey = ctx.kind === "workspace" ? `workspace:${ctx.companyId}` : ctx.kind
 *   key = sha1([question, lang, contextKey, agent ?? "", (docIds ?? []).join(",")].join("|"))
 */
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  CacheEntrySchema,
  type CacheEntry,
  type ChatContext,
  type ChatRequest,
} from "@/lib/types";

const repoRoot = process.cwd();

/** data/demo-cache by default; FAHEEM_CACHE_DIR overrides (used by tests). */
function cacheDir(): string {
  return process.env.FAHEEM_CACHE_DIR || path.join(repoRoot, "data/demo-cache");
}

export function contextKey(context: ChatContext): string {
  return context.kind === "workspace"
    ? `workspace:${context.companyId}`
    : context.kind;
}

export function cacheKey(req: ChatRequest): string {
  const parts = [
    req.question,
    req.lang,
    contextKey(req.context),
    req.agent ?? "",
    (req.docIds ?? []).join(","),
  ];
  return createHash("sha1").update(parts.join("|")).digest("hex");
}

/** Reads + validates a cached entry, or null if absent/corrupt. */
export function readCacheEntry(key: string): CacheEntry | null {
  const file = path.join(cacheDir(), `${key}.json`);
  if (!fs.existsSync(file)) return null;
  try {
    const parsed = CacheEntrySchema.safeParse(
      JSON.parse(fs.readFileSync(file, "utf-8")),
    );
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/** Atomically persists a recorded entry (FAHEEM_RECORD=1). */
export function writeCacheEntry(entry: CacheEntry): void {
  const dir = cacheDir();
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${entry.key}.json`);
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(entry, null, 2) + "\n");
  fs.renameSync(tmp, file);
}
