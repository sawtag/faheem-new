import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GET } from "@/app/api/documents/[id]/route";
import { registerUpload, saveUploadFile, type UploadDoc } from "@/lib/uploads";
import { makeSamplePdf } from "@/tests/fixtures/make-pdf";

let dir: string;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "faheem-docs-route-"));
  process.env.FAHEEM_UPLOAD_DIR = dir;
});

afterEach(() => {
  delete process.env.FAHEEM_UPLOAD_DIR;
  fs.rmSync(dir, { recursive: true, force: true });
});

function get(id: string): Promise<Response> {
  return GET(new Request(`http://localhost/api/documents/${id}`), {
    params: Promise.resolve({ id }),
  });
}

const doc = (id: string): UploadDoc => ({
  id,
  title: "Uploaded",
  sizeMB: 0.1,
  uploadedAt: "2026-07-13T00:00:00.000Z",
});

describe("GET /api/documents/[id]", () => {
  it("serves a registered upload as application/pdf", async () => {
    const bytes = makeSamplePdf();
    registerUpload(doc("upload-000000aa"));
    saveUploadFile("upload-000000aa", bytes);

    const res = await get("upload-000000aa");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/pdf");
    const body = Buffer.from(await res.arrayBuffer());
    expect(body.subarray(0, 5).toString()).toBe("%PDF-");
    expect(body.byteLength).toBe(bytes.byteLength);
  });

  it("404s an upload-shaped id that is not registered", async () => {
    expect((await get("upload-deadbeef")).status).toBe(404);
  });

  it("404s a registered upload whose file is missing on disk", async () => {
    registerUpload(doc("upload-000000bb")); // no saveUploadFile
    expect((await get("upload-000000bb")).status).toBe(404);
  });

  it("404s an unknown / unsafe id", async () => {
    expect((await get("not-a-doc")).status).toBe(404);
    expect((await get("..%2f..%2fetc")).status).toBe(404);
  });

  it("still serves a verified corpus doc", async () => {
    const res = await get("industry-news-pack"); // small tracked corpus PDF
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/pdf");
  });
});
