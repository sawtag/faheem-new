import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  MAX_UPLOAD_BYTES,
  getUpload,
  isPdfBytes,
  isUploadId,
  listUploads,
  newUploadId,
  registerUpload,
  saveUploadFile,
  uploadFilePath,
  uploadToCorpusDoc,
  type UploadDoc,
} from "@/lib/uploads";

let dir: string;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "faheem-uploads-"));
  process.env.FAHEEM_UPLOAD_DIR = dir;
});

afterEach(() => {
  delete process.env.FAHEEM_UPLOAD_DIR;
  fs.rmSync(dir, { recursive: true, force: true });
});

function doc(id: string, over: Partial<UploadDoc> = {}): UploadDoc {
  return {
    id,
    title: "Sample",
    sizeMB: 0.5,
    uploadedAt: "2026-07-13T00:00:00.000Z",
    ...over,
  };
}

describe("isUploadId", () => {
  it("accepts only upload-<8hex>", () => {
    expect(isUploadId("upload-0011aabb")).toBe(true);
    expect(isUploadId("upload-abcdef01")).toBe(true);
    expect(isUploadId("upload-XYZ")).toBe(false);
    expect(isUploadId("upload-0011aab")).toBe(false); // 7 hex
    expect(isUploadId("upload-0011aabbc")).toBe(false); // 9 hex
    expect(isUploadId("fy25-er")).toBe(false);
    expect(isUploadId("../etc/passwd")).toBe(false);
    expect(isUploadId("upload-../../x")).toBe(false);
  });

  it("newUploadId is well-formed and unique", () => {
    const a = newUploadId();
    const b = newUploadId();
    expect(isUploadId(a)).toBe(true);
    expect(isUploadId(b)).toBe(true);
    expect(a).not.toBe(b);
  });
});

describe("isPdfBytes (magic bytes)", () => {
  it("accepts a %PDF- header, rejects everything else", () => {
    expect(isPdfBytes(Buffer.from("%PDF-1.4\n..."))).toBe(true);
    expect(isPdfBytes(Buffer.from("%PDF"))).toBe(false); // no dash / too short
    expect(isPdfBytes(Buffer.from("PK\x03\x04"))).toBe(false); // zip/docx
    expect(isPdfBytes(Buffer.from("<html>"))).toBe(false);
    expect(isPdfBytes(new Uint8Array([]))).toBe(false);
    expect(isPdfBytes(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]))).toBe(
      true,
    );
  });

  it("exposes the 32 MB ceiling", () => {
    expect(MAX_UPLOAD_BYTES).toBe(32 * 1024 * 1024);
  });
});

describe("uploadFilePath — traversal safety", () => {
  it("stays under the uploads dir for valid ids, null for unsafe ids", () => {
    const p = uploadFilePath("upload-0011aabb");
    expect(p).toBe(path.join(dir, "upload-0011aabb.pdf"));
    expect(uploadFilePath("../../etc/passwd")).toBeNull();
    expect(uploadFilePath("upload-../../x")).toBeNull();
    expect(uploadFilePath("fy25-er")).toBeNull();
  });
});

describe("registry io", () => {
  it("returns [] when no registry exists", () => {
    expect(listUploads()).toEqual([]);
    expect(getUpload("upload-0011aabb")).toBeNull();
  });

  it("registers, reads back, and replaces by id", () => {
    registerUpload(doc("upload-00000001", { title: "First" }));
    registerUpload(
      doc("upload-00000002", { title: "Second", workspace: "jahez" }),
    );
    expect(listUploads().map((u) => u.id)).toEqual([
      "upload-00000001",
      "upload-00000002",
    ]);
    expect(getUpload("upload-00000002")?.workspace).toBe("jahez");

    // re-register same id → replace, no duplicate
    registerUpload(doc("upload-00000001", { title: "First (v2)" }));
    expect(listUploads()).toHaveLength(2);
    expect(getUpload("upload-00000001")?.title).toBe("First (v2)");
  });

  it("survives a corrupt registry file (returns [])", () => {
    fs.writeFileSync(path.join(dir, "registry.json"), "{ not json");
    expect(listUploads()).toEqual([]);
  });

  it("saveUploadFile writes the PDF under the uploads dir", () => {
    saveUploadFile("upload-0011aabb", Buffer.from("%PDF-1.4 fake"));
    const p = path.join(dir, "upload-0011aabb.pdf");
    expect(fs.existsSync(p)).toBe(true);
    expect(fs.readFileSync(p).toString()).toContain("%PDF");
  });

  it("saveUploadFile throws on an unsafe id", () => {
    expect(() => saveUploadFile("../evil", Buffer.from("x"))).toThrow();
  });
});

describe("uploadToCorpusDoc", () => {
  it("synthesizes a CorpusDoc that carries the fileId + workspace", () => {
    const cd = uploadToCorpusDoc(
      doc("upload-00000001", {
        title: "Judge Memo",
        workspace: "jahez",
        fileId: "file_abc",
        sizeMB: 1.2,
      }),
    );
    expect(cd).toMatchObject({
      id: "upload-00000001",
      title: { en: "Judge Memo", ar: "Judge Memo" },
      type: "deal",
      workspace: "jahez",
      fileId: "file_abc",
      sizeMB: 1.2,
    });
    expect(cd.pages).toBeGreaterThan(0);
  });

  it("omits workspace/fileId when absent", () => {
    const cd = uploadToCorpusDoc(doc("upload-00000002"));
    expect(cd.workspace).toBeUndefined();
    expect(cd.fileId).toBeUndefined();
  });
});
