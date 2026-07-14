import { describe, expect, it } from "vitest";
import { AGENTS, getAgent } from "@/lib/ai/agents";
import { AGENT_ICONS } from "@/app/(app)/agents/agent-icons";
import en from "@/messages/en.json";
import ar from "@/messages/ar.json";
import { AGENT_IDS } from "@/lib/types";

/**
 * WS-D acceptance: registry has 14 agents (the original 10 + accounting-qoe,
 * critical-review, news-intel, sentiment), unique ids, complete bilingual
 * fields, every icon resolvable, every methodsKey present in both locales.
 */
describe("agent registry", () => {
  it("has exactly 14 agents", () => {
    expect(AGENTS).toHaveLength(14);
  });

  it("every AgentId in the union appears exactly once in the registry", () => {
    const ids = AGENTS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(ids)).toEqual(new Set(AGENT_IDS));
  });

  it("the 4 WS-D additions are present with the expected stage", () => {
    for (const id of [
      "accounting-qoe",
      "critical-review",
      "news-intel",
      "sentiment",
    ] as const) {
      const agent = getAgent(id);
      expect(agent, `missing agent "${id}"`).toBeDefined();
      expect(agent.stage).toBe(2);
    }
  });

  it("every agent has non-empty bilingual name and a resolvable icon", () => {
    for (const agent of AGENTS) {
      expect(agent.name.en.length, agent.id).toBeGreaterThan(0);
      expect(agent.name.ar.length, agent.id).toBeGreaterThan(0);
      expect(
        AGENT_ICONS[agent.icon],
        `${agent.id} icon "${agent.icon}"`,
      ).toBeDefined();
    }
  });

  it("every agent's methodsKey resolves to non-empty copy in both locales", () => {
    const methodsEn = en.agents.methods as Record<string, string>;
    const methodsAr = ar.agents.methods as Record<string, string>;
    for (const agent of AGENTS) {
      const key = agent.methodsKey.replace(/^agents\.methods\./, "");
      expect(methodsEn[key], `en methods missing for ${agent.id}`).toBeTruthy();
      expect(methodsAr[key], `ar methods missing for ${agent.id}`).toBeTruthy();
    }
  });

  it("Critical Review is distinct from Compliance (different methodsKey copy)", () => {
    const methodsEn = en.agents.methods as Record<string, string>;
    expect(methodsEn["critical-review"]).not.toBe(methodsEn.compliance);
  });

  it("Market Sentiment reads no corpus docs by default (it reads the social pack, not filings)", () => {
    expect(getAgent("sentiment").defaultDocIds).toEqual([]);
  });
});
