/**
 * components/model/format — ValueNode.value + .unit → display string.
 *
 * Reuses lib/utils' formatSAR/formatPercent for the "%"/"SAR"/"SAR m" units
 * (house style, tabular-nums-ready). The remaining model-only units ("x"
 * multiples, "m" millions-of-units counts, "years", "score") are formatted
 * locally — "x"/"M" are mathematical/notation suffixes, not language content
 * (same treatment as formatSAR's own hardcoded "SAR"/"M"), so they render
 * identically in both locales; only "years" carries translated text.
 */
import { formatPercent, formatSAR } from "@/lib/utils";
import type { Lang } from "@/lib/types";
import type { ValueNode } from "@/lib/model/types";

function numLocale(lang: Lang): string {
  return lang === "ar" ? "ar-u-nu-latn" : "en-US";
}

function num(value: number, lang: Lang, decimals: number): string {
  return new Intl.NumberFormat(numLocale(lang), {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatNodeValue(
  node: Pick<ValueNode, "value" | "unit">,
  lang: Lang,
  t: (key: string, values?: Record<string, string | number>) => string,
): string {
  const { value, unit } = node;
  switch (unit) {
    case "%":
      return formatPercent(value, lang);
    case "SAR m":
      return formatSAR(value, lang);
    case "SAR":
      return formatSAR(value, lang, { unit: "abs", decimals: 2 });
    case "x":
      return `${num(value, lang, 2)}x`;
    case "m":
      return `${num(value, lang, 1)}M`;
    case "years":
      return t("model.units.years", { value: num(value, lang, 0) });
    case "score":
      return num(value, lang, 1);
    default:
      return num(value, lang, 2);
  }
}
