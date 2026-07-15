import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { POST } from "@/app/api/model-edit/route";
import { setClientForTests, type FaheemClient } from "@/lib/ai/client";
import type { AuditEntry } from "@/lib/types";

/**
 * WS-C acceptance, /api/model-edit. The Anthropic client is ALWAYS mocked
 * (house pattern, AGENTS.md rule 10): zero live calls in the suite. The audit
 * log is redirected to a temp file via FAHEEM_AUDIT_PATH so unit runs never
 * dirty data/audit-log.json.
 */

let auditFile: string;

beforeEach(() => {
  auditFile = path.join(
    fs.mkdtempSync(path.join(os.tmpdir(), "faheem-model-edit-")),
    "audit.json",
  );
  process.env.FAHEEM_AUDIT_PATH = auditFile;
});

afterEach(() => {
  setClientForTests(null);
  delete process.env.FAHEEM_AUDIT_PATH;
  if (auditFile && fs.existsSync(auditFile)) fs.rmSync(auditFile);
});

function readAudit(): AuditEntry[] {
  if (!fs.existsSync(auditFile)) return [];
  return JSON.parse(fs.readFileSync(auditFile, "utf-8")) as AuditEntry[];
}

/** A client whose every method throws, proves a path never touches the SDK. */
function poisonClient(): FaheemClient {
  return {
    beta: {
      messages: {
        stream: () => {
          throw new Error("SDK touched, live call attempted");
        },
      },
    },
    messages: {
      create: async () => {
        throw new Error("SDK touched, live call attempted");
      },
    },
  };
}

function mockCreate(payload: unknown): FaheemClient {
  return {
    beta: {
      messages: {
        stream: () => {
          throw new Error("stream not used by model-edit");
        },
      },
    },
    messages: {
      create: async () => ({
        content: [{ type: "text", text: JSON.stringify(payload) }],
      }),
    },
  };
}

function post(body: unknown, cookie?: string): Promise<Response> {
  return POST(
    new Request("http://localhost/api/model-edit", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(cookie ? { cookie } : {}),
      },
      body: JSON.stringify(body),
    }),
  );
}

describe("POST /api/model-edit, scripted path", () => {
  it("parses a scripted edit offline and appends an old→new audit entry", async () => {
    setClientForTests(poisonClient()); // any SDK touch fails the test

    const res = await post(
      {
        instruction: "raise FY26 order growth to 20%",
        lang: "en",
        companyId: "jahez",
      },
      "faheem_mode=cached",
    );
    const json = (await res.json()) as {
      kind: string;
      assumptionKey: string;
      value: number;
      summary: string;
    };
    expect(json.kind).toBe("edit");
    expect(json.assumptionKey).toBe("ordersGrowth.0");
    expect(json.value).toBeCloseTo(0.2, 10);
    expect(json.summary).toBeTruthy();

    const audit = readAudit();
    expect(audit).toHaveLength(1);
    expect(audit[0]!.action).toBe("model-edit");
    expect(audit[0]!.user).toBe("Ali");
    expect(audit[0]!.context).toBe("workspace:jahez");
    expect(audit[0]!.question).toBe("ordersGrowth.0: 18.0% → 20.0%");
  });

  it("source-locked instruction → graceful outcome + audited attempt, no SDK touch", async () => {
    setClientForTests(poisonClient());

    const res = await post(
      {
        instruction: "change FY25 revenue to SAR 2 billion",
        lang: "en",
      },
      "faheem_mode=cached",
    );
    const json = (await res.json()) as { kind: string; summary: string };
    expect(json.kind).toBe("source-locked");
    expect(json.summary).toMatch(/source-locked/i);

    const audit = readAudit();
    expect(audit).toHaveLength(1);
    expect(audit[0]!.question).toContain("source-locked (blocked): revenue");
  });

  it("cached mode NEVER touches the client for an unparsed instruction", async () => {
    setClientForTests(poisonClient());

    const res = await post(
      { instruction: "do something nice", lang: "en" },
      "faheem_mode=cached",
    );
    const json = (await res.json()) as { kind: string; summary: string };
    expect(json.kind).toBe("unparsed");
    expect(json.summary).toBeTruthy();
    expect(readAudit()).toHaveLength(0); // nothing actionable, nothing logged
  });

  it("falls back safely when a mode cookie has malformed percent-encoding", async () => {
    setClientForTests(poisonClient());

    const res = await post(
      { instruction: "do something nice", lang: "en" },
      "faheem_mode=%E0%A4%A",
    );
    const json = (await res.json()) as { kind: string };
    expect(res.status).toBe(200);
    expect(json.kind).toBe("unparsed");
  });

  it("probability edit returns the rebalance companions (Σ = 1)", async () => {
    setClientForTests(poisonClient());

    const res = await post(
      {
        instruction: "set the bull probability to 40%",
        lang: "en",
        assumptions: { probBull: 0.25, probBase: 0.5, probBear: 0.25 },
      },
      "faheem_mode=cached",
    );
    const json = (await res.json()) as {
      kind: string;
      value: number;
      also: { assumptionKey: string; value: number }[];
      summary: string;
    };
    expect(json.kind).toBe("edit");
    const sum = json.value + json.also.reduce((s, p) => s + p.value, 0);
    expect(sum).toBeCloseTo(1, 12);
    expect(json.summary).toMatch(/rebalanced/i);
    expect(readAudit()[0]!.question).toContain("rebalanced");
  });

  it("Arabic scripted edit parses offline", async () => {
    setClientForTests(poisonClient());

    const res = await post(
      {
        instruction: "ارفع نمو الطلبات لعام ٢٠٢٦ إلى ٢٠٪",
        lang: "ar",
      },
      "faheem_mode=cached",
    );
    const json = (await res.json()) as {
      kind: string;
      assumptionKey: string;
      value: number;
    };
    expect(json.kind).toBe("edit");
    expect(json.assumptionKey).toBe("ordersGrowth.0");
    expect(json.value).toBeCloseTo(0.2, 10);
  });
});

describe("POST /api/model-edit, live fallback (mocked client)", () => {
  it("uses the mocked live parse only for unparsed instructions in live mode", async () => {
    setClientForTests(
      mockCreate({ kind: "edit", assumptionKey: "g", value: 0.04 }),
    );

    const res = await post(
      { instruction: "let's be more optimistic long-run", lang: "en" },
      "faheem_mode=live",
    );
    const json = (await res.json()) as {
      kind: string;
      assumptionKey: string;
      value: number;
    };
    expect(json.kind).toBe("edit");
    expect(json.assumptionKey).toBe("g");
    expect(json.value).toBeCloseTo(0.04, 10);
  });

  it("REJECTS an illegal key returned by the model, whitelist re-validation", async () => {
    setClientForTests(
      mockCreate({ kind: "edit", assumptionKey: "fy25.gmv", value: 2000 }),
    );

    const res = await post(
      { instruction: "some fuzzy what-if", lang: "en" },
      "faheem_mode=live",
    );
    const json = (await res.json()) as { kind: string };
    expect(json.kind).toBe("unparsed");
    expect(readAudit()).toHaveLength(0);
  });

  it("clamps an out-of-bounds live value to the documented bound", async () => {
    setClientForTests(
      mockCreate({ kind: "edit", assumptionKey: "g", value: 0.2 }),
    );

    const res = await post(
      { instruction: "very aggressive long-run growth please", lang: "en" },
      "faheem_mode=live",
    );
    const json = (await res.json()) as { kind: string; value: number };
    expect(json.kind).toBe("edit");
    expect(json.value).toBe(0.08); // g hard-capped at 8%
  });

  it("degrades to unparsed when the live call throws", async () => {
    setClientForTests(poisonClient());

    const res = await post(
      { instruction: "some fuzzy what-if", lang: "en" },
      "faheem_mode=live",
    );
    const json = (await res.json()) as { kind: string };
    expect(json.kind).toBe("unparsed");
  });

  it("a scripted instruction never reaches the client even in live mode", async () => {
    setClientForTests(poisonClient());

    const res = await post(
      { instruction: "what if terminal growth is 3.5%?", lang: "en" },
      "faheem_mode=live",
    );
    const json = (await res.json()) as { kind: string; assumptionKey: string };
    expect(json.kind).toBe("edit");
    expect(json.assumptionKey).toBe("g");
  });
});

describe("POST /api/model-edit, validation", () => {
  it("400s on an invalid body", async () => {
    const res = await post({ lang: "en" });
    expect(res.status).toBe(400);
  });

  it("400s on non-JSON", async () => {
    const res = await POST(
      new Request("http://localhost/api/model-edit", {
        method: "POST",
        body: "not json",
      }),
    );
    expect(res.status).toBe(400);
  });
});
