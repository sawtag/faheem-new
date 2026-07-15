import { UserCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";

/**
 * Stage section header (design-briefs §3.2): `Stage N` navy pill + H3 stage
 * name + an optional trailing caption. Used 3x on the Agents page only.
 */
export function StageHeader({
  n,
  name,
  caption,
}: {
  n: 1 | 2 | 3;
  name: string;
  caption?: string;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3">
      <Badge variant="navy" size="sm">
        Stage {n}
      </Badge>
      <h3 className="text-h3 text-navy font-extrabold">{name}</h3>
      {caption && (
        <span className="text-text-secondary text-[0.8125rem]">{caption}</span>
      )}
    </div>
  );
}

/**
 * Human-gate marker (design-briefs §3.2): dashed hairline on each side of a
 * centered pill. Purely presentational, appears 3x between stage sections.
 */
export function GateMarker({ label }: { label: string }) {
  return (
    <div
      role="separator"
      aria-label={label}
      className="my-8 flex items-center gap-3"
    >
      <span className="border-navy-300 h-0 flex-1 border-t border-dashed" />
      <span className="bg-navy-50 rounded-pill inline-flex items-center gap-1.5 px-3.5 py-1.5">
        <UserCheck className="text-navy-700 size-4" aria-hidden="true" />
        <span className="text-navy-700 text-xs font-semibold">{label}</span>
      </span>
      <span className="border-navy-300 h-0 flex-1 border-t border-dashed" />
    </div>
  );
}
