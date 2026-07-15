import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  buildCorpusContext,
  buildSessionBlocks,
  filterDocs,
  resolveSessionDocs,
} from "@/lib/ai/corpus";
import {
  registerUpload,
  uploadToCorpusDoc,
  type UploadDoc,
} from "@/lib/uploads";
import type { ChatRequest } from "@/lib/types";

let dir: string;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "faheem-corpus-up-"));
  process.env.FAHEEM_UPLOAD_DIR = dir;
});

afterEach(() => {
  delete process.env.FAHEEM_UPLOAD_DIR;
  fs.rmSync(dir, { recursive: true, force: true });
});

const up = (over: Partial<UploadDoc>): UploadDoc => ({
  id: "upload-00000000",
  title: "Uploaded",
  sizeMB: 0.4,
  fileId: "file_x",
  uploadedAt: "2026-07-13T00:00:00.000Z",
  ...over,
});

const A = up({
  id: "upload-000000aa",
  title: "Doc A",
  fileId: "file_A",
  workspace: "jahez",
  uploadedAt: "2026-07-13T10:00:00.000Z",
});
const B = up({
  id: "upload-000000bb",
  title: "Doc B",
  fileId: "file_B",
  workspace: "jahez",
  uploadedAt: "2026-07-13T10:05:00.000Z",
});

function req(over: Partial<ChatRequest> = {}): ChatRequest {
  return {
    question: "q",
    lang: "en",
    context: { kind: "workspace", companyId: "jahez" },
    ...over,
  };
}

describe("resolveSessionDocs, gating + scoping", () => {
  it("empty when no upload ids in docIds (even if registry has uploads)", () => {
    registerUpload(A);
    expect(resolveSessionDocs(req({ docIds: ["fy25-er"] }))).toEqual([]);
    expect(resolveSessionDocs(req())).toEqual([]);
  });

  it("includes only uploads listed in docIds, ordered by uploadedAt", () => {
    registerUpload(B);
    registerUpload(A); // registered out of order on purpose
    const ids = resolveSessionDocs(req({ docIds: [B.id, A.id] })).map(
      (d) => d.id,
    );
    expect(ids).toEqual([A.id, B.id]); // uploadedAt order, not docIds order
  });

  it("excludes uploads without a fileId (can't send a file block)", () => {
    registerUpload(
      up({ id: "upload-000000cc", fileId: undefined, workspace: "jahez" }),
    );
    expect(resolveSessionDocs(req({ docIds: ["upload-000000cc"] }))).toEqual(
      [],
    );
  });

  it("scopes a workspace upload to its own workspace", () => {
    registerUpload(
      up({ id: "upload-000000dd", fileId: "file_D", workspace: "darb" }),
    );
    // darb upload is invisible in the jahez workspace
    expect(
      resolveSessionDocs(
        req({
          context: { kind: "workspace", companyId: "jahez" },
          docIds: ["upload-000000dd"],
        }),
      ),
    ).toEqual([]);
    // …but visible in darb, and in firm/ic (cross-deal) contexts
    expect(
      resolveSessionDocs(
        req({
          context: { kind: "workspace", companyId: "darb" },
          docIds: ["upload-000000dd"],
        }),
      ).map((d) => d.id),
    ).toEqual(["upload-000000dd"]);
    expect(
      resolveSessionDocs(
        req({ context: { kind: "ic" }, docIds: ["upload-000000dd"] }),
      ).map((d) => d.id),
    ).toEqual(["upload-000000dd"]);
  });
});

describe("buildSessionBlocks", () => {
  it("file refs, citations enabled, NO cache_control", () => {
    const blocks = buildSessionBlocks(
      [uploadToCorpusDoc(A), uploadToCorpusDoc(B)],
      "en",
    );
    expect(blocks).toEqual([
      {
        type: "document",
        source: { type: "file", file_id: "file_A" },
        title: "Doc A",
        citations: { enabled: true },
      },
      {
        type: "document",
        source: { type: "file", file_id: "file_B" },
        title: "Doc B",
        citations: { enabled: true },
      },
    ]);
    expect(blocks.every((b) => b.cache_control === undefined)).toBe(true);
  });
});

describe("buildCorpusContext, uploaded docs append AFTER the static breakpoint", () => {
  it("no uploads → identical to the static path (regression)", () => {
    registerUpload(A); // present but not referenced
    const r = req({ docIds: ["fy25-er", "fy24-ar"] });
    const ctx = buildCorpusContext(r);
    expect(ctx.docs.map((d) => d.id)).toEqual(
      filterDocs(r.context, r.docIds, r.agent).map((d) => d.id),
    );
    // cache breakpoint on the LAST block, as before
    expect(ctx.blocks.at(-1)!.cache_control).toEqual({
      type: "ephemeral",
      ttl: "1h",
    });
    expect(
      ctx.blocks.slice(0, -1).every((b) => b.cache_control === undefined),
    ).toBe(true);
  });

  it("EXHAUSTIVE index mapping: static docs then 2 uploads, every document_index resolves", () => {
    registerUpload(A);
    registerUpload(B);
    const r = req({ docIds: ["fy25-er", "fy24-ar", A.id, B.id] });

    const staticIds = filterDocs(r.context, r.docIds, r.agent).map((d) => d.id);
    const ctx = buildCorpusContext(r);

    // docs === static (manifest order) followed by uploads (uploadedAt order)
    const expected = [...staticIds, A.id, B.id];
    expect(ctx.docs.map((d) => d.id)).toEqual(expected);

    // blocks are index-aligned with docs
    expect(ctx.blocks).toHaveLength(ctx.docs.length);

    // simulate the SSE transform: docs[document_index].id for every index
    expected.forEach((id, index) => {
      expect(ctx.docs[index]!.id).toBe(id);
    });

    // cache_control sits ONLY on the last STATIC block; uploaded blocks are uncached
    const lastStatic = staticIds.length - 1;
    ctx.blocks.forEach((block, i) => {
      if (i === lastStatic) {
        expect(block.cache_control).toEqual({ type: "ephemeral", ttl: "1h" });
      } else {
        expect(block.cache_control).toBeUndefined();
      }
    });

    // the two uploaded blocks are the trailing file refs
    expect(ctx.blocks.at(-2)!.source).toEqual({
      type: "file",
      file_id: "file_A",
    });
    expect(ctx.blocks.at(-1)!.source).toEqual({
      type: "file",
      file_id: "file_B",
    });
  });

  it("upload-only request (no matching manifest docIds): grounds solely in the upload", () => {
    registerUpload(A);
    const ctx = buildCorpusContext(req({ docIds: [A.id] }));
    expect(ctx.docs.map((d) => d.id)).toEqual([A.id]);
    expect(ctx.blocks).toHaveLength(1);
    expect(ctx.blocks[0]!.source).toEqual({ type: "file", file_id: "file_A" });
    // no static docs → no cache breakpoint at all (uploads are uncacheable by design)
    expect(ctx.blocks[0]!.cache_control).toBeUndefined();
  });
});
