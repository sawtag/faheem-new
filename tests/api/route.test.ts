import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { POST } from "@/app/api/chat/route";
import { cacheKey } from "@/lib/ai/cache";
import type { CacheEntry, ChatRequest, SSEEvent } from "@/lib/types";

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

let cacheDir: string;
let auditFile: string;

afterEach(() => {
  delete process.env.FAHEEM_CACHE_DIR;
  delete process.env.FAHEEM_AUDIT_PATH;
  delete process.env.FAHEEM_REPLAY_PACE;
  if (cacheDir) fs.rmSync(cacheDir, { recursive: true, force: true });
  if (auditFile && fs.existsSync(auditFile)) fs.rmSync(auditFile);
});

describe("POST /api/chat (cached mode)", () => {
  it("replays a fixture as valid SSE and grows the audit log by one", async () => {
    cacheDir = fs.mkdtempSync(path.join(os.tmpdir(), "faheem-cache-"));
    auditFile = path.join(cacheDir, "audit.json");
    process.env.FAHEEM_CACHE_DIR = cacheDir;
    process.env.FAHEEM_AUDIT_PATH = auditFile;
    process.env.FAHEEM_REPLAY_PACE = "0";

    const req: ChatRequest = {
      question: "cached q",
      lang: "en",
      context: { kind: "workspace", companyId: "jahez" },
      docIds: ["fy25-er"],
    };
    const entry: CacheEntry = {
      key: cacheKey(req),
      request: req,
      events: [
        { type: "stage", agent: "valuation", status: "start" },
        { type: "delta", text: "GMV grew double digits" },
        { type: "delta", text: "[[1]]" },
        { type: "citation", n: 1, docId: "fy25-er", page: 3, quote: "GMV" },
        { type: "done", cached: true },
      ],
      recordedAt: new Date().toISOString(),
    };
    fs.writeFileSync(
      path.join(cacheDir, `${entry.key}.json`),
      JSON.stringify(entry),
    );

    const res = await POST(chatRequest(req, "cached"));
    expect(res.headers.get("content-type")).toContain("text/event-stream");

    const events = parseSSE(await res.text());
    expect(events).toEqual(entry.events);

    const audit = JSON.parse(fs.readFileSync(auditFile, "utf-8")) as unknown[];
    expect(audit).toHaveLength(1);
    expect(audit[0]).toMatchObject({
      user: "Ali",
      context: "workspace:jahez",
      action: "question",
      question: "cached q",
      citationCount: 1,
    });
  });

  it("emits a graceful error event for an unknown cache key", async () => {
    cacheDir = fs.mkdtempSync(path.join(os.tmpdir(), "faheem-cache-"));
    auditFile = path.join(cacheDir, "audit.json");
    process.env.FAHEEM_CACHE_DIR = cacheDir; // empty dir → no fixture
    process.env.FAHEEM_AUDIT_PATH = auditFile;

    const req: ChatRequest = {
      question: "not recorded",
      lang: "en",
      context: { kind: "firm" },
    };
    const res = await POST(chatRequest(req, "cached"));
    const events = parseSSE(await res.text());
    expect(events).toHaveLength(1);
    expect(events[0]!.type).toBe("error");
  });

  it("rejects an invalid request body with 400", async () => {
    const res = await POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: "", lang: "en" }),
      }),
    );
    expect(res.status).toBe(400);
  });
});
