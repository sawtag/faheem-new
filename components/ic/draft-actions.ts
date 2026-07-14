"use server";

import { appendAudit } from "@/lib/audit";

/**
 * Human-gate audit hook for the Draft-to-IC compose modal (WS-E): "Open in
 * Outlook" is a real mailto handoff (the human sends), so the ONLY thing
 * Faheem records is that Ali drafted it — mirrors
 * app/(app)/deals/[company]/actions.ts's recordStageAdvance (same
 * appendAudit writer the chat + model-edit routes use), kept as its own file
 * so this workstream doesn't touch that shared action module.
 */
export async function recordIcDraft(
  companyId: string,
  subject: string,
): Promise<void> {
  appendAudit({
    ts: new Date().toISOString(),
    user: "Ali",
    context: `workspace:${companyId}`,
    action: "ic-draft",
    question: subject,
  });
}
