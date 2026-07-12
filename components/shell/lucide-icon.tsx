import * as React from "react";
import * as Lucide from "lucide-react";
import type { LucideProps } from "lucide-react";

/**
 * Resolves a lucide icon from a kebab-case name string (registry/nav data).
 * Icon *choice* is data (AGENTS.md asset/icon policy); this is the one place
 * that turns a name into a component, so no JSX ever hardcodes an entity icon.
 * The lucide namespace carries every glyph (the tree-shakeable `icons` map is a
 * subset that omits a few aliases like Filter), so we index it directly.
 */
const registry = Lucide as unknown as Record<
  string,
  React.FC<LucideProps> | undefined
>;

function toPascal(name: string): string {
  return name
    .split("-")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join("");
}

export function LucideIcon({
  name,
  ...props
}: { name: string } & LucideProps): React.ReactElement | null {
  const Comp = registry[toPascal(name)];
  return Comp ? <Comp aria-hidden="true" {...props} /> : null;
}
