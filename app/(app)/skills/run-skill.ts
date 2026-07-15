import { serializeContext } from "@/lib/chats";
import { goldenQuestionById } from "@/lib/demo/golden-questions";
import type { Skill } from "@/lib/skills";
import type { AgentId, ChatContext, Lang } from "@/lib/types";

/**
 * What a Run click resolves to: the exact payload for
 * `publishGoldenSelection` (lib/demo/golden-bus.ts, the same insert the ⌘K
 * palette uses) plus the href to navigate to. Kept pure/router-free so it
 * unit-tests without mounting a component (tests/skills/run-skill.test.ts).
 *
 * - `goldenId` skills reproduce the recorded ChatRequest byte-for-byte and
 *   land on that request's exact context (workspace Jahez today; `ic` is
 *   handled too since a future golden entry could target the IC room).
 * - `prefill` skills are an ad hoc composer prefill in firm context, there
 *   is no cross-page bus wired into the Home hero's local prefill state
 *   (components/home/* is outside this task's file ownership), so these
 *   land on `/chat/new` (firm context), which reads the exact same
 *   `publishGoldenSelection`/`takeGoldenSelection` pair ChatView already
 *   wires up, the composer arrives pre-filled, unsent, ready for the
 *   presenter to hit send.
 * - `null` skills have no Run action.
 */
export interface SkillRunTarget {
  context: ChatContext;
  text: string;
  agent?: AgentId;
  docIds?: string[];
  href: string;
  /** the language the request will actually run in. */
  lang: Lang;
  /**
   * True only for a `goldenId` skill: its recorded lang is fixed regardless
   * of the active UI locale (e.g. shariah-screen always fires its Arabic
   * golden question). A `prefill` skill's `lang` always equals the active
   * locale by construction, so it is never "fixed", showing a "Runs in
   * Arabic" hint for one the moment the UI itself switches to Arabic would
   * be a redundant, misleading false positive. Card UI should gate the hint
   * on `fixedLang && lang === "ar"`, not on `lang === "ar"` alone.
   */
  fixedLang: boolean;
}

export function resolveSkillRun(
  skill: Skill,
  locale: Lang,
): SkillRunTarget | null {
  if (!skill.run) return null;

  if ("goldenId" in skill.run) {
    const entry = goldenQuestionById(skill.run.goldenId);
    // Unreachable in practice: lib/skills.ts asserts every goldenId resolves
    // at import time, so a bad mapping crashes the app before this runs.
    if (!entry) return null;
    return {
      context: entry.request.context,
      text: entry.request.question,
      agent: entry.request.agent,
      docIds: entry.request.docIds,
      href:
        entry.request.context.kind === "ic"
          ? "/ic"
          : `/chat/new?context=${encodeURIComponent(serializeContext(entry.request.context))}`,
      lang: entry.request.lang,
      fixedLang: true,
    };
  }

  return {
    context: { kind: "firm" },
    text: skill.run.prefill[locale],
    href: "/chat/new?context=firm",
    lang: locale,
    fixedLang: false,
  };
}
