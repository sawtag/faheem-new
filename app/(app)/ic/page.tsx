import dealsData from "@/data/deals.json";
import { DealSchema } from "@/lib/types";
import { icColumns } from "@/components/ic/metrics";
import { IcRoom } from "@/components/ic/ic-room";

/**
 * Faheem IC room (T3.4) — the closing beat. Columns are the analysis-complete
 * pipeline (Jahez + Thara Pay) selected from `deals.json`; a deal without
 * `icMetrics` renders a pending column, never fake numbers. All interactivity
 * (count-up, chat stream, PdfPanel) lives in the client `IcRoom`.
 */
export default function IcPage() {
  const deals = DealSchema.array().parse(dealsData);
  return (
    <IcRoom columns={icColumns(deals)} dateISO={new Date().toISOString()} />
  );
}
