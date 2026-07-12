import fs from "node:fs";
import path from "node:path";
import {
  ArtifactMetaSchema,
  DealSchema,
  type ArtifactMeta,
  type Localized,
} from "@/lib/types";
import { LibraryClient } from "./library-client";

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

  return (
    <main className="mx-auto max-w-[1040px] px-8 pt-10 pb-16">
      <LibraryClient artifacts={artifacts} workspaceNames={workspaceNames} />
    </main>
  );
}
