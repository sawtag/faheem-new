/**
 * Live Model beat registry (WS-F), the ⌘K palette's counterpart to
 * lib/demo/golden-questions.ts for the Live Model's conversational edits.
 * These are NOT `ChatRequest`s (no cached SSE replay): the palette navigates
 * to the model page and prefills `EditComposer` via lib/demo/model-edit-bus,
 * exactly like the four command-bar chips already do
 * (components/model/edit-composer.tsx), the instruction text itself lives
 * once, in messages/*.json under `model.edit.chips`, and both the chip button
 * and this palette entry read it, so the parser's scripted set and what the
 * palette inserts can never drift apart.
 */
export interface ModelEditBeat {
  id: string;
  /** key into next-intl `model.edit.chips.*`, the verbatim scripted instruction */
  chipKey: "growth" | "terminal" | "margin" | "locked";
}

/** Only Jahez carries model data (components/model/live-model.tsx). */
export const MODEL_EDIT_COMPANY_ID = "jahez";
export const MODEL_EDIT_PATH = "/deals/jahez/model";

export const MODEL_EDIT_BEATS: ModelEditBeat[] = [
  { id: "model-growth", chipKey: "growth" },
  { id: "model-terminal", chipKey: "terminal" },
  { id: "model-margin", chipKey: "margin" },
  { id: "model-locked", chipKey: "locked" },
];
