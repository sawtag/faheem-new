import type { ArtifactMeta, Lang } from "@/lib/types";

/** Library filter pills (design-briefs §3.3): All / IC Memos / Models / Decks. */
export type LibraryFilter = "all" | "docx" | "xlsx" | "pptx";

/** Pure filter+search over the artifact list — kept standalone so it's unit-testable without fs/network. */
export function filterArtifacts(
  artifacts: ArtifactMeta[],
  filter: LibraryFilter,
  query: string,
  lang: Lang,
): ArtifactMeta[] {
  const q = query.trim().toLowerCase();
  return artifacts.filter((a) => {
    if (filter !== "all" && a.kind !== filter) return false;
    if (q && !a.name[lang].toLowerCase().includes(q)) return false;
    return true;
  });
}
