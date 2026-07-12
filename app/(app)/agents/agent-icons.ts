/**
 * Resolves the agent registry's lucide icon-name strings (lib/ai/agents.ts
 * `AgentInfo.icon`) to components. This is the one place a dynamic string
 * turns into a lucide import — not a global constants/icons.ts re-export
 * layer (AGENTS.md rule 6 carve-out is about avoiding indirection that
 * varies nothing; this map exists because the registry stores icon choice
 * as data, and *something* has to resolve that string to a component).
 */
import {
  Calculator,
  FileSearch,
  Filter,
  GitCompare,
  Network,
  PenLine,
  Scale,
  ShieldAlert,
  ShieldCheck,
  Telescope,
  type LucideIcon,
} from "lucide-react";

export const AGENT_ICONS: Record<string, LucideIcon> = {
  filter: Filter,
  network: Network,
  telescope: Telescope,
  "file-search": FileSearch,
  calculator: Calculator,
  "git-compare": GitCompare,
  "shield-alert": ShieldAlert,
  "pen-line": PenLine,
  "shield-check": ShieldCheck,
  scale: Scale,
};
