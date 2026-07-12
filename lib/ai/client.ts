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
import Anthropic from "@anthropic-ai/sdk";

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
let cached: FaheemClient | null = null;

/** Inject a mock for tests; pass null to clear. Unit tests NEVER hit the network. */
export function setClientForTests(client: FaheemClient | null): void {
  injected = client;
  cached = null;
}

export function getClient(): FaheemClient {
  if (injected) return injected;
  if (!cached) {
    // `new Anthropic()` resolves ANTHROPIC_API_KEY from the environment.
    cached = new Anthropic() as unknown as FaheemClient;
  }
  return cached;
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
