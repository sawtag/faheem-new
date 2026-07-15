/**
 * Golden question registry (P5a), the single source for the record-goldens
 * script and the ⌘K demo palette. Every `.request` is a real `ChatRequest`
 * (zod-validated below and in tests/demo/golden-questions.test.ts), so
 * selecting a palette entry reproduces the exact recorded cache key
 * (lib/ai/cache.ts's `cacheKey()` formula), no on-stage typo can ever cause
 * a cache miss.
 */
import { z } from "zod";
import { ChatRequestSchema, LocalizedSchema } from "@/lib/types";
import type { ChatContext, Lang } from "@/lib/types";
import goldenData from "@/data/golden-questions.json";

export const GoldenQuestionSchema = z.object({
  id: z.string(),
  label: LocalizedSchema,
  request: ChatRequestSchema,
});
export type GoldenQuestion = z.infer<typeof GoldenQuestionSchema>;

export const GOLDEN_QUESTIONS: GoldenQuestion[] =
  GoldenQuestionSchema.array().parse(goldenData);

export function goldenQuestionById(id: string): GoldenQuestion | undefined {
  return GOLDEN_QUESTIONS.find((q) => q.id === id);
}

/**
 * Palette filtering, pure so it unit-tests without React (tests/demo/golden-questions.test.ts).
 *
 * Language gate first: an entry only ever appears while the UI is already in
 * its recorded language, so a presenter can never fire a `lang` mismatch that
 * would miss the exact-key cache (the Arabic compliance beat only shows up once
 * the presenter has switched to `ar`).
 *
 * Context gate: `null` (a page with no chat surface, Home, Deals, Agents…)
 * shows everything; a workspace page shows that workspace's entries plus firm
 * entries; the IC room shows only `ic` entries; a firm page shows only firm
 * entries.
 */
export function filterGoldenQuestions(
  all: GoldenQuestion[],
  ctx: ChatContext | null,
  lang: Lang,
): GoldenQuestion[] {
  const byLang = all.filter((q) => q.request.lang === lang);
  if (!ctx) return byLang;
  if (ctx.kind === "ic") {
    return byLang.filter((q) => q.request.context.kind === "ic");
  }
  if (ctx.kind === "workspace") {
    return byLang.filter(
      (q) =>
        q.request.context.kind === "firm" ||
        (q.request.context.kind === "workspace" &&
          q.request.context.companyId === ctx.companyId),
    );
  }
  return byLang.filter((q) => q.request.context.kind === "firm");
}

/** Groups already-filtered entries by context, in encounter order, the palette's section headers. */
export function groupGoldenQuestions(
  entries: GoldenQuestion[],
): Map<string, GoldenQuestion[]> {
  const groups = new Map<string, GoldenQuestion[]>();
  for (const entry of entries) {
    const key =
      entry.request.context.kind === "workspace"
        ? `workspace:${entry.request.context.companyId}`
        : entry.request.context.kind;
    const list = groups.get(key);
    if (list) list.push(entry);
    else groups.set(key, [entry]);
  }
  return groups;
}
