import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { POST } from "@/app/api/chat/route";
import type { ChatRequest, SSEEvent } from "@/lib/types";

function parseSSE(text: string): SSEEvent[] {
  return text
    .split("\n\n")
    .filter((chunk) => chunk.trim().length > 0)
    .map((chunk) => JSON.parse(chunk.replace(/^data: /, "")) as SSEEvent);
}

function chatRequest(req: ChatRequest, mode: string): Request {
  return new Request("http://localhost/api/chat", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: `faheem_mode=${mode}`,
    },
    body: JSON.stringify(req),
  });
}

let auditFile: string;

beforeEach(() => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "faheem-chat-up-"));
  auditFile = path.join(dir, "audit.json");
  process.env.FAHEEM_AUDIT_PATH = auditFile;
});

afterEach(() => {
  delete process.env.FAHEEM_AUDIT_PATH;
  if (fs.existsSync(auditFile)) fs.rmSync(auditFile);
});

describe("POST /api/chat — cached mode + uploaded doc", () => {
  const req: ChatRequest = {
    question: "What does the uploaded memo say about margins?",
    lang: "en",
    context: { kind: "workspace", companyId: "jahez" },
    docIds: ["fy25-er", "upload-000000aa"],
  };

  it("emits a single graceful 'switch to live' error and never audits", async () => {
    const res = await POST(chatRequest(req, "cached"));
    expect(res.headers.get("content-type")).toContain("text/event-stream");

    const events = parseSSE(await res.text());
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ type: "error" });
    expect((events[0] as { message: string }).message).toMatch(/live mode/i);

    // no engine call, no audit entry
    expect(fs.existsSync(auditFile)).toBe(false);
  });

  it("Arabic message under lang=ar", async () => {
    const res = await POST(chatRequest({ ...req, lang: "ar" }, "cached"));
    const events = parseSSE(await res.text());
    expect((events[0] as { message: string }).message).toContain(
      "الوضع المباشر",
    );
  });

  it("cached mode WITHOUT an uploaded doc is unaffected (falls through to the engine)", async () => {
    // no recording for this key → the engine emits the generic palette hint,
    // NOT the upload message, and it DID reach the engine.
    const res = await POST(
      chatRequest({ ...req, docIds: ["fy25-er"] }, "cached"),
    );
    const events = parseSSE(await res.text());
    expect(events.at(-1)).toMatchObject({ type: "error" });
    expect((events.at(-1) as { message: string }).message).not.toMatch(
      /live mode/i,
    );
  });
});
