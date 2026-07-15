/**
 * Faheem shared contracts, fable-owned (AGENTS.md rule 7).
 * Agents code AGAINST these types; never redefine, fork, or edit them.
 * Change requests go through fable via your task result summary.
 *
 * Env contract (.env / .env.example):
 *   ANTHROPIC_API_KEY     server-only; SDK imported ONLY in lib/ai/client.ts + API routes
 *   FAHEEM_MODE           live | cached | auto   (runtime override: cookie "faheem_mode" wins)
 *   FAHEEM_MODEL          default "claude-opus-4-8"
 *   FAHEEM_IMPROVE_MODEL  default "claude-haiku-4-5"
 *   FAHEEM_EFFORT         forwarded to the API's output_config effort
 *   FAHEEM_RECORD         "1" → persist every live response as a CacheEntry
 *   FAHEEM_TIMEOUT_MS     auto-mode first-token timeout, default 10000
 *
 * Cache key spec (implemented in lib/ai/cache.ts, reused by scripts/record-goldens.ts
 * and the ⌘K demo palette, all three MUST agree):
 *   contextKey = ctx.kind === "workspace" ? `workspace:${ctx.companyId}` : ctx.kind
 *   key = sha1([question, lang, contextKey, agent ?? "", (docIds ?? []).join(",")].join("|"))
 */
import { z } from "zod";

// ─────────────────────────── chat / SSE protocol ───────────────────────────

export const AGENT_IDS = [
  "orchestrator",
  "screening",
  "research",
  "doc-intel",
  "valuation",
  "comparables",
  "risk",
  "writing",
  "compliance",
  "ic",
  // WS-D roster expansion (live-model-provenance plan §1 Pillar 3, §3 WS-D)
  "accounting-qoe",
  "critical-review",
  "news-intel",
  "sentiment",
] as const;

export const AgentIdSchema = z.enum(AGENT_IDS);
export type AgentId = z.infer<typeof AgentIdSchema>;

export const LangSchema = z.enum(["en", "ar"]);
export type Lang = z.infer<typeof LangSchema>;

export const ChatContextSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("firm") }),
  z.object({ kind: z.literal("workspace"), companyId: z.string() }),
  z.object({ kind: z.literal("ic") }),
]);
export type ChatContext = z.infer<typeof ChatContextSchema>;

export const ChatRequestSchema = z.object({
  question: z.string().min(1),
  lang: LangSchema,
  context: ChatContextSchema,
  /** @-mention; undefined → orchestrator picks */
  agent: AgentIdSchema.optional(),
  /** #-refs; scopes/emphasizes corpus docs */
  docIds: z.array(z.string()).optional(),
});
export type ChatRequest = z.infer<typeof ChatRequestSchema>;

/**
 * Inline citations: the server appends marker `[[n]]` at the end of each cited
 * text block and emits the matching `citation` event; the client replaces
 * markers with <CitationChip n> linking to PdfPanel(docId, page).
 */
export const SSEEventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("stage"),
    agent: AgentIdSchema,
    status: z.enum(["start", "done"]),
    docIds: z.array(z.string()).optional(),
  }),
  z.object({ type: z.literal("delta"), text: z.string() }),
  z.object({
    type: z.literal("citation"),
    n: z.number().int().positive(),
    docId: z.string(),
    page: z.number().int().positive(),
    quote: z.string(),
  }),
  z.object({ type: z.literal("done"), cached: z.boolean() }),
  z.object({ type: z.literal("error"), message: z.string() }),
]);
export type SSEEvent = z.infer<typeof SSEEventSchema>;

export type FaheemMode = "live" | "cached" | "auto";

// ─────────────────────────────── data schemas ───────────────────────────────

export const LocalizedSchema = z.object({ en: z.string(), ar: z.string() });
export type Localized = z.infer<typeof LocalizedSchema>;

export const CiteSchema = z.object({
  docId: z.string(),
  page: z.number().int().positive(),
});
export type Cite = z.infer<typeof CiteSchema>;

/** data/corpus/manifest.json = CorpusDoc[] */
export const CorpusDocSchema = z.object({
  id: z.string(),
  title: LocalizedSchema,
  /** repo-relative, e.g. "data/corpus/fy25-er.pdf" */
  path: z.string(),
  pages: z.number().int().positive(),
  sizeMB: z.number().positive(),
  type: z.enum(["public", "lunar", "deal"]),
  /** deal-workspace scoping, e.g. "jahez", "darb", "thara-pay" */
  workspace: z.string().optional(),
  sourceUrl: z.string().optional(),
  /** Files API id, written by scripts/upload-files-api.ts */
  fileId: z.string().optional(),
});
export type CorpusDoc = z.infer<typeof CorpusDocSchema>;

/** data/model-inputs.json = ModelInput[], keys are `<period>.<metric>` snake_case, e.g. "fy25.gmv" */
export const ModelInputSchema = z.object({
  key: z.string(),
  value: z.number(),
  /** e.g. "SAR m", "SAR", "%", "x", "orders m" */
  unit: z.string(),
  /** must be a CorpusDoc.id present in the manifest */
  sourceDoc: z.string(),
  page: z.number().int().positive(),
  note: z.string().optional(),
});
export type ModelInput = z.infer<typeof ModelInputSchema>;

export const ScreeningRowSchema = z.object({
  criterion: LocalizedSchema,
  verdict: z.enum(["pass", "warn", "fail"]),
  note: LocalizedSchema,
  cite: CiteSchema,
});
export type ScreeningRow = z.infer<typeof ScreeningRowSchema>;

export const IcMetricsSchema = z.object({
  /** implied IRR at entry, percent (e.g. 17.2) */
  irr: z.number(),
  /** mandate hurdle, percent, Lunar's is 15 */
  hurdle: z.number(),
  /** scenario-weighted expected return, percent */
  expectedReturn: z.number(),
  /** quantified risk score 1–10 (higher = riskier) */
  riskScore: z.number(),
  mandateFit: z.enum(["pass", "warn"]),
  shariah: z.enum(["pass", "fail"]),
  recommendation: LocalizedSchema,
  cite: CiteSchema,
});
export type IcMetrics = z.infer<typeof IcMetricsSchema>;

/** data/deals.json = Deal[] */
export const DealSchema = z.object({
  id: z.string(),
  name: LocalizedSchema,
  /** market/ownership type shown as a muted suffix in the sidebar Projects
   *  rows, e.g. "Public" / "Private" / "Pre-IPO" (bilingual, optional) */
  listing: LocalizedSchema.optional(),
  sector: LocalizedSchema,
  origin: z.enum(["inbound", "market-screen"]),
  stage: z.enum(["screening", "analysis", "ic-review", "declined"]),
  /** e.g. "SAR 40M Series B", absent for public market positions */
  ask: LocalizedSchema.optional(),
  statusLine: LocalizedSchema,
  /** public/ path to a vendored real logo; absent → monogram tile (AGENTS.md assets policy) */
  logo: z.string().optional(),
  /** origin badge detail, e.g. "SAHMK/Argaam screen · 2026-07-08" */
  originDetail: LocalizedSchema.optional(),
  screening: z
    .object({
      rows: z.array(ScreeningRowSchema),
      verdict: LocalizedSchema,
    })
    .optional(),
  /** present for ic-review deals; Jahez's is added at P5 from real model outputs */
  icMetrics: IcMetricsSchema.optional(),
  declineReason: LocalizedSchema.optional(),
});
export type Deal = z.infer<typeof DealSchema>;

/** data/demo-cache/<key>.json */
export const CacheEntrySchema = z.object({
  key: z.string(),
  request: ChatRequestSchema,
  events: z.array(SSEEventSchema),
  recordedAt: z.string(),
});
export type CacheEntry = z.infer<typeof CacheEntrySchema>;

/** data/audit-log.json = AuditEntry[], append-only; feeds the Audit Trail panel */
export const AuditEntrySchema = z.object({
  ts: z.string(),
  user: z.string(),
  /** contextKey per the cache-key spec, e.g. "workspace:jahez" | "firm" | "ic" */
  context: z.string(),
  action: z.enum([
    "question",
    "artifact",
    "stage-advance",
    "model-edit",
    "ic-draft",
  ]),
  question: z.string().optional(),
  citationCount: z.number().int().nonnegative().optional(),
  /** artifact filename when action === "artifact" */
  artifact: z.string().optional(),
});
export type AuditEntry = z.infer<typeof AuditEntrySchema>;

/** data/artifacts.json = ArtifactMeta[], generate route appends; Library + workspace Artifacts tab render from it */
export const ArtifactMetaSchema = z.object({
  id: z.string(),
  kind: z.enum(["xlsx", "docx", "pptx"]),
  name: LocalizedSchema,
  /** Deal.id */
  workspace: z.string(),
  /** public URL path, e.g. "/artifacts/jahez-valuation-model.xlsx" */
  file: z.string(),
  createdAt: z.string(),
  /** distinct cited source docs feeding the artifact, drives the "Verified · N sources" caption */
  sources: z.number().int().nonnegative().optional(),
});
export type ArtifactMeta = z.infer<typeof ArtifactMetaSchema>;

/** data/seed-chats.json = SeedChat[], durable seeded history; localStorage overlays runtime chats */
export const SeedChatSchema = z.object({
  id: z.string(),
  title: LocalizedSchema,
  context: ChatContextSchema,
  createdAt: z.string(),
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      text: z.string(),
      /** assistant messages may carry their full replayable event stream (citations, stages) */
      events: z.array(SSEEventSchema).optional(),
    }),
  ),
});
export type SeedChat = z.infer<typeof SeedChatSchema>;

// ───────────────────────── market sentiment (WS-D) ──────────────────────────
// Live-model-provenance plan §0: sentiment is a qualitative SIGNAL, never a
// sourced number. Both schemas are `.strict()`, an accidental `sourceDoc`,
// `page` or `value` field (the sourced-number shape from ModelInputSchema/
// CiteSchema) fails validation immediately, not just at test time.

/** data/social-pack.json = SocialPost[], clearly-labeled ILLUSTRATIVE/synthetic
 * demo content (never real scraped posts); the only thing the sentiment agent
 * is allowed to "read". */
export const SocialPostSchema = z
  .object({
    id: z.string(),
    sourceType: z.enum(["forum", "social", "news-headline"]),
    /** generic synthetic handle, e.g. "@ksa_markets_watch", never a real person */
    handle: z.string(),
    text: LocalizedSchema,
    tone: z.enum(["bullish", "bearish", "neutral", "skeptical", "meme"]),
    /** timestamp-ish field, illustrative, not a market data timestamp */
    postedAt: z.string(),
  })
  .strict();
export type SocialPost = z.infer<typeof SocialPostSchema>;

/** data/sentiment.json = SentimentEntry[], one label + rationale per company.
 * NEVER a `{value, sourceDoc, page}` shape (rule: sentiment carries no sourced
 * number). `signalOnly` is a literal marker rendered verbatim in the UI. */
export const SentimentEntrySchema = z
  .object({
    companyId: z.string(),
    label: z.enum(["constructive", "cautious", "negative-drift"]),
    rationale: LocalizedSchema,
    /** always true, the literal "signal only, not a valuation input" marker */
    signalOnly: z.literal(true),
    /** SocialPost.id[] this rationale draws its themes from */
    postIds: z.array(z.string()).min(1),
  })
  .strict();
export type SentimentEntry = z.infer<typeof SentimentEntrySchema>;

// ─────────────────────────────── agent registry ─────────────────────────────

/** Entries live in lib/ai/agents.ts, one source of truth for @-typeahead, Agent Activity, Agents page */
export interface AgentInfo {
  id: AgentId;
  name: Localized;
  stage: 1 | 2 | 3;
  /** i18n key for the methods list shown on the Agents page */
  methodsKey: string;
  /** system-prompt flavor selector used by lib/ai/prompts.ts */
  systemFlavor: string;
  defaultDocIds: string[];
  /** lucide icon name, icon choice is registry data, never inline in JSX (AGENTS.md assets policy) */
  icon: string;
}
