/**
 * Validates the static data pack against the zod schemas in lib/types.ts.
 * Every file is OPTIONAL, data lands progressively from P1 tasks. A missing
 * file is a no-op ("skipped"), an invalid one fails the run (exit 1).
 *
 * Cross-checks (only run when both sides of a check are present):
 *   - ModelInput.sourceDoc and every screening/icMetrics cite.docId resolve
 *     to a manifest doc, and cite.page <= that doc's page count
 *   - every manifest CorpusDoc.path exists on disk
 *   - ids (manifest docs, deals, model-input keys, artifacts, seed chats)
 *     are unique within their own file
 *
 * Run: npm run validate:data (tsx scripts/validate-data.ts)
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { z } from "zod";
import {
  ArtifactMetaSchema,
  AuditEntrySchema,
  CorpusDocSchema,
  DealSchema,
  ModelInputSchema,
  SeedChatSchema,
  SentimentEntrySchema,
  SocialPostSchema,
  type CorpusDoc,
  type Deal,
  type ModelInput,
  type SentimentEntry,
  type SocialPost,
} from "../lib/types";
import { CustomSkillSchema } from "../lib/custom-skills";

const repoRoot = path.resolve(import.meta.dirname, "..");

let failed = false;

function fail(message: string) {
  failed = true;
  console.error(`  ✗ ${message}`);
}

/** Loads + zod-validates one optional data file. Returns the parsed array, or null if absent/invalid. */
function loadAndValidate<Schema extends z.ZodTypeAny>(
  relativePath: string,
  schema: Schema,
): z.infer<Schema> | null {
  const absolutePath = path.join(repoRoot, relativePath);
  if (!existsSync(absolutePath)) {
    console.log(`- ${relativePath}: skipped (not yet authored)`);
    return null;
  }

  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(absolutePath, "utf-8"));
  } catch (error) {
    failed = true;
    console.error(`✗ ${relativePath}: invalid JSON`);
    console.error(`  ${(error as Error).message}`);
    return null;
  }

  const result = schema.safeParse(raw);
  if (!result.success) {
    failed = true;
    console.error(`✗ ${relativePath}: schema validation failed`);
    for (const issue of result.error.issues) {
      console.error(
        `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`,
      );
    }
    return null;
  }

  console.log(
    `✓ ${relativePath}: valid (${(raw as unknown[]).length} entries)`,
  );
  return result.data;
}

function checkUniqueIds(label: string, ids: string[]) {
  const seen = new Set<string>();
  const dupes = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) dupes.add(id);
    seen.add(id);
  }
  if (dupes.size > 0) {
    fail(`${label}: duplicate ids: ${[...dupes].join(", ")}`);
  }
}

function checkCite(
  label: string,
  docId: string,
  page: number,
  manifestById: Map<string, CorpusDoc>,
) {
  const doc = manifestById.get(docId);
  if (!doc) {
    fail(`${label}: cites unknown doc "${docId}" (not in corpus manifest)`);
    return;
  }
  if (page > doc.pages) {
    fail(
      `${label}: cites page ${page} of "${docId}", which only has ${doc.pages} pages`,
    );
  }
}

console.log("Validating Faheem data pack...\n");

const manifest = loadAndValidate(
  "data/corpus/manifest.json",
  CorpusDocSchema.array(),
);
const deals = loadAndValidate("data/deals.json", DealSchema.array());
const modelInputs = loadAndValidate(
  "data/model-inputs.json",
  ModelInputSchema.array(),
);
loadAndValidate("data/audit-log.json", AuditEntrySchema.array());
loadAndValidate("data/artifacts.json", ArtifactMetaSchema.array());
loadAndValidate("data/seed-chats.json", SeedChatSchema.array());
loadAndValidate("data/custom-skills.json", CustomSkillSchema.array());
const socialPack = loadAndValidate(
  "data/social-pack.json",
  SocialPostSchema.array(),
);
const sentiment = loadAndValidate(
  "data/sentiment.json",
  SentimentEntrySchema.array(),
);

console.log("\nCross-checks...");

if (manifest) {
  checkUniqueIds(
    "corpus manifest",
    manifest.map((doc: CorpusDoc) => doc.id),
  );
  for (const doc of manifest) {
    if (!existsSync(path.join(repoRoot, doc.path))) {
      fail(`corpus manifest: "${doc.id}" points at missing file ${doc.path}`);
    }
  }
}

if (deals) {
  checkUniqueIds(
    "deals",
    deals.map((deal: Deal) => deal.id),
  );
}

if (modelInputs) {
  checkUniqueIds(
    "model inputs",
    modelInputs.map((input: ModelInput) => input.key),
  );
}

if (socialPack) {
  checkUniqueIds(
    "social pack",
    socialPack.map((post: SocialPost) => post.id),
  );
}

if (sentiment) {
  checkUniqueIds(
    "sentiment",
    sentiment.map((entry: SentimentEntry) => entry.companyId),
  );
}

if (socialPack && sentiment) {
  const postIds = new Set(socialPack.map((post: SocialPost) => post.id));
  for (const entry of sentiment) {
    for (const id of entry.postIds) {
      if (!postIds.has(id)) {
        fail(
          `sentiment["${entry.companyId}"]: points at unknown social-pack post "${id}"`,
        );
      }
    }
  }
}

// Rule: sentiment/qualitative signals never emit a sourced number (live-model-
// provenance plan §0). SentimentEntrySchema/SocialPostSchema are `.strict()`,
// which already rejects an accidental sourceDoc/page/value shape at parse
// time, this is a second, independent check that walks the RAW JSON (before
// zod strips anything) so the guarantee holds even if a future edit relaxes
// the schema.
function walkForSourcedNumberShape(node: unknown, keyPath: string): string[] {
  if (Array.isArray(node)) {
    return node.flatMap((item, i) =>
      walkForSourcedNumberShape(item, `${keyPath}[${i}]`),
    );
  }
  if (node && typeof node === "object") {
    const keys = Object.keys(node as Record<string, unknown>);
    const hits: string[] = [];
    for (const forbidden of ["sourceDoc", "page"]) {
      if (keys.includes(forbidden)) {
        hits.push(`${keyPath}.${forbidden}`);
      }
    }
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      hits.push(...walkForSourcedNumberShape(v, `${keyPath}.${k}`));
    }
    return hits;
  }
  return [];
}

for (const [label, relativePath] of [
  ["data/social-pack.json", "data/social-pack.json"],
  ["data/sentiment.json", "data/sentiment.json"],
] as const) {
  const absolutePath = path.join(repoRoot, relativePath);
  if (!existsSync(absolutePath)) continue;
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(absolutePath, "utf-8"));
  } catch (error) {
    fail(`${label}: invalid JSON, ${(error as Error).message}`);
    continue;
  }
  const hits = walkForSourcedNumberShape(raw, label);
  for (const hit of hits) {
    fail(
      `${hit}: sentiment/social-pack data must never carry a sourced-number field (sourceDoc/page), sentiment is signal only`,
    );
  }
}

if (manifest && (modelInputs || deals)) {
  const manifestById = new Map(manifest.map((doc: CorpusDoc) => [doc.id, doc]));

  if (modelInputs) {
    for (const input of modelInputs) {
      checkCite(
        `model-inputs["${input.key}"]`,
        input.sourceDoc,
        input.page,
        manifestById,
      );
    }
  }

  if (deals) {
    for (const deal of deals) {
      for (const row of deal.screening?.rows ?? []) {
        checkCite(
          `deals["${deal.id}"].screening (${row.criterion.en})`,
          row.cite.docId,
          row.cite.page,
          manifestById,
        );
      }
      if (deal.icMetrics) {
        checkCite(
          `deals["${deal.id}"].icMetrics`,
          deal.icMetrics.cite.docId,
          deal.icMetrics.cite.page,
          manifestById,
        );
      }
    }
  }
} else {
  console.log("- skipped (manifest + model-inputs/deals not both present yet)");
}

console.log("");
if (failed) {
  console.error("validate:data FAILED");
  process.exit(1);
} else {
  console.log("validate:data OK");
  process.exit(0);
}
