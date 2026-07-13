#!/usr/bin/env -S npx tsx
/**
 * Preflight — the single command the founder runs on the venue machine
 * before going on stage. Walks the whole demo-readiness checklist from
 * docs/rehearsal-notes.md and prints a green/red/yellow report ending in a
 * PASS / FIX THE ABOVE banner + a 4-line day-of sequence.
 *
 * Zero live API calls unless --live is passed (that flag makes ONE real,
 * billed Anthropic call — see check 11).
 *
 * Usage:
 *   npx tsx scripts/preflight.ts
 *   npx tsx scripts/preflight.ts --live
 *   npx tsx scripts/preflight.ts --port 3001
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { cacheKey, readCacheEntry } from "@/lib/ai/cache";
import { getClient, getModel } from "@/lib/ai/client";
import { GOLDEN_QUESTIONS } from "@/lib/demo/golden-questions";
import { AuditEntrySchema, CorpusDocSchema } from "@/lib/types";

const repoRoot = process.cwd();

/**
 * Minimal .env loader (no new dependency — AGENTS.md locks the dep list).
 * Next.js auto-loads .env for `next dev`/`next start`, but this is a bare
 * tsx script, so without this, checks 9/11 would warn/fail even when the
 * key IS present in .env and `npm run start` would see it fine.
 */
function loadDotEnv(): void {
  const envPath = path.join(repoRoot, ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

// ─────────────────────────────── output helpers ───────────────────────────────

const color = process.stdout.isTTY;
const paint = (code: string, s: string) => (color ? `${code}${s}\x1b[0m` : s);
const green = (s: string) => paint("\x1b[32m", s);
const red = (s: string) => paint("\x1b[31m", s);
const yellow = (s: string) => paint("\x1b[33m", s);
const dim = (s: string) => paint("\x1b[2m", s);
const bold = (s: string) => paint("\x1b[1m", s);

let hardFailures = 0;
let warnings = 0;

function section(n: number, title: string): void {
  console.log(`\n${bold(`${n}. ${title}`)}`);
}

function ok(message: string): void {
  console.log(`  ${green("✓")} ${message}`);
}

function bad(message: string, remedy: string): void {
  hardFailures += 1;
  console.log(`  ${red("✗")} ${message}`);
  console.log(`    ${dim(`→ ${remedy}`)}`);
}

function caution(message: string, remedy: string): void {
  warnings += 1;
  console.log(`  ${yellow("⚠")} ${message}`);
  console.log(`    ${dim(`→ ${remedy}`)}`);
}

function info(message: string): void {
  console.log(`  ${dim("·")} ${message}`);
}

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

// ─────────────────────────────── args ───────────────────────────────

function parseArgs(argv: string[]): { live: boolean; port: number } {
  let live = false;
  let port = 3000;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--live") live = true;
    else if (argv[i] === "--port" && argv[i + 1]) {
      const n = Number.parseInt(argv[++i]!, 10);
      if (Number.isFinite(n)) port = n;
    }
  }
  return { live, port };
}

// ─────────────────────────────── checks ───────────────────────────────

/** 1. Node >= 26; .next/BUILD_ID exists (+ warn if the build is stale). */
function checkRuntimeAndBuild(): void {
  section(1, "Runtime & build");

  const nodeMajor = Number.parseInt(process.versions.node.split(".")[0]!, 10);
  if (nodeMajor >= 26) ok(`Node ${process.version}`);
  else
    bad(`Node ${process.version} — need >= 26`, "nvm install 26 && nvm use 26");

  const buildIdPath = path.join(repoRoot, ".next/BUILD_ID");
  if (!fs.existsSync(buildIdPath)) {
    bad(".next/BUILD_ID missing — no production build found", "npm run build");
    return;
  }
  ok(".next/BUILD_ID exists");

  const ageHours = (Date.now() - fs.statSync(buildIdPath).mtimeMs) / 3_600_000;
  if (ageHours > 24) {
    caution(
      `build is ${ageHours.toFixed(1)}h old`,
      "npm run build (rebuild close to showtime)",
    );
  } else {
    ok(`build is ${ageHours.toFixed(1)}h old`);
  }
}

/** 2. CRITICAL — every golden question except "deliverables" resolves from cache. */
function checkGoldenCache(): void {
  section(2, "Golden-questions cache (CRITICAL)");

  for (const q of GOLDEN_QUESTIONS) {
    if (q.id === "deliverables") {
      info(`${q.id} — skipped (artifact-generation flow, not a cached chat)`);
      continue;
    }

    const key = cacheKey(q.request);
    const file = path.join(repoRoot, "data/demo-cache", `${key}.json`);
    const remedy = `npx tsx scripts/record-goldens.ts --only ${q.id}`;

    if (!fs.existsSync(file)) {
      bad(`${q.id} — no cache file at data/demo-cache/${key}.json`, remedy);
      continue;
    }
    const entry = readCacheEntry(key);
    if (!entry) {
      bad(
        `${q.id} — data/demo-cache/${key}.json exists but fails schema validation`,
        remedy,
      );
      continue;
    }
    const last = entry.events[entry.events.length - 1];
    if (!last || last.type !== "done") {
      bad(`${q.id} — cache entry does not end with a "done" event`, remedy);
      continue;
    }
    ok(`${q.id} — ${key.slice(0, 10)}… resolves, ends with done`);
  }
}

/** 3. Corpus manifest — warn-only (fileIds only matter for --live). */
function checkManifest(): void {
  section(3, "Corpus manifest (warn-only — live mode needs it)");

  const manifestPath = path.join(repoRoot, "data/corpus/manifest.json");
  if (!fs.existsSync(manifestPath)) {
    caution(
      "data/corpus/manifest.json missing",
      "restore from git (it is tracked)",
    );
    return;
  }
  const parsed = CorpusDocSchema.array().safeParse(
    JSON.parse(fs.readFileSync(manifestPath, "utf-8")),
  );
  if (!parsed.success) {
    caution(
      "data/corpus/manifest.json fails schema validation",
      "npm run validate:data for details",
    );
    return;
  }

  const manifest = parsed.data;
  const missing: string[] = [];
  const drifted: string[] = [];
  const noFileId: string[] = [];
  for (const doc of manifest) {
    const docPath = path.join(repoRoot, doc.path);
    if (!fs.existsSync(docPath)) {
      missing.push(doc.id);
      continue;
    }
    const actualMB = fs.statSync(docPath).size / 1024 / 1024;
    if (Math.abs(actualMB - doc.sizeMB) / doc.sizeMB > 0.05)
      drifted.push(doc.id);
    if (!doc.fileId) noFileId.push(doc.id);
  }

  if (missing.length === 0) ok(`${manifest.length} docs present on disk`);
  else
    caution(
      `missing on disk: ${missing.join(", ")}`,
      "restore data/corpus/*.pdf from git",
    );

  if (drifted.length === 0) ok("doc sizes within ±5% of manifest");
  else
    caution(
      `size drifted >5%: ${drifted.join(", ")}`,
      "re-verify data/corpus PDFs against manifest.json",
    );

  if (noFileId.length === 0) ok("all docs carry a Files-API fileId");
  else
    caution(
      `missing fileId: ${noFileId.join(", ")}`,
      "npx tsx scripts/upload-files-api.ts (only needed for --live)",
    );
}

/** 4. npm run validate:data passes. */
function checkValidateData(): void {
  section(4, "Data validation");
  const res = spawnSync("npm", ["run", "validate:data"], {
    cwd: repoRoot,
    encoding: "utf-8",
  });
  if (res.status === 0) ok("npm run validate:data passed");
  else
    bad(
      "npm run validate:data failed",
      "run `npm run validate:data` directly to see details",
    );
}

/** 5. Fonts are self-hosted (.woff2 vendored into the build). */
function checkFonts(): void {
  section(5, "Fonts (self-hosted)");
  const mediaDir = path.join(repoRoot, ".next/static/media");
  const woff2 = fs.existsSync(mediaDir)
    ? fs.readdirSync(mediaDir).filter((f) => f.endsWith(".woff2"))
    : [];
  if (woff2.length > 0)
    ok(`${woff2.length} .woff2 file(s) in .next/static/media`);
  else
    bad(
      "no .woff2 files in .next/static/media — fonts not self-hosted",
      "npm run build (with network access, once) to vendor fonts",
    );
}

/** 6. soffice (warn) + committed fallback artifacts + deck preview images. */
function checkArtifactTooling(): void {
  section(6, "Artifact tooling & fallback deliverables");

  const soffice = spawnSync("which", ["soffice"], { encoding: "utf-8" });
  if (soffice.status === 0) ok(`soffice on PATH (${soffice.stdout.trim()})`);
  else
    caution(
      "soffice not on PATH",
      "install LibreOffice — only needed to spot-check artifact opens, not to run the demo",
    );

  const artifactsDir = path.join(repoRoot, "public/artifacts");
  const expected = [
    "jahez-valuation-model.xlsx",
    "jahez-ic-memo.docx",
    "jahez-board-deck.pptx",
  ];
  const nonTrivial = expected.filter((f) => {
    const p = path.join(artifactsDir, f);
    return fs.existsSync(p) && fs.statSync(p).size > 1024;
  });
  if (nonTrivial.length === 3)
    ok(
      "3/3 fallback artifacts present in public/artifacts/ (non-trivial size)",
    );
  else
    bad(
      `${nonTrivial.length}/3 fallback artifacts present in public/artifacts/`,
      "restore from git, or POST /api/generate/all against a running server",
    );

  const previewsDir = path.join(repoRoot, "public/artifacts/previews");
  const deckPreviews = Array.from(
    { length: 8 },
    (_, i) => `deck-${String(i + 1).padStart(2, "0")}.png`,
  );
  const missingPreviews = deckPreviews.filter(
    (f) => !fs.existsSync(path.join(previewsDir, f)),
  );
  if (missingPreviews.length === 0) ok("deck-01..08 preview images present");
  else
    bad(
      `missing deck previews: ${missingPreviews.join(", ")}`,
      "node scripts/render-artifact-previews.ts (needs soffice + pdftoppm)",
    );
}

/** 7. Upload-beat asset — gitignored, must be copied onto the demo machine by hand. */
function checkUploadAsset(): void {
  section(7, "Upload-beat asset (gitignored, local-machine only)");
  const talabatPath = path.join(
    repoRoot,
    "demo-assets/talabat-q1-2026-results.pdf",
  );
  if (!fs.existsSync(talabatPath)) {
    caution(
      "demo-assets/talabat-q1-2026-results.pdf missing",
      "copy it onto this machine before the upload beat (gitignored — not in git)",
    );
    return;
  }
  const fd = fs.openSync(talabatPath, "r");
  const magic = Buffer.alloc(4);
  fs.readSync(fd, magic, 0, 4, 0);
  fs.closeSync(fd);
  if (magic.toString("latin1") === "%PDF")
    ok("demo-assets/talabat-q1-2026-results.pdf present, valid PDF");
  else
    caution(
      "demo-assets/talabat-q1-2026-results.pdf present but missing %PDF magic",
      "re-copy the file — it looks corrupt/truncated",
    );
}

/** 8. Port is free, OR a Faheem server is already answering /login. */
async function checkPort(port: number): Promise<void> {
  section(8, "Dev server port");
  const url = `http://localhost:${port}/login`;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    const text = await res.text();
    if (res.ok && /faheem/i.test(text)) {
      ok(
        `a Faheem server is already running and answering on port ${port} (/login)`,
      );
    } else {
      bad(
        `port ${port} is occupied by a non-Faheem service (status ${res.status})`,
        `free port ${port}, or pass --port <n>`,
      );
    }
  } catch (err) {
    const cause = (err as { cause?: { code?: string } })?.cause;
    if (cause?.code === "ECONNREFUSED") {
      ok(`port ${port} is free`);
    } else {
      bad(
        `could not check port ${port}: ${errMsg(err)}`,
        `free port ${port}, or pass --port <n>`,
      );
    }
  }
}

/** 9. ANTHROPIC_API_KEY is set (warn-only — cached demo works without it). */
function checkApiKey(): void {
  section(9, "Anthropic API key");
  if (process.env.ANTHROPIC_API_KEY) ok("ANTHROPIC_API_KEY is set");
  else
    caution(
      "ANTHROPIC_API_KEY is not set",
      "cached demo mode runs without it; live mode and prewarm need it in .env",
    );
}

/** 10. Audit log parses; reminder to reseed if it has grown past a curated size. */
function checkAuditLog(): void {
  section(10, "Audit trail");
  const auditPath = path.join(repoRoot, "data/audit-log.json");
  if (!fs.existsSync(auditPath)) {
    bad("data/audit-log.json missing", "restore from git");
    return;
  }
  try {
    const raw = JSON.parse(fs.readFileSync(auditPath, "utf-8"));
    const parsed = AuditEntrySchema.array().safeParse(raw);
    if (!parsed.success) {
      bad(
        "data/audit-log.json fails schema validation",
        "npm run validate:data for details",
      );
      return;
    }
    ok(`data/audit-log.json parses — ${parsed.data.length} entries`);
    if (parsed.data.length > 60) {
      caution(
        `${parsed.data.length} entries — long for a "curated" demo log`,
        "reseed data/audit-log.json (rehearsal notes: curated to ~35 plausible entries)",
      );
    }
  } catch (err) {
    bad(
      `data/audit-log.json invalid JSON: ${errMsg(err)}`,
      "restore from git or fix the JSON",
    );
  }
}

/** 11. --live only: one tiny real API call to prove connectivity/auth. */
async function checkLive(): Promise<void> {
  section(11, "Live API call (--live)");
  if (!process.env.ANTHROPIC_API_KEY) {
    bad(
      "ANTHROPIC_API_KEY not set — cannot run the --live check",
      "set ANTHROPIC_API_KEY in .env",
    );
    return;
  }
  try {
    const start = Date.now();
    const model = getModel();
    const res = await getClient().messages.create({
      model,
      max_tokens: 16,
      messages: [{ role: "user", content: "Reply with one word: ready." }],
    });
    const elapsed = Date.now() - start;
    const text = res.content.find((b) => b.type === "text")?.text ?? "";
    ok(
      `live call OK in ${elapsed}ms — model ${model}, reply ${JSON.stringify(text.slice(0, 40))}`,
    );
    info(
      "this call does NOT warm the corpus prompt cache — run `npx tsx scripts/prewarm.ts` within 1h of the slot",
    );
  } catch (err) {
    bad(
      `live API call failed: ${errMsg(err)}`,
      "check ANTHROPIC_API_KEY / network — cached mode still works without this",
    );
  }
}

// ─────────────────────────────── main ───────────────────────────────

async function main(): Promise<void> {
  loadDotEnv();
  const { live, port } = parseArgs(process.argv.slice(2));

  console.log(bold(`Faheem Preflight — port ${port}${live ? ", --live" : ""}`));

  const syncChecks = [
    checkRuntimeAndBuild,
    checkGoldenCache,
    checkManifest,
    checkValidateData,
    checkFonts,
    checkArtifactTooling,
    checkUploadAsset,
  ];
  for (const check of syncChecks) {
    try {
      check();
    } catch (err) {
      hardFailures += 1;
      console.log(`  ${red("✗")} check threw: ${errMsg(err)}`);
    }
  }

  try {
    await checkPort(port);
  } catch (err) {
    hardFailures += 1;
    console.log(`  ${red("✗")} check threw: ${errMsg(err)}`);
  }

  checkApiKey();
  checkAuditLog();

  if (live) {
    try {
      await checkLive();
    } catch (err) {
      hardFailures += 1;
      console.log(`  ${red("✗")} check threw: ${errMsg(err)}`);
    }
  }

  console.log(`\n${dim("─".repeat(60))}`);
  console.log(`${hardFailures} hard failure(s), ${warnings} warning(s)\n`);

  if (hardFailures === 0) {
    console.log(bold(green("PASS")));
  } else {
    console.log(bold(red("FIX THE ABOVE")));
  }

  console.log(`\n${bold("Day-of sequence:")}`);
  console.log(
    `  1. Within 1h of the slot: load .env, run \`npx tsx scripts/prewarm.ts\``,
  );
  console.log(`  2. Start: FAHEEM_MODE=cached PORT=${port} npm run start`);
  console.log(
    `  3. Ask questions via ⌘K only (never type them) — ⌘. toggles live for judge Q&A`,
  );
  console.log(
    `  4. Upload beat: copy demo-assets/talabat-q1-2026-results.pdf onto this machine first`,
  );

  if (hardFailures > 0) process.exit(1);
}

main().catch((err) => {
  console.error("preflight failed:", errMsg(err));
  process.exit(1);
});
