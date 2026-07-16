"use server";

import { appendAudit } from "@/lib/audit";

/**
 * Human-gate audit hook for the IC decision phase: the committee (not Faheem)
 * records Advance / Defer / Decline, and the ONLY thing logged is that the
 * committee decided. Same appendAudit writer as recordIcDraft / the chat
 * routes; own file so the decision workstream stays self-contained. `summary`
 * is the localized "decision · deal" line the audit trail displays.
 */
export async function recordIcDecision(summary: string): Promise<void> {
  appendAudit({
    ts: new Date().toISOString(),
    user: "Ali",
    context: "ic",
    action: "ic-decision",
    question: summary,
  });
}
