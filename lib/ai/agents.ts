/**
 * Agent registry — the single source of truth for the @-typeahead, the Agent
 * Activity timeline, and the Agents page (spec §4 item 8, deck slide 9).
 *
 * `icon` is a lucide-react icon name: icon choice is registry data, never
 * chosen inline in JSX (AGENTS.md asset/icon policy). `systemFlavor` selects
 * the system-prompt flavor in lib/ai/prompts.ts. `defaultDocIds` seeds the
 * "documents this agent is reading" caption in the choreographed stage events.
 */
import type { AgentId, AgentInfo } from "@/lib/types";

export const AGENTS: AgentInfo[] = [
  {
    id: "orchestrator",
    name: { en: "Orchestrator / Planner", ar: "المنسّق والمخطط" },
    stage: 2,
    methodsKey: "agents.methods.orchestrator",
    systemFlavor: "workspace",
    defaultDocIds: ["lunar-ic-charter"],
    icon: "network",
  },
  {
    id: "screening",
    name: { en: "Screening Agent", ar: "وكيل الفرز" },
    stage: 1,
    methodsKey: "agents.methods.screening",
    systemFlavor: "screening",
    defaultDocIds: ["lunar-ic-charter", "darb-dataroom"],
    icon: "filter",
  },
  {
    id: "research",
    name: { en: "Research & Sourcing", ar: "البحث والمصادر" },
    stage: 2,
    methodsKey: "agents.methods.research",
    systemFlavor: "workspace",
    defaultDocIds: [
      "industry-news-pack",
      "market-data-comps",
      "fy25-earnings-call",
    ],
    icon: "telescope",
  },
  {
    id: "doc-intel",
    name: { en: "Document Intelligence", ar: "ذكاء المستندات" },
    stage: 2,
    methodsKey: "agents.methods.doc-intel",
    systemFlavor: "workspace",
    defaultDocIds: ["fy25-er", "q1-26-fs", "fy24-ar"],
    icon: "file-search",
  },
  {
    id: "valuation",
    name: { en: "Valuation & Modeling", ar: "النمذجة والتقييم" },
    stage: 2,
    methodsKey: "agents.methods.valuation",
    systemFlavor: "workspace",
    defaultDocIds: ["fy25-er", "fy25-earnings-call", "market-data-comps"],
    icon: "calculator",
  },
  {
    id: "comparables",
    name: { en: "Comparables & Precedents", ar: "المقارنات" },
    stage: 2,
    methodsKey: "agents.methods.comparables",
    systemFlavor: "workspace",
    defaultDocIds: ["market-data-comps", "fy25-er"],
    icon: "git-compare",
  },
  {
    id: "risk",
    name: { en: "Risk & Portfolio Monitoring", ar: "المخاطر ومراقبة المحفظة" },
    stage: 2,
    methodsKey: "agents.methods.risk",
    systemFlavor: "workspace",
    defaultDocIds: [
      "industry-news-pack",
      "market-data-comps",
      "lunar-ic-charter",
    ],
    icon: "shield-alert",
  },
  {
    id: "writing",
    name: { en: "Deliverable Writing", ar: "كتابة التقارير" },
    stage: 2,
    methodsKey: "agents.methods.writing",
    systemFlavor: "workspace",
    defaultDocIds: ["fy25-er", "thara-analysis"],
    icon: "pen-line",
  },
  {
    id: "compliance",
    name: { en: "Verification & Compliance", ar: "التحقق والامتثال" },
    stage: 2,
    methodsKey: "agents.methods.compliance",
    systemFlavor: "workspace",
    defaultDocIds: ["q1-26-fs", "fy25-er"],
    icon: "shield-check",
  },
  {
    id: "ic",
    name: { en: "Faheem IC", ar: "فهيم — مستشار لجنة الاستثمار" },
    stage: 3,
    methodsKey: "agents.methods.ic",
    systemFlavor: "ic",
    defaultDocIds: ["thara-analysis", "lunar-ic-charter"],
    icon: "scale",
  },
];

const byId: Record<AgentId, AgentInfo> = Object.fromEntries(
  AGENTS.map((a) => [a.id, a]),
) as Record<AgentId, AgentInfo>;

export function getAgent(id: AgentId): AgentInfo {
  return byId[id];
}
