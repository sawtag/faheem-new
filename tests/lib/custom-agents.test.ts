import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  addCustomAgent,
  listCustomAgents,
  removeCustomAgent,
} from "@/lib/custom-agents";
import { CustomAgentSchema } from "@/lib/types";

let storeFile: string;

function useTempStore(): void {
  storeFile = path.join(
    fs.mkdtempSync(path.join(os.tmpdir(), "faheem-custom-agents-")),
    "custom-agents.json",
  );
  process.env.FAHEEM_CUSTOM_AGENTS_PATH = storeFile;
}

afterEach(() => {
  delete process.env.FAHEEM_CUSTOM_AGENTS_PATH;
  if (storeFile && fs.existsSync(storeFile)) fs.rmSync(storeFile);
});

describe("lib/custom-agents", () => {
  it("list on a missing file returns []", () => {
    useTempStore();
    expect(listCustomAgents()).toEqual([]);
  });

  it("add + list roundtrip validates against CustomAgentSchema", () => {
    useTempStore();
    const agent = addCustomAgent({
      name: "Sector Screener",
      role: "Retail specialist",
      description: "Screens retail deals for mandate fit and red flags.",
    });

    expect(CustomAgentSchema.safeParse(agent).success).toBe(true);
    expect(agent.id).toBe("custom-sector-screener");

    const listed = listCustomAgents();
    expect(listed).toHaveLength(1);
    expect(listed[0]).toEqual(agent);
    expect(CustomAgentSchema.array().safeParse(listed).success).toBe(true);
  });

  it("slugifies an ASCII name into the id", () => {
    useTempStore();
    const agent = addCustomAgent({
      name: "Deal Flow Bot 2000!",
      role: "Screener",
      description: "Tracks inbound deal flow across the mandate universe.",
    });
    expect(agent.id).toBe("custom-deal-flow-bot-2000");
  });

  it("an Arabic (non-ASCII) name falls back to custom-agent", () => {
    useTempStore();
    const agent = addCustomAgent({
      name: "فارز القطاعات",
      role: "محلل",
      description: "يفرز الصفقات القطاعية مقابل معايير التفويض المحددة.",
    });
    expect(agent.id).toBe("custom-agent");
  });

  it("a name collision suffixes -2, then -3", () => {
    useTempStore();
    const a1 = addCustomAgent({
      name: "Screener",
      role: "Role",
      description: "First agent with this exact slugified name collision.",
    });
    const a2 = addCustomAgent({
      name: "Screener",
      role: "Role",
      description: "Second agent with this exact slugified name collision.",
    });
    const a3 = addCustomAgent({
      name: "Screener",
      role: "Role",
      description: "Third agent with this exact slugified name collision.",
    });
    expect(a1.id).toBe("custom-screener");
    expect(a2.id).toBe("custom-screener-2");
    expect(a3.id).toBe("custom-screener-3");
  });

  it("remove returns true for an existing id and false otherwise", () => {
    useTempStore();
    const agent = addCustomAgent({
      name: "Temp Agent",
      role: "Role",
      description: "An agent created only to be removed by this test.",
    });
    expect(removeCustomAgent("custom-does-not-exist")).toBe(false);
    expect(removeCustomAgent(agent.id)).toBe(true);
    expect(listCustomAgents()).toEqual([]);
    expect(removeCustomAgent(agent.id)).toBe(false);
  });

  it("a corrupt/invalid file behaves as an empty list", () => {
    useTempStore();
    fs.mkdirSync(path.dirname(storeFile), { recursive: true });
    fs.writeFileSync(storeFile, "{ not json");
    expect(listCustomAgents()).toEqual([]);

    fs.writeFileSync(storeFile, JSON.stringify([{ nope: true }]));
    expect(listCustomAgents()).toEqual([]);
  });
});
