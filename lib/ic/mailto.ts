/**
 * lib/ic/mailto — pure `mailto:` URL builder for the Draft-to-IC compose
 * modal (WS-E, live-model-provenance plan §3). No network, no window — a
 * plain function so the encoding/CRLF/length rules unit-test in isolation
 * (React-free, mirrors lib/model/edit-parser.ts's shape).
 *
 * mailto URLs have a practical cross-client cap (~2000 chars — Outlook's
 * ShellExecute path on Windows is the tightest at ~2083); MAILTO_MAX_LENGTH
 * stays comfortably under that. When the fully-encoded href would exceed it,
 * the BODY (never the recipients or subject) is trimmed to fit, with a
 * trailing ellipsis so the truncation is visible rather than silent.
 */

export interface MailtoDraft {
  to: string[];
  subject: string;
  body: string;
}

export interface MailtoResult {
  href: string;
  /** true when the body was shortened to fit MAILTO_MAX_LENGTH. */
  truncated: boolean;
}

/** Conservative cross-client cap — see module doc. */
export const MAILTO_MAX_LENGTH = 1900;

const TRUNCATION_SUFFIX = "\r\n…";

/** RFC 6068 mailto bodies read best as CRLF — normalize any line-ending mix
 * (textarea input is usually \n) before encoding. */
export function normalizeCrlf(text: string): string {
  return text.replace(/\r\n|\r|\n/g, "\r\n");
}

function buildHref(to: string[], subject: string, body: string): string {
  const recipients = to.map(encodeURIComponent).join(",");
  const query = `subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  return `mailto:${recipients}?${query}`;
}

/** Shortens `body` (already CRLF-normalized) so its ENCODED length fits
 * `budget` characters, appending TRUNCATION_SUFFIX. Binary search over the
 * cut point since encodeURIComponent's expansion ratio varies by character
 * (a CRLF alone costs 6 encoded chars). */
function trimBodyToEncodedBudget(body: string, budget: number): string {
  if (encodeURIComponent(body).length <= budget) return body;
  const suffixLen = encodeURIComponent(TRUNCATION_SUFFIX).length;
  const textBudget = Math.max(0, budget - suffixLen);

  let lo = 0;
  let hi = body.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    const candidateLen = encodeURIComponent(body.slice(0, mid)).length;
    if (candidateLen <= textBudget) lo = mid;
    else hi = mid - 1;
  }
  return body.slice(0, lo) + TRUNCATION_SUFFIX;
}

/**
 * Builds a well-formed `mailto:` href: recipients comma-joined (each
 * percent-encoded individually, so a display name's spaces/angle-brackets
 * survive), subject + body percent-encoded, body CRLF-normalized. If the
 * result would exceed MAILTO_MAX_LENGTH, the body alone is trimmed to fit
 * (recipients + subject are never touched) and `truncated` comes back true.
 */
export function buildMailtoHref(draft: MailtoDraft): MailtoResult {
  const body = normalizeCrlf(draft.body);
  const href = buildHref(draft.to, draft.subject, body);
  if (href.length <= MAILTO_MAX_LENGTH) {
    return { href, truncated: false };
  }

  const fixedLen = href.length - encodeURIComponent(body).length;
  const budget = Math.max(0, MAILTO_MAX_LENGTH - fixedLen);
  const trimmedBody = trimBodyToEncodedBudget(body, budget);
  return {
    href: buildHref(draft.to, draft.subject, trimmedBody),
    truncated: true,
  };
}
