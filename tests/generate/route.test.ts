import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { POST } from "@/app/api/generate/[artifact]/route";
import { ArtifactMetaSchema, type ArtifactMeta } from "@/lib/types";
import type { GenerateEvent } from "@/components/generate/protocol";

function parseSSE(text: string): GenerateEvent[] {
  return text
    .split("\n\n")
    .filter((chunk) => chunk.trim().length > 0)
    .map((chunk) => JSON.parse(chunk.replace(/^data: /, "")) as GenerateEvent);
}

function post(artifact: string, workspace?: string): Promise<Response> {
  const url = new URL(`http://localhost/api/generate/${artifact}`);
  if (workspace) url.searchParams.set("workspace", workspace);
  return POST(new Request(url, { method: "POST" }), {
    params: Promise.resolve({ artifact }),
  });
}

let dir: string;
let artifactsDir: string;
let artifactsJson: string;
let auditFile: string;

function setEnv(): void {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "faheem-generate-"));
  artifactsDir = path.join(dir, "public-artifacts");
  artifactsJson = path.join(dir, "artifacts.json");
  auditFile = path.join(dir, "audit.json");
  process.env.FAHEEM_ARTIFACTS_DIR = artifactsDir;
  process.env.FAHEEM_ARTIFACTS_JSON = artifactsJson;
  process.env.FAHEEM_AUDIT_PATH = auditFile;
  process.env.FAHEEM_GENERATE_STEP_MS = "0"; // skip the demo pacing in tests
}

afterEach(() => {
  delete process.env.FAHEEM_ARTIFACTS_DIR;
  delete process.env.FAHEEM_ARTIFACTS_JSON;
  delete process.env.FAHEEM_AUDIT_PATH;
  delete process.env.FAHEEM_GENERATE_STEP_MS;
  if (dir) fs.rmSync(dir, { recursive: true, force: true });
});

describe("POST /api/generate/[artifact]", () => {
  it("xlsx: streams the choreography, writes the file, registers metadata, audits", async () => {
    setEnv();
    const res = await post("xlsx");
    expect(res.headers.get("content-type")).toContain("text/event-stream");

    const events = parseSSE(await res.text());
    const types = events.map((e) => e.type);
    expect(types).toEqual([
      "stage",
      "stage",
      "stage",
      "stage",
      "stage",
      "stage",
      "artifact",
      "done",
    ]);

    const artifactEvent = events.find((e) => e.type === "artifact");
    expect(artifactEvent).toBeDefined();
    if (artifactEvent?.type !== "artifact") throw new Error("unreachable");
    expect(artifactEvent.artifact).toBe("xlsx");
    expect(artifactEvent.sizeBytes).toBeGreaterThan(10_000);
    expect(artifactEvent.meta.file).toBe(
      "/artifacts/jahez-valuation-model.xlsx",
    );
    expect(artifactEvent.meta.sources).toBeGreaterThan(0);

    // file actually landed on disk, real bytes
    const written = fs.readFileSync(
      path.join(artifactsDir, "jahez-valuation-model.xlsx"),
    );
    expect(written.length).toBe(artifactEvent.sizeBytes);

    // data/artifacts.json (test path) has exactly one entry
    const entries = ArtifactMetaSchema.array().parse(
      JSON.parse(fs.readFileSync(artifactsJson, "utf-8")),
    );
    expect(entries).toHaveLength(1);
    expect(entries[0]!.id).toBe("jahez-xlsx");

    // one audit entry appended
    const audit = JSON.parse(fs.readFileSync(auditFile, "utf-8")) as unknown[];
    expect(audit).toHaveLength(1);
    expect(audit[0]).toMatchObject({
      user: "Ali",
      context: "workspace:jahez",
      action: "artifact",
      artifact: "jahez-valuation-model.xlsx",
    });
  }, 30000);

  it("all: generates all three artifacts in order, one artifact event each", async () => {
    setEnv();
    const res = await post("all");
    const events = parseSSE(await res.text());
    const artifactEvents = events.filter((e) => e.type === "artifact");
    expect(
      artifactEvents.map((e) => (e.type === "artifact" ? e.artifact : null)),
    ).toEqual(["xlsx", "docx", "pptx"]);
    expect(events.at(-1)).toEqual({ type: "done" });

    const entries = ArtifactMetaSchema.array().parse(
      JSON.parse(fs.readFileSync(artifactsJson, "utf-8")),
    );
    expect(entries).toHaveLength(3);
    expect(entries.map((e) => e.kind).sort()).toEqual(["docx", "pptx", "xlsx"]);

    for (const name of [
      "jahez-valuation-model.xlsx",
      "jahez-ic-memo.docx",
      "jahez-board-deck.pptx",
    ]) {
      const size = fs.statSync(path.join(artifactsDir, name)).size;
      expect(size).toBeGreaterThan(1000);
    }

    const audit = JSON.parse(fs.readFileSync(auditFile, "utf-8")) as unknown[];
    expect(audit).toHaveLength(3);
  }, 60000);

  it("is idempotent: regenerating replaces the entry, never duplicates", async () => {
    setEnv();
    await (await post("xlsx")).text(); // drain the stream so the write completes
    await (await post("xlsx")).text();

    const entries: ArtifactMeta[] = ArtifactMetaSchema.array().parse(
      JSON.parse(fs.readFileSync(artifactsJson, "utf-8")),
    );
    expect(entries.filter((e) => e.id === "jahez-xlsx")).toHaveLength(1);
  }, 30000);

  it("rejects an unknown artifact kind with 400", async () => {
    setEnv();
    const res = await post("csv");
    expect(res.status).toBe(400);
  });

  it("?workspace=darb docx: streams, writes the file, registers metadata under the darb workspace", async () => {
    setEnv();
    const res = await post("docx", "darb");
    expect(res.headers.get("content-type")).toContain("text/event-stream");

    const events = parseSSE(await res.text());
    const artifactEvent = events.find((e) => e.type === "artifact");
    expect(artifactEvent).toBeDefined();
    if (artifactEvent?.type !== "artifact") throw new Error("unreachable");
    expect(artifactEvent.artifact).toBe("docx");
    expect(artifactEvent.meta.id).toBe("darb-docx");
    expect(artifactEvent.meta.workspace).toBe("darb");
    expect(artifactEvent.meta.file).toBe("/artifacts/darb-screening-memo.docx");
    expect(artifactEvent.meta.sources).toBeGreaterThan(0);

    const written = fs.readFileSync(
      path.join(artifactsDir, "darb-screening-memo.docx"),
    );
    expect(written.length).toBe(artifactEvent.sizeBytes);

    const entries = ArtifactMetaSchema.array().parse(
      JSON.parse(fs.readFileSync(artifactsJson, "utf-8")),
    );
    expect(entries).toHaveLength(1);
    expect(entries[0]!.id).toBe("darb-docx");
  }, 30000);

  it("rejects a kind not registered for the darb workspace with 400 (xlsx)", async () => {
    setEnv();
    const res = await post("xlsx", "darb");
    expect(res.status).toBe(400);
  });

  it("rejects an unknown workspace with 400", async () => {
    setEnv();
    const res = await post("docx", "unknown-workspace");
    expect(res.status).toBe(400);
  });
});
