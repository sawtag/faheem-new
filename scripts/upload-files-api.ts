#!/usr/bin/env node

/**
 * Upload Files API – Reads manifest.json, uploads docs to Anthropic Files API,
 * writes file_id back to manifest.
 *
 * This script REQUIRES the Anthropic SDK to be installed:
 *   npm install @anthropic-ai/sdk
 *
 * Usage:
 *   tsx scripts/upload-files-api.ts --check     # validate only (no SDK needed)
 *   tsx scripts/upload-files-api.ts              # upload (requires ANTHROPIC_API_KEY)
 *
 * Environment:
 *   ANTHROPIC_API_KEY  – Required for upload mode (not --check).
 *                        Set via .env or shell export.
 */

import * as fs from "fs";
import * as path from "path";
import { createReadStream } from "fs";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface Localized {
  en: string;
  ar: string;
}

interface CorpusDoc {
  id: string;
  title: Localized;
  path: string;
  pages: number;
  sizeMB: number;
  type: "public" | "lunar" | "deal";
  workspace?: string;
  sourceUrl?: string;
  fileId?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const isCheckMode = args.includes("--check");

const projectRoot = path.resolve(__dirname, "..");
const manifestPath = path.join(projectRoot, "data", "corpus", "manifest.json");

// Validate check mode first (no API key needed)
if (isCheckMode) {
  performCheck();
  process.exit(0);
}

// For upload mode, require API key before any other work
if (!process.env.ANTHROPIC_API_KEY) {
  console.error(
    "ERROR: ANTHROPIC_API_KEY is not set.\n" +
      "To use this script for uploading, you must:\n" +
      "  1. Upgrade your Anthropic billing plan to support Files API\n" +
      "  2. Set ANTHROPIC_API_KEY in .env or shell: export ANTHROPIC_API_KEY='sk-...'\n" +
      "\nFor now, use --check flag to validate the manifest without uploading.\n",
  );
  process.exit(1);
}

// Proceed with upload
uploadFilesAsync().catch((err) => {
  console.error("Upload failed:", err.message);
  process.exit(1);
});

// ─────────────────────────────────────────────────────────────────────────────
// Check Mode: Validate manifest + plan uploads
// ─────────────────────────────────────────────────────────────────────────────

function performCheck(): void {
  console.log("📋 Checking manifest and upload plan...\n");

  // 1. Parse manifest
  let manifest: CorpusDoc[] = [];
  try {
    const content = fs.readFileSync(manifestPath, "utf-8");
    manifest = JSON.parse(content);
  } catch (e) {
    console.error(
      `❌ Failed to parse manifest at ${manifestPath}:`,
      (e as Error).message,
    );
    process.exit(1);
  }

  console.log(`✓ Manifest parsed: ${manifest.length} documents\n`);

  // 2. Validate each document
  let allValid = true;
  const uploadPlan: Array<{
    id: string;
    path: string;
    size: string;
    hasFileId: boolean;
  }> = [];

  for (const doc of manifest) {
    const fullPath = path.join(projectRoot, doc.path);

    // Check required fields
    if (!doc.id || !doc.title.en || !doc.title.ar || !doc.path) {
      console.error(
        `❌ Document missing required fields:`,
        JSON.stringify(doc, null, 2),
      );
      allValid = false;
      continue;
    }

    // Check file exists
    if (!fs.existsSync(fullPath)) {
      console.error(
        `❌ File not found: ${fullPath} (referenced by doc "${doc.id}")`,
      );
      allValid = false;
      continue;
    }

    // Check file readability
    try {
      fs.accessSync(fullPath, fs.constants.R_OK);
    } catch {
      console.error(
        `❌ File not readable: ${fullPath} (referenced by doc "${doc.id}")`,
      );
      allValid = false;
      continue;
    }

    console.log(`✓ ${doc.id}`);
    console.log(`  Path: ${doc.path}`);
    console.log(`  Title (EN): ${doc.title.en}`);
    console.log(`  Size: ${doc.sizeMB} MB`);
    console.log(
      `  Already uploaded: ${doc.fileId ? "Yes (" + doc.fileId + ")" : "No"}\n`,
    );

    uploadPlan.push({
      id: doc.id,
      path: doc.path,
      size: `${doc.sizeMB} MB`,
      hasFileId: !!doc.fileId,
    });
  }

  if (!allValid) {
    console.error("\n❌ Validation failed. Fix errors above and try again.");
    process.exit(1);
  }

  // 3. Print upload plan
  console.log("📊 Upload Plan:");
  console.log(`   Total: ${uploadPlan.length} documents`);

  const needsUpload = uploadPlan.filter((x) => !x.hasFileId).length;
  const alreadyUploaded = uploadPlan.filter((x) => x.hasFileId).length;

  console.log(`   To upload: ${needsUpload} (no fileId yet)`);
  console.log(`   Already uploaded: ${alreadyUploaded}`);

  if (needsUpload > 0) {
    console.log("\n   Pending uploads:");
    uploadPlan
      .filter((x) => !x.hasFileId)
      .forEach((x) => {
        console.log(`     • ${x.id} (${x.size})`);
      });
  }

  console.log(
    "\n✓ Manifest is valid. Run without --check to upload (requires ANTHROPIC_API_KEY).",
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Upload Mode: Upload to Files API and update manifest
// ─────────────────────────────────────────────────────────────────────────────

async function uploadFilesAsync(): Promise<void> {
  console.log("🚀 Starting Files API uploads...\n");

  // Import SDK only when needed (upload mode)
  let Anthropic: typeof import("@anthropic-ai/sdk").default;
  try {
    Anthropic = (await import("@anthropic-ai/sdk")).default;
  } catch {
    console.error(
      "ERROR: @anthropic-ai/sdk not found.\n" +
        "Install it first: npm install @anthropic-ai/sdk\n",
    );
    process.exit(1);
  }

  // Parse manifest
  let manifest: CorpusDoc[] = [];
  try {
    const content = fs.readFileSync(manifestPath, "utf-8");
    manifest = JSON.parse(content);
  } catch (e) {
    throw new Error(
      `Failed to parse manifest at ${manifestPath}: ${(e as Error).message}`,
    );
  }

  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  let updated = false;

  for (const doc of manifest) {
    // Skip if already has fileId
    if (doc.fileId) {
      console.log(`⏭️  ${doc.id} already has fileId: ${doc.fileId}`);
      continue;
    }

    const fullPath = path.join(projectRoot, doc.path);

    // Validate file exists
    if (!fs.existsSync(fullPath)) {
      throw new Error(
        `File not found: ${fullPath} (referenced by doc "${doc.id}")`,
      );
    }

    try {
      console.log(`⬆️  Uploading ${doc.id}...`);

      const fileStream = createReadStream(fullPath);
      const uploadResponse = await client.beta.files.upload(
        {
          file: fileStream,
        },
        {
          headers: {
            "anthropic-beta": "files-api-2025-04-14",
          },
        },
      );

      // The response should include an id field
      if (!uploadResponse.id) {
        throw new Error(
          `Upload response missing file id: ${JSON.stringify(uploadResponse)}`,
        );
      }

      doc.fileId = uploadResponse.id;
      updated = true;

      console.log(`   ✓ Uploaded. File ID: ${doc.fileId}\n`);
    } catch (e) {
      console.error(`   ❌ Upload failed for ${doc.id}:`, (e as Error).message);
      throw e;
    }
  }

  // Write manifest back if anything changed
  if (updated) {
    console.log("💾 Writing updated manifest...");
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
    console.log(`✓ Manifest updated: ${manifestPath}\n`);
  } else {
    console.log("ℹ️  All documents already have fileIds. No updates needed.\n");
  }

  console.log("✓ Upload complete!");
}
