import fs from "node:fs";
import path from "node:path";
import {
  ArtifactMetaSchema,
  DealSchema,
  type ArtifactMeta,
  type Localized,
} from "@/lib/types";
import { getCompanyTemplateMeta } from "@/lib/company-template";
import { buildTemplateTags, TEMPLATE_TAG_KEYS } from "@/lib/generate/template";
import { LibraryClient } from "./library-client";
import { CompanyTemplateSection } from "./company-template-section";

// data/company-template.json is mutable at runtime (upload/remove via
// /api/template) — force-dynamic so a prod build never freezes the template
// slot at build time (mirrors the agents/skills pages' convention).
export const dynamic = "force-dynamic";

/** data/artifacts.json is written by the (not-yet-built) generate route — absent until then, which is a valid, expected state (renders the empty state). */
function loadArtifacts(): ArtifactMeta[] {
  const file = path.join(process.cwd(), "data/artifacts.json");
  if (!fs.existsSync(file)) return [];
  const parsed = ArtifactMetaSchema.array().safeParse(
    JSON.parse(fs.readFileSync(file, "utf-8")),
  );
  return parsed.success ? parsed.data : [];
}

/** Deal.id -> localized display name, reused for the artifact card's workspace label (avoids re-authoring company names). */
function loadWorkspaceNames(): Record<string, Localized> {
  const file = path.join(process.cwd(), "data/deals.json");
  if (!fs.existsSync(file)) return {};
  const parsed = DealSchema.array().safeParse(
    JSON.parse(fs.readFileSync(file, "utf-8")),
  );
  if (!parsed.success) return {};
  return Object.fromEntries(parsed.data.map((d) => [d.id, d.name]));
}

export default function LibraryPage() {
  const artifacts = loadArtifacts();
  const workspaceNames = loadWorkspaceNames();
  const templateMeta = getCompanyTemplateMeta();
  const tags = buildTemplateTags();
  const tagCatalog = TEMPLATE_TAG_KEYS.map((key) => ({
    key,
    value: tags[key],
  }));

  return (
    <main className="mx-auto max-w-[1040px] px-8 pt-10 pb-16">
      <LibraryClient artifacts={artifacts} workspaceNames={workspaceNames} />
      <div className="mt-12">
        <CompanyTemplateSection
          initialMeta={templateMeta}
          tagCatalog={tagCatalog}
        />
      </div>
    </main>
  );
}
