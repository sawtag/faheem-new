/**
 * Idempotent corpus fetch script.
 * Re-downloads any missing corpus file from sourceUrl and prints gs compress command for fy24-ar.
 * Uses only Node.js built-ins: fetch, fs, path.
 * No npm dependencies.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

interface CorpusDoc {
  id: string;
  sourceUrl?: string;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CORPUS_DIR = path.join(__dirname, "..", "data", "corpus");
const MANIFEST_PATH = path.join(CORPUS_DIR, "manifest.json");

async function downloadFile(
  url: string,
  dest: string,
  retries = 1,
): Promise<boolean> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      console.log(
        `Fetching ${path.basename(dest)} (attempt ${attempt + 1})...`,
      );
      const response = await fetch(url, {
        signal: AbortSignal.timeout(120000),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      if (!response.body) {
        throw new Error("Empty response body");
      }

      const buffer = await response.arrayBuffer();
      fs.writeFileSync(dest, Buffer.from(buffer));
      console.log(`✓ Downloaded ${path.basename(dest)}`);
      return true;
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      console.error(`✗ Failed: ${error}`);

      if (attempt < retries) {
        console.log("Retrying...");
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }
  }

  return false;
}

async function main() {
  // Ensure corpus directory exists
  if (!fs.existsSync(CORPUS_DIR)) {
    fs.mkdirSync(CORPUS_DIR, { recursive: true });
  }

  // Read manifest
  let manifest: CorpusDoc[] = [];
  if (fs.existsSync(MANIFEST_PATH)) {
    const content = fs.readFileSync(MANIFEST_PATH, "utf8");
    manifest = JSON.parse(content);
  } else {
    console.error(`Manifest not found at ${MANIFEST_PATH}`);
    process.exit(1);
  }

  // Download missing files
  let anyFailed = false;
  for (const doc of manifest) {
    const filePath = path.join(CORPUS_DIR, `${doc.id}.pdf`);

    // Skip if file already exists
    if (fs.existsSync(filePath)) {
      const sizeMB = (fs.statSync(filePath).size / 1048576).toFixed(2);
      console.log(`✓ ${doc.id}.pdf exists (${sizeMB} MB)`);
      continue;
    }

    // Download if sourceUrl is provided
    if (doc.sourceUrl) {
      const success = await downloadFile(doc.sourceUrl, filePath, 1);
      if (!success) {
        console.error(`Failed to download ${doc.id}`);
        anyFailed = true;
      }
    } else {
      console.warn(`No sourceUrl for ${doc.id}, skipping`);
    }
  }

  // Print Ghostscript compress command for fy24-ar
  console.log("\n" + "=".repeat(70));
  console.log("Ghostscript compress command for fy24-ar.pdf (if needed):");
  console.log("=".repeat(70));
  console.log(
    `gs -sDEVICE=pdfwrite -dPDFSETTINGS=/screen -dNOPAUSE -dQUIET -dBATCH -dCompatibilityLevel=1.4 \\
  -o ${path.join(CORPUS_DIR, "fy24-ar-compressed.pdf")} ${path.join(CORPUS_DIR, "fy24-ar.pdf")}`,
  );
  console.log("Then verify with: pdftotext <compressed>.pdf - | head -c 200");
  console.log("And replace: mv <compressed>.pdf fy24-ar.pdf");

  if (anyFailed) {
    process.exit(1);
  }

  console.log("\n✓ Corpus fetch complete");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
