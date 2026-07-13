import { describe, expect, it } from "vitest";
import { RUNS, runById, runElapsedMinutes, runsByKind } from "@/lib/runs";
import { getAgent } from "@/lib/ai/agents";
import manifest from "@/data/corpus/manifest.json";
import artifactsData from "@/data/artifacts.json";
import { ArtifactMetaSchema, type CorpusDoc } from "@/lib/types";

const DOC_IDS = new Set((manifest as CorpusDoc[]).map((d) => d.id));
const ARTIFACT_IDS = new Set(
  ArtifactMetaSchema.array()
    .parse(artifactsData)
    .map((a) => a.id),
);

describe("runs.json integrity", () => {
  it("parses two seeded runs (a deep-dive + a screening)", () => {
    expect(RUNS.length).toBe(2);
    expect(runsByKind("deep-dive").length).toBe(1);
    expect(runsByKind("screening").length).toBe(1);
  });

  it("every lane references a real registry agent and real corpus docs", () => {
    for (const run of RUNS) {
      for (const lane of run.lanes) {
        expect(getAgent(lane.agent)).toBeDefined();
        expect(lane.docIds.length).toBeGreaterThan(0);
        for (const id of lane.docIds) {
          expect(DOC_IDS.has(id), `lane ${lane.agent} unknown doc ${id}`).toBe(
            true,
          );
        }
      }
    }
  });

  it("every output id resolves to a real artifact", () => {
    for (const run of RUNS) {
      for (const id of run.outputs) {
        expect(ARTIFACT_IDS.has(id), `unknown artifact ${id}`).toBe(true);
      }
    }
  });
});

describe("the Jahez deep-dive run", () => {
  const run = runById("run-jahez-deep-dive-001")!;

  it("has the 7 Stage-2 specialist lanes (no orchestrator)", () => {
    expect(run.lanes.length).toBe(7);
    expect(run.lanes.every((l) => l.agent !== "orchestrator")).toBe(true);
    expect(run.lanes.every((l) => getAgent(l.agent).stage === 2)).toBe(true);
  });

  it("records the recorded run's citation total and three deliverables", () => {
    expect(run.citationsTotal).toBe(17);
    expect(run.outputs).toEqual(["jahez-xlsx", "jahez-docx", "jahez-pptx"]);
  });

  it("has a positive elapsed time from its timestamps", () => {
    expect(runElapsedMinutes(run)).toBeGreaterThan(0);
  });
});

describe("the Darb screening run", () => {
  const run = runById("run-darb-screening-001")!;

  it("is a completed screening with no deliverables", () => {
    expect(run.kind).toBe("screening");
    expect(run.status).toBe("complete");
    expect(run.outputs).toEqual([]);
  });
});
