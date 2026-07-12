/**
 * Pre-renders the in-app artifact preview images from the REAL builders:
 * builds the deck/memo/workbook in-memory (lib/generate/{pptx,docx,xlsx}),
 * converts each to PDF with LibreOffice (soffice), rasterizes pages with
 * pdftoppm, and lands PNGs in public/artifacts/previews/:
 *
 *   deck-01.png … deck-08.png   board deck, all 8 slides (1280px wide, 16:9)
 *   memo-01.png … memo-03.png   IC memo, first 3 pages   (1280px wide)
 *   model-cover.png             workbook Cover sheet      (page 1 of the PDF)
 *
 * Run: node scripts/render-artifact-previews.ts        (idempotent — overwrites)
 *
 * Plain `node` (26+, native type stripping) — NOT tsx: tsx's CJS-interop hands
 * pptxgenjs's dual package to the builders as a namespace object ("PptxGenJS
 * is not a constructor"), while node's own ESM loader resolves the `import`
 * condition correctly. The registerHooks() shim below teaches node the
 * repo's `@/` specifier alias; builders are dynamically imported after it.
 *
 * STATIC-FALLBACK HONESTY: these PNGs are committed and served as the in-app
 * preview (components/generate/artifact-preview.tsx). They are rendered from
 * the SAME deterministic builders /api/generate runs — content comes only from
 * git-versioned JSON, so a regenerated file cannot diverge from these images
 * unless a builder or data file changes. If one ever does, re-run this script
 * at rehearsal time and re-commit the PNGs alongside the change.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import { registerHooks } from "node:module";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = process.cwd();

// `@/lib/...` → `<repo>/lib/....ts` — the builders and everything they import
// use the tsconfig `@/*` alias, which plain node doesn't know about.
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      const base = path.join(ROOT, specifier.slice(2));
      for (const file of [base, `${base}.ts`, `${base}.tsx`]) {
        if (fs.existsSync(file) && fs.statSync(file).isFile()) {
          return { url: pathToFileURL(file).href, shortCircuit: true };
        }
      }
    }
    return nextResolve(specifier, context);
  },
});

const OUT_DIR = path.join(ROOT, "public/artifacts/previews");
const WIDTH = 1280;

interface Job {
  /** office file name inside the temp dir */
  file: string;
  build: () => Promise<Buffer>;
  /** pages to rasterize (1-based, from page 1) */
  pages: number;
  /** target PNG name for page i (0-based) */
  target: (i: number) => string;
}

const pad = (n: number): string => String(n).padStart(2, "0");

function sofficeConvert(tmp: string, profile: string, file: string): string {
  execFileSync(
    "soffice",
    [
      `-env:UserInstallation=file://${profile}`,
      "--headless",
      "--convert-to",
      "pdf",
      "--outdir",
      tmp,
      path.join(tmp, file),
    ],
    { stdio: "pipe", timeout: 120_000 },
  );
  const pdf = path.join(tmp, file.replace(/\.[a-z]+$/, ".pdf"));
  if (!fs.existsSync(pdf)) {
    throw new Error(`soffice produced no PDF for ${file}`);
  }
  return pdf;
}

/** Rasterize pages 1..n into dir/<stem>-*.png and return the files sorted by page. */
function rasterize(
  pdf: string,
  dir: string,
  stem: string,
  pages: number,
): string[] {
  fs.mkdirSync(dir, { recursive: true });
  execFileSync(
    "pdftoppm",
    [
      "-png",
      "-f",
      "1",
      "-l",
      String(pages),
      "-scale-to-x",
      String(WIDTH),
      "-scale-to-y",
      "-1",
      pdf,
      path.join(dir, stem),
    ],
    { stdio: "pipe", timeout: 120_000 },
  );
  // pdftoppm pads page numbers by the DOCUMENT's page count, so sort numerically.
  const pageNo = (f: string): number =>
    Number(/-(\d+)\.png$/.exec(f)?.[1] ?? 0);
  const produced = fs
    .readdirSync(dir)
    .filter((f) => f.startsWith(`${stem}-`) && f.endsWith(".png"))
    .sort((a, b) => pageNo(a) - pageNo(b));
  if (produced.length < pages) {
    throw new Error(
      `${stem}: expected ${pages} page(s), pdftoppm produced ${produced.length}`,
    );
  }
  return produced.slice(0, pages).map((f) => path.join(dir, f));
}

async function main(): Promise<void> {
  const { buildBoardDeck } = await import("@/lib/generate/pptx");
  const { buildIcMemo } = await import("@/lib/generate/docx");
  const { buildJahezWorkbook } = await import("@/lib/generate/xlsx");

  const jobs: Job[] = [
    {
      file: "jahez-board-deck.pptx",
      build: buildBoardDeck,
      pages: 8,
      target: (i) => `deck-${pad(i + 1)}.png`,
    },
    {
      file: "jahez-ic-memo.docx",
      build: buildIcMemo,
      pages: 3,
      target: (i) => `memo-${pad(i + 1)}.png`,
    },
    {
      file: "jahez-valuation-model.xlsx",
      build: buildJahezWorkbook,
      pages: 1,
      target: () => "model-cover.png",
    },
  ];

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "faheem-previews-"));
  const profile = path.join(tmp, "lo-profile");
  fs.mkdirSync(OUT_DIR, { recursive: true });

  for (const job of jobs) {
    console.log(`building ${job.file} …`);
    const buf = await job.build();
    fs.writeFileSync(path.join(tmp, job.file), buf);
    const pdf = sofficeConvert(tmp, profile, job.file);
    const stem = job.file.replace(/\..+$/, "");
    const pngs = rasterize(
      pdf,
      path.join(tmp, `${stem}-pages`),
      stem,
      job.pages,
    );
    pngs.forEach((src, i) => {
      const dest = path.join(OUT_DIR, job.target(i));
      fs.copyFileSync(src, dest);
      const kb = (fs.statSync(dest).size / 1024).toFixed(0);
      console.log(`  ${path.basename(dest)}  (${kb} KB)`);
    });
  }

  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(`\nPreviews written to ${path.relative(ROOT, OUT_DIR)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
