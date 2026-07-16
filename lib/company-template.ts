/**
 * Single-slot store for the firm's uploaded IC-memo Word template. Mirrors
 * lib/audit.ts's / lib/custom-agents.ts's atomic-write pattern (write-temp +
 * rename) for both the binary template and its metadata.
 *
 * Default paths: template bytes at data/company-template/ic-memo.docx,
 * metadata at data/company-template.json (committed initial content `null`).
 * FAHEEM_COMPANY_TEMPLATE_DIR (tests) overrides BOTH to live flatly in one
 * directory: `<dir>/ic-memo.docx` + `<dir>/company-template.json`.
 */
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";

export const CompanyTemplateMetaSchema = z
  .object({
    fileName: z.string().min(1).max(120),
    uploadedAt: z.string(),
    found: z.array(z.string()),
    unknown: z.array(z.string()),
  })
  .strict()
  .nullable();
export type CompanyTemplateMeta = z.infer<typeof CompanyTemplateMetaSchema>;

function docxPath(): string {
  const dir = process.env.FAHEEM_COMPANY_TEMPLATE_DIR;
  return dir
    ? path.join(dir, "ic-memo.docx")
    : path.join(process.cwd(), "data/company-template/ic-memo.docx");
}

function metaPath(): string {
  const dir = process.env.FAHEEM_COMPANY_TEMPLATE_DIR;
  return dir
    ? path.join(dir, "company-template.json")
    : path.join(process.cwd(), "data/company-template.json");
}

function atomicWrite(file: string, data: string | Buffer): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, data);
  fs.renameSync(tmp, file);
}

/** Current template metadata, or `null` when no template is uploaded (or the file is missing/corrupt). */
export function getCompanyTemplateMeta(): CompanyTemplateMeta {
  const file = metaPath();
  if (!fs.existsSync(file)) return null;
  try {
    const parsed = CompanyTemplateMetaSchema.safeParse(
      JSON.parse(fs.readFileSync(file, "utf-8")),
    );
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/** The uploaded template's raw bytes, or `null` when no template is uploaded. */
export function getCompanyTemplateBytes(): Buffer | null {
  const file = docxPath();
  if (!fs.existsSync(file)) return null;
  return fs.readFileSync(file);
}

/** Saves (or replaces — single slot) the company template + its inspection metadata. */
export function saveCompanyTemplate(
  fileName: string,
  bytes: Buffer,
  inspection: { found: string[]; unknown: string[] },
): CompanyTemplateMeta {
  const meta: CompanyTemplateMeta = {
    fileName,
    uploadedAt: new Date().toISOString(),
    found: inspection.found,
    unknown: inspection.unknown,
  };
  atomicWrite(docxPath(), bytes);
  atomicWrite(metaPath(), JSON.stringify(meta, null, 2) + "\n");
  return meta;
}

/** Removes the template + its metadata; returns false when nothing was there to remove. */
export function removeCompanyTemplate(): boolean {
  const docx = docxPath();
  const meta = metaPath();
  const existed = fs.existsSync(docx) || fs.existsSync(meta);
  if (fs.existsSync(docx)) fs.rmSync(docx);
  if (fs.existsSync(meta)) fs.rmSync(meta);
  return existed;
}
