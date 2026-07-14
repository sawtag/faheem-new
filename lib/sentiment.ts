/**
 * Market Sentiment data layer (WS-D, live-model-provenance plan §0/§3).
 * data/social-pack.json is a clearly-labeled ILLUSTRATIVE/synthetic demo pack
 * (never real scraped posts); data/sentiment.json is a label + one-line
 * rationale per company, pointing at social-pack ids. Both zod-validated at
 * module load — SocialPostSchema/SentimentEntrySchema are `.strict()`, so an
 * accidental sourced-number shape ({value, sourceDoc, page}) fails loudly
 * here rather than shipping to the UI.
 */
import {
  SentimentEntrySchema,
  SocialPostSchema,
  type SentimentEntry,
  type SocialPost,
} from "@/lib/types";
import socialPackData from "@/data/social-pack.json";
import sentimentData from "@/data/sentiment.json";

export const SOCIAL_PACK: SocialPost[] =
  SocialPostSchema.array().parse(socialPackData);

export const SENTIMENT: SentimentEntry[] =
  SentimentEntrySchema.array().parse(sentimentData);

export function sentimentByCompany(
  companyId: string,
): SentimentEntry | undefined {
  return SENTIMENT.find((s) => s.companyId === companyId);
}

/** Resolves a sentiment entry's postIds to the actual social-pack posts, in order. */
export function postsForEntry(entry: SentimentEntry): SocialPost[] {
  const byId = new Map(SOCIAL_PACK.map((p) => [p.id, p]));
  return entry.postIds.flatMap((id) => {
    const post = byId.get(id);
    return post ? [post] : [];
  });
}
