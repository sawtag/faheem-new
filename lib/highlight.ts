/**
 * Citation-quote → PDF-text-layer matcher (pure; unit-tested in
 * tests/chat/highlight.test.ts). Given a recorded citation quote and the
 * page's pdfjs text items, find the best matching character ranges so the
 * PdfPanel can wrap them in <mark> spans.
 *
 * PDF text extraction is ragged — items split mid-sentence (or mid-word),
 * quotes carry linebreak artifacts, curly punctuation differs — so both sides
 * are normalized (NFKC, lowercase, unified quotes/dashes, soft hyphens
 * dropped) and compared with ALL whitespace removed. An index map from every
 * squashed character back to its (item, char) origin turns a match in the
 * squashed domain into per-item ranges.
 *
 * Tiers (first hit wins), thresholds tuned against all 120 recorded quotes in
 * data/demo-cache — 111 match fully; the tiers below catch the other 9:
 *   1. full quote found verbatim (post-normalization);
 *   2. longest quote PREFIX found, if it spans ≥40 chars of the raw quote;
 *   3. longest whole-token RUN of the quote found contiguously in the page
 *      (punctuation-only edge tokens trimmed), if it spans ≥25 raw chars OR
 *      is a multi-word run of ≥12 squashed chars — this catches composed
 *      quotes like "Average Order Value 64.9 (+5.2% YoY)" whose label exists
 *      on the page but whose value sits in a different table cell;
 *   4. no match → null. The caller falls back to page-level open, silently.
 */

export interface HighlightSpan {
  /** index into the page's TextContent.items array */
  itemIndex: number;
  /** char range within that item's `str` (end exclusive) */
  start: number;
  end: number;
}

const PREFIX_MIN_RAW = 40;
const RUN_MIN_RAW = 25;
const RUN_MIN_SQUASHED = 12;

/** Punctuation variants unified before comparison; soft hyphen/BOM dropped. */
const CHAR_MAP: Record<string, string> = {
  "­": "",
  "﻿": "",
  "‘": "'",
  "’": "'",
  "‚": "'",
  "‛": "'",
  "′": "'",
  "“": '"',
  "”": '"',
  "„": '"',
  "″": '"',
  "‐": "-",
  "‑": "-",
  "‒": "-",
  "–": "-",
  "—": "-",
  "−": "-",
};

/** Normalize one source char into 0+ comparison chars (NFKC may expand ligatures). */
function normalizeChar(ch: string): string {
  return (CHAR_MAP[ch] ?? ch).normalize("NFKC").toLowerCase();
}

interface SquashedPage {
  text: string;
  /** per squashed char: which item and which char within it */
  origins: { item: number; char: number }[];
}

function squashItems(items: string[]): SquashedPage {
  let text = "";
  const origins: SquashedPage["origins"] = [];
  items.forEach((str, item) => {
    for (let char = 0; char < str.length; char++) {
      for (const c of normalizeChar(str[char]!)) {
        if (/\s/.test(c)) continue;
        text += c;
        origins.push({ item, char });
      }
    }
  });
  return { text, origins };
}

interface SquashedQuote {
  text: string;
  /** per squashed char: index into the raw quote (for raw-span thresholds) */
  src: number[];
  /** per squashed char: whitespace-delimited token ordinal */
  token: number[];
}

function squashQuote(quote: string): SquashedQuote {
  let text = "";
  const src: number[] = [];
  const token: number[] = [];
  let tok = 0;
  let inGap = true;
  for (let i = 0; i < quote.length; i++) {
    for (const c of normalizeChar(quote[i]!)) {
      if (/\s/.test(c)) {
        inGap = true;
        continue;
      }
      if (inGap) {
        tok += 1;
        inGap = false;
      }
      text += c;
      src.push(i);
      token.push(tok);
    }
  }
  return { text, src, token };
}

/** Map a squashed-page range [start, end) back to per-item char ranges. */
function toSpans(
  page: SquashedPage,
  start: number,
  end: number,
): HighlightSpan[] {
  const spans: HighlightSpan[] = [];
  for (let i = start; i < end; i++) {
    const { item, char } = page.origins[i]!;
    const last = spans[spans.length - 1];
    if (last && last.itemIndex === item) {
      last.end = char + 1;
    } else {
      spans.push({ itemIndex: item, start: char, end: char + 1 });
    }
  }
  return spans;
}

/** Raw-quote char span covered by squashed quote range [start, end). */
function rawSpan(q: SquashedQuote, start: number, end: number): number {
  if (end <= start) return 0;
  return q.src[end - 1]! - q.src[start]! + 1;
}

/** Longest prefix length (squashed) of `quote` present in `page`. */
function longestPrefix(page: string, quote: string): number {
  let lo = 0;
  let hi = quote.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (page.includes(quote.slice(0, mid))) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

/**
 * Best whole-token run of the quote found contiguously in the page. Tokens
 * whose squashed text has no letter/digit are trimmed from the run's edges
 * (so "Commission Revenue /" scores as "Commission Revenue"). Returns the
 * squashed-quote range of the best run, or null.
 */
function bestTokenRun(
  page: string,
  q: SquashedQuote,
): { start: number; end: number } | null {
  // token ordinal → [startChar, endChar) in squashed quote
  const bounds = new Map<number, { start: number; end: number }>();
  for (let i = 0; i < q.text.length; i++) {
    const t = q.token[i]!;
    const b = bounds.get(t);
    if (b) b.end = i + 1;
    else bounds.set(t, { start: i, end: i + 1 });
  }
  const tokens = [...bounds.values()];
  const isWordy = (b: { start: number; end: number }) =>
    /[\p{L}\p{N}]/u.test(q.text.slice(b.start, b.end));

  let best: { start: number; end: number } | null = null;
  for (let a = 0; a < tokens.length; a++) {
    // presence is monotone in run extension → binary search the furthest end
    let lo = a;
    let hi = tokens.length - 1;
    if (!page.includes(q.text.slice(tokens[a]!.start, tokens[a]!.end)))
      continue;
    while (lo < hi) {
      const mid = Math.ceil((lo + hi) / 2);
      if (page.includes(q.text.slice(tokens[a]!.start, tokens[mid]!.end)))
        lo = mid;
      else hi = mid - 1;
    }
    // trim punctuation-only edge tokens
    let s = a;
    let e = lo;
    while (s <= e && !isWordy(tokens[s]!)) s++;
    while (e >= s && !isWordy(tokens[e]!)) e--;
    if (s > e) continue;
    const run = { start: tokens[s]!.start, end: tokens[e]!.end };
    if (!best || run.end - run.start > best.end - best.start) best = run;
  }
  return best;
}

/**
 * Find the best match for `quote` across the page's text items. `items` is
 * TextContent.items mapped to each item's `str` ("" for non-text items), in
 * order — span itemIndex values index into that same array.
 * Returns null when nothing clears the thresholds (caller shows page-only).
 */
export function matchQuote(
  quote: string,
  items: string[],
): HighlightSpan[] | null {
  const page = squashItems(items);
  const q = squashQuote(quote);
  if (q.text.length === 0 || page.text.length === 0) return null;

  // 1 — full match
  const full = page.text.indexOf(q.text);
  if (full !== -1) return toSpans(page, full, full + q.text.length);

  // 2 — longest prefix
  const pfx = longestPrefix(page.text, q.text);
  if (pfx > 0 && rawSpan(q, 0, pfx) >= PREFIX_MIN_RAW) {
    const at = page.text.indexOf(q.text.slice(0, pfx));
    return toSpans(page, at, at + pfx);
  }

  // 3 — best whole-token run
  const run = bestTokenRun(page.text, q);
  if (run) {
    const len = run.end - run.start;
    const multiWord = q.token[run.end - 1]! > q.token[run.start]!;
    if (
      rawSpan(q, run.start, run.end) >= RUN_MIN_RAW ||
      (multiWord && len >= RUN_MIN_SQUASHED)
    ) {
      const at = page.text.indexOf(q.text.slice(run.start, run.end));
      return toSpans(page, at, at + len);
    }
  }

  return null;
}
