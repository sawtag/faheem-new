import fs from "node:fs";
import path from "node:path";
import dealsData from "@/data/deals.json";
import { ArtifactMetaSchema, DealSchema, type ArtifactMeta } from "@/lib/types";
import { icColumns } from "@/components/ic/metrics";
import { IcRoom } from "@/components/ic/ic-room";

/** data/artifacts.json, filtered to Jahez — feeds the IC room's secondary
 * Draft-to-IC trigger (WS-E). Mirrors app/(app)/library/page.tsx's fs read;
 * absent-file is a valid, expected state (no deliverables run yet). */
function loadJahezArtifacts(): ArtifactMeta[] {
  const file = path.join(process.cwd(), "data/artifacts.json");
  if (!fs.existsSync(file)) return [];
  const parsed = ArtifactMetaSchema.array().safeParse(
    JSON.parse(fs.readFileSync(file, "utf-8")),
  );
  if (!parsed.success) return [];
  return parsed.data.filter((a) => a.workspace === "jahez");
}

/**
 * Faheem IC room (T3.4) — the closing beat. Columns are the analysis-complete
 * pipeline (Jahez + Thara Pay) selected from `deals.json`; a deal without
 * `icMetrics` renders a pending column, never fake numbers. All interactivity
 * (count-up, chat stream, PdfPanel) lives in the client `IcRoom`.
 */
export default function IcPage() {
  const deals = DealSchema.array().parse(dealsData);
  return (
    <IcRoom
      columns={icColumns(deals)}
      dateISO={new Date().toISOString()}
      jahezArtifacts={loadJahezArtifacts()}
    />
  );
}
