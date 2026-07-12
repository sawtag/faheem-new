/**
 * Validates the static data pack against the zod schemas in lib/types.ts.
 * Every file is OPTIONAL — data lands progressively from P1 tasks. A missing
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
  type CorpusDoc,
  type Deal,
  type ModelInput,
} from "../lib/types";

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
