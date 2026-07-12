/**
 * Anthropic SDK factory + the minimal client surface the engine uses.
 *
 * AGENTS.md rule 10: the SDK is imported ONLY here (and API routes may import
 * this module). The real client is constructed lazily so unit tests — which
 * inject a mock via setClientForTests — never touch the network and never need
 * ANTHROPIC_API_KEY.
 *
 * We deliberately type against a small structural interface (FaheemClient)
 * rather than the full SDK types: the engine only ever calls
 * `beta.messages.stream` (grounded chat + Files-API + citations) and
 * `messages.create` (the Haiku prompt improver). A single `as unknown as`
 * cast at the construction boundary reconciles the real SDK with this surface.
 */
import Anthropic, { toFile } from "@anthropic-ai/sdk";

// ─────────────────────────── SDK-facing types ───────────────────────────

/** PDF citation location (Anthropic returns `start_page_number` 1-indexed). */
export interface PageLocationCitation {
  type: "page_location";
  cited_text: string;
  document_index: number;
  document_title?: string | null;
  start_page_number: number;
  end_page_number?: number;
}

/** Non-PDF citation shapes — not emitted for our all-PDF corpus, kept for narrowing. */
export interface OtherCitation {
  type: "char_location" | "content_block_location";
  cited_text: string;
  document_index: number;
}

export type StreamCitation = PageLocationCitation | OtherCitation;

export type StreamDelta =
  | { type: "text_delta"; text: string }
  | { type: "thinking_delta"; thinking: string }
  | { type: "signature_delta"; signature: string }
  | { type: "input_json_delta"; partial_json: string }
  | { type: "citations_delta"; citation: StreamCitation };

/** The raw streaming events we consume (extra SDK fields are ignored at runtime). */
export type StreamEvent =
  | { type: "message_start" }
  | { type: "content_block_start"; index: number }
  | { type: "content_block_delta"; index: number; delta: StreamDelta }
  | { type: "content_block_stop"; index: number }
  | { type: "message_delta" }
  | { type: "message_stop" };

export interface MessageStreamParams {
  model: string;
  max_tokens: number;
  system?: unknown;
  messages: unknown[];
  thinking?: unknown;
  output_config?: unknown;
  betas?: string[];
}

export interface MessageCreateParams {
  model: string;
  max_tokens: number;
  system?: string;
  messages: { role: string; content: string }[];
  output_config?: unknown;
}

export interface MessageResponse {
  content: { type: string; text?: string }[];
}

export interface FaheemClient {
  beta: {
    messages: {
      stream(params: MessageStreamParams): AsyncIterable<StreamEvent>;
    };
  };
  messages: {
    create(params: MessageCreateParams): Promise<MessageResponse>;
  };
}

// ─────────────────────────── factory / injection ───────────────────────────

let injected: FaheemClient | null = null;
let cachedReal: Anthropic | null = null;

/** The one real SDK instance — `new Anthropic()` resolves the key from the env. */
function realClient(): Anthropic {
  if (!cachedReal) cachedReal = new Anthropic();
  return cachedReal;
}

/** Inject a mock for tests; pass null to clear. Unit tests NEVER hit the network. */
export function setClientForTests(client: FaheemClient | null): void {
  injected = client;
  cachedReal = null;
}

export function getClient(): FaheemClient {
  if (injected) return injected;
  return realClient() as unknown as FaheemClient;
}

// ─────────────────────────── Files API (uploads) ───────────────────────────

/** Test seam for the Files API upload — bypasses the SDK + network entirely. */
type Uploader = (bytes: Buffer, filename: string) => Promise<string>;
let injectedUploader: Uploader | null = null;

/** Inject a fake uploader for tests; pass null to clear. */
export function setUploaderForTests(uploader: Uploader | null): void {
  injectedUploader = uploader;
}

/**
 * Uploads a PDF to the Anthropic Files API and returns its `file_id`. Returns
 * null when no ANTHROPIC_API_KEY is configured (cached / offline demo): the file
 * is still saved and viewable, but grounded live chat about it is unavailable.
 * Throws only on a genuine API failure. Keeps SDK instantiation in this one
 * module (AGENTS.md rule 10).
 */
export async function uploadPdf(
  bytes: Buffer,
  filename: string,
): Promise<string | null> {
  if (injectedUploader) return injectedUploader(bytes, filename);
  if (!process.env.ANTHROPIC_API_KEY) return null;
  const file = await toFile(bytes, filename, { type: "application/pdf" });
  const res = await realClient().beta.files.upload(
    { file },
    { headers: { "anthropic-beta": "files-api-2025-04-14" } },
  );
  return res.id;
}

// ─────────────────────────────── env config ───────────────────────────────

export function getModel(): string {
  return process.env.FAHEEM_MODEL || "claude-opus-4-8";
}

export function getImproveModel(): string {
  return process.env.FAHEEM_IMPROVE_MODEL || "claude-haiku-4-5";
}

/** Forwarded to the API's `output_config.effort`; undefined → API default. */
export function getEffort(): string | undefined {
  const value = process.env.FAHEEM_EFFORT?.trim();
  return value ? value : undefined;
}
