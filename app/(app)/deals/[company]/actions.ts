"use server";

import { appendAudit } from "@/lib/audit";

/**
 * Human-gate audit hook: /api/audit is read-only (GET), so the workspace's
 * "Advance to Analyst Stage" click records its stage-advance entry through
 * this server action → lib/audit.ts append (same writer the chat route uses).
 */
export async function recordStageAdvance(companyId: string): Promise<void> {
  appendAudit({
    ts: new Date().toISOString(),
    user: "Ali",
    context: `workspace:${companyId}`,
    action: "stage-advance",
  });
}
