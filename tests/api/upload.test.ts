// @vitest-environment node
// Exercises the server upload route: multipart FormData + File must come from
// the same (undici) realm the route's `instanceof File` check uses — jsdom's
// File class differs and would spuriously 400.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { POST } from "@/app/api/upload/route";
import { setUploaderForTests } from "@/lib/ai/client";
import { listUploads, uploadFilePath } from "@/lib/uploads";
import { makeSamplePdf } from "@/tests/fixtures/make-pdf";
import type { CorpusDoc } from "@/lib/types";

let dir: string;
let hadKey: string | undefined;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "faheem-upload-route-"));
  process.env.FAHEEM_UPLOAD_DIR = dir;
  hadKey = process.env.ANTHROPIC_API_KEY;
  delete process.env.ANTHROPIC_API_KEY;
});

afterEach(() => {
  setUploaderForTests(null);
  delete process.env.FAHEEM_UPLOAD_DIR;
  if (hadKey === undefined) delete process.env.ANTHROPIC_API_KEY;
  else process.env.ANTHROPIC_API_KEY = hadKey;
  fs.rmSync(dir, { recursive: true, force: true });
});

function uploadRequest(
  bytes: Buffer,
  filename: string,
  query = "",
  type = "application/pdf",
): Request {
  const body = new FormData();
  body.append("file", new File([new Uint8Array(bytes)], filename, { type }));
  return new Request(`http://localhost/api/upload${query}`, {
    method: "POST",
    body,
  });
}

describe("POST /api/upload — validation", () => {
  it("rejects a non-PDF (magic bytes) with 415", async () => {
    const res = await POST(
      uploadRequest(Buffer.from("PK\x03\x04 zip"), "x.pdf"),
    );
    expect(res.status).toBe(415);
    expect((await res.json()).error).toMatch(/only pdf/i);
    expect(listUploads()).toEqual([]);
  });

  it("rejects an oversized file with 413", async () => {
    // 33 MB of valid-PDF-looking bytes
    const big = Buffer.concat([
      Buffer.from("%PDF-1.4\n"),
      Buffer.alloc(33 * 1024 * 1024, 0x20),
    ]);
    const res = await POST(uploadRequest(big, "big.pdf"));
    expect(res.status).toBe(413);
    expect((await res.json()).error).toMatch(/32 MB/i);
  });

  it("rejects a missing file with 400", async () => {
    const res = await POST(
      new Request("http://localhost/api/upload", {
        method: "POST",
        body: new FormData(),
      }),
    );
    expect(res.status).toBe(400);
  });

  it("returns Arabic errors when ?lang=ar", async () => {
    const res = await POST(
      uploadRequest(Buffer.from("<html>"), "x.pdf", "?lang=ar"),
    );
    expect(res.status).toBe(415);
    expect((await res.json()).error).toMatch(/PDF/);
    expect(
      (await POST(uploadRequest(Buffer.from("<html>"), "x.pdf", "?lang=ar")))
        .status,
    ).toBe(415);
  });
});

describe("POST /api/upload — success paths", () => {
  it("uploads to Files API (injected), saves to disk, registers with fileId", async () => {
    const seen: string[] = [];
    setUploaderForTests(async (_bytes, filename) => {
      seen.push(filename);
      return "file_test123";
    });

    const res = await POST(
      uploadRequest(makeSamplePdf(), "Judge-Memo_v2.pdf", "?workspace=jahez"),
    );
    expect(res.status).toBe(201);
    const doc = (await res.json()).doc as CorpusDoc;

    expect(doc.id).toMatch(/^upload-[0-9a-f]{8}$/);
    expect(doc.title).toEqual({ en: "Judge Memo v2", ar: "Judge Memo v2" });
    expect(doc.workspace).toBe("jahez");
    expect(doc.fileId).toBe("file_test123");
    expect(seen).toEqual([`${doc.id}.pdf`]);

    // registry + disk
    const reg = listUploads();
    expect(reg).toHaveLength(1);
    expect(reg[0]!.fileId).toBe("file_test123");
    expect(fs.existsSync(uploadFilePath(doc.id)!)).toBe(true);
  });

  it("offline (no API key, no uploader) → 201, registered WITHOUT a fileId, still viewable", async () => {
    const res = await POST(uploadRequest(makeSamplePdf(), "sample-note.pdf"));
    expect(res.status).toBe(201);
    const doc = (await res.json()).doc as CorpusDoc;
    expect(doc.fileId).toBeUndefined();
    expect(doc.workspace).toBeUndefined();
    // file is still saved so the viewer can serve it
    expect(fs.existsSync(uploadFilePath(doc.id)!)).toBe(true);
    expect(listUploads()[0]!.fileId).toBeUndefined();
  });

  it("Files API failure → 502, nothing registered under a fileId", async () => {
    setUploaderForTests(async () => {
      throw new Error("files api down");
    });
    const res = await POST(uploadRequest(makeSamplePdf(), "sample.pdf"));
    expect(res.status).toBe(502);
    // the file was saved to disk, but no registry entry with a bogus fileId
    expect(listUploads()).toEqual([]);
  });
});
