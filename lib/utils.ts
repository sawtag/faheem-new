import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Lang } from "@/lib/types";

/** Merge conditional class lists, resolving Tailwind conflicts (last wins). */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Locale that renders WESTERN (Latin) digits in both languages, AGENTS.md
 * rule 2 (financial figures are Western digits in en AND ar). The `-u-nu-latn`
 * unicode extension keeps Arabic month names / conventions while forcing Latin
 * numerals, so a column of figures never shifts script between locales.
 */
function numLocale(lang: Lang): string {
  return lang === "ar" ? "ar-u-nu-latn" : "en-US";
}

/**
 * Money in the demo's house style: `SAR 7,245.2M`.
 * `value` is expressed in millions of SAR (matches `model-inputs.json` "SAR m").
 * Pass `{ unit: "abs" }` for a raw SAR amount (no scale suffix, 0 decimals).
 */
export function formatSAR(
  value: number,
  lang: Lang,
  opts: { unit?: "m" | "abs"; decimals?: number } = {},
): string {
  const { unit = "m", decimals = unit === "m" ? 1 : 0 } = opts;
  const n = new Intl.NumberFormat(numLocale(lang), {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
  return unit === "m" ? `SAR ${n}M` : `SAR ${n}`;
}

/** Plain number, Western digits both locales: counts, bps gaps, `/10` scores. */
export function westernNumber(value: number, lang: Lang, maxFrac = 0): string {
  return new Intl.NumberFormat(numLocale(lang), {
    maximumFractionDigits: maxFrac,
  }).format(value);
}

/** Percentage in house style: `17.2%` (or `+2.2%` with `{ signed: true }`). */
export function formatPercent(
  value: number,
  lang: Lang,
  opts: { decimals?: number; signed?: boolean } = {},
): string {
  const { decimals = 1, signed = false } = opts;
  const n = new Intl.NumberFormat(numLocale(lang), {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    signDisplay: signed ? "exceptZero" : "auto",
  }).format(value);
  return `${n}%`;
}

/** Localized date, Western digits both locales: `Jul 12, 2026` (`withTime` adds `09:41`). */
export function formatDate(
  iso: string,
  lang: Lang,
  opts: { withTime?: boolean } = {},
): string {
  return new Intl.DateTimeFormat(numLocale(lang), {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...(opts.withTime
      ? { hour: "2-digit", minute: "2-digit", hour12: false }
      : {}),
  }).format(new Date(iso));
}
