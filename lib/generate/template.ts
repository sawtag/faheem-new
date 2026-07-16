/**
 * Company Word template ("tagged template") — lets the firm upload its own
 * .docx containing `{{tag}}` placeholders; the IC memo generator fills it
 * with live model values instead of building the built-in `buildIcMemo()`
 * memo (app/api/generate/[artifact]/route.ts picks between the two).
 *
 * Every tag value derives from `buildNarrativeFacts(computeModel())` and/or
 * `computeModel()`/`BASE_ASSUMPTIONS` formatted with the shared narrative
 * conventions (`pct`, `fact`) — never a hand-typed number (AGENTS.md rule 5).
 * `companyName`/`firmName`/`date` are fixed demo entity/document labels, not
 * quantitative claims, and mirror the literal strings `docx.ts` already
 * writes on the built-in memo's cover page.
 *
 * docxtemplater is configured with `{{tag}}` delimiters (never Word's own
 * `{ }` merge-field look, which would collide with normal prose braces) and
 * `nullGetter` set to echo the literal `{{tag}}` back — an unknown tag stays
 * visibly unresolved in the output rather than silently vanishing.
 */
import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";
import InspectModule from "docxtemplater/js/inspect-module.js";
import { BASE_ASSUMPTIONS, computeModel } from "@/lib/model/compute";
import {
  buildNarrativeFacts,
  fact,
  loadNarratives,
  pct,
  riskRegister,
  resolveNarrativeTree,
  type NarrativeFacts,
} from "@/lib/generate/shared";

const DELIMITERS = { start: "{{", end: "}}" } as const;

/** Echoes the tag back literally so an unrecognized `{{tag}}` stays visible. */
function nullGetter(part: { value: string }): string {
  return `{{${part.value}}}`;
}

// ═══════════════════════════════ tag catalog ════════════════════════════════
// Ordered for the "View available tags" catalog dialog — grouped recommendation
// → scenarios → WACC build → Shariah/risk → sources → narrative prose.
export const TEMPLATE_TAG_KEYS = [
  "companyName",
  "firmName",
  "date",
  "recommendation",
  "perShare",
  "currentPrice",
  "upside",
  "irr",
  "weightedReturn",
  "weightedPerShare",
  "hurdle",
  "bullPerShare",
  "bearPerShare",
  "bullUpside",
  "bearUpside",
  "bullIrr",
  "bearIrr",
  "bullProbability",
  "baseProbability",
  "bearProbability",
  "wacc",
  "costOfEquity",
  "riskFreeRate",
  "equityRiskPremium",
  "beta",
  "terminalGrowth",
  "shariahVerdict",
  "debtRatio",
  "cashRatio",
  "riskScore",
  "netCash",
  "sharesOutstanding",
  "compsMedian",
  "gmvGrowthFy25",
  "execSummary",
  "thesisPillar1",
  "thesisPillar2",
  "thesisPillar3",
  "keyRisks",
] as const;

export type TemplateTagKey = (typeof TEMPLATE_TAG_KEYS)[number];

/** Loose shape of `data/narratives.json`'s memo block that the catalog needs. */
interface MemoTagSource {
  execSummary: string;
  thesisPillars: { title: string; body: string }[];
}

/** Curated flat `{{tag}}` -> live value map — the only source `fillCompanyTemplate` renders from. */
export function buildTemplateTags(): Record<TemplateTagKey, string> {
  const model = computeModel();
  const facts: NarrativeFacts = buildNarrativeFacts(model);
  const memo = resolveNarrativeTree(
    loadNarratives().memo as unknown as MemoTagSource,
    facts,
  );
  const f = (key: string): string => fact(facts, key);

  return {
    companyName: "Jahez International Company (Tadawul: 6017)",
    firmName: "Lunar Investments",
    date: "12 July 2026",
    recommendation: f("calc.rating"),
    perShare: f("calc.targetPrice"),
    currentPrice: f("calc.currentPrice"),
    upside: f("calc.upside"),
    irr: f("calc.irrBase"),
    weightedReturn: f("calc.weightedReturn"),
    weightedPerShare: f("calc.weightedPerShare"),
    hurdle: f("calc.hurdle"),
    bullPerShare: f("calc.perShareBull"),
    bearPerShare: f("calc.perShareBear"),
    bullUpside: f("calc.upsideBull"),
    bearUpside: f("calc.upsideBear"),
    bullIrr: f("calc.irrBull"),
    bearIrr: f("calc.irrBear"),
    bullProbability: pct(BASE_ASSUMPTIONS.probBull),
    baseProbability: pct(BASE_ASSUMPTIONS.probBase),
    bearProbability: pct(BASE_ASSUMPTIONS.probBear),
    wacc: f("calc.wacc"),
    costOfEquity: f("calc.costOfEquity"),
    riskFreeRate: f("calc.riskFreeRate"),
    equityRiskPremium: f("calc.equityRiskPremium"),
    beta: f("calc.beta"),
    terminalGrowth: f("calc.terminalGrowth"),
    shariahVerdict: f("calc.shariahStatus"),
    debtRatio: f("calc.debtRatio"),
    cashRatio: f("calc.cashRatio"),
    riskScore: f("calc.riskScore"),
    netCash: f("calc.netCash"),
    sharesOutstanding: f("calc.sharesOutstanding"),
    compsMedian: f("calc.compsMedian"),
    gmvGrowthFy25: f("calc.gmvGrowthFy25"),
    execSummary: memo.execSummary,
    thesisPillar1: memo.thesisPillars[0]!.body,
    thesisPillar2: memo.thesisPillars[1]!.body,
    thesisPillar3: memo.thesisPillars[2]!.body,
    keyRisks: riskRegister.map((r) => r.name).join("; "),
  };
}

// ═══════════════════════════ template fill + inspect ════════════════════════

/** Thrown when the uploaded bytes aren't a docx docxtemplater can parse. */
export class TemplateParseError extends Error {}

function loadZip(bytes: Buffer): PizZip {
  try {
    return new PizZip(bytes);
  } catch (err) {
    throw new TemplateParseError(
      `Unreadable template file: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

/** Fills an uploaded company template with live model values (single-slot store's bytes). */
export function fillCompanyTemplate(templateBytes: Buffer): Buffer {
  const zip = loadZip(templateBytes);
  let doc: Docxtemplater;
  try {
    doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: DELIMITERS,
      nullGetter,
    });
  } catch (err) {
    throw new TemplateParseError(
      `Unparseable template: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
  doc.render(buildTemplateTags());
  return doc.getZip().generate({ type: "nodebuffer" });
}

/** Enumerates `{{tag}}` placeholders in an uploaded template, split against the catalog. */
export function inspectTemplateTags(bytes: Buffer): {
  found: string[];
  unknown: string[];
} {
  const zip = loadZip(bytes);
  const inspector = new InspectModule();
  try {
    // Constructing runs the parse; the inspector module records tags as a side effect.
    new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: DELIMITERS,
      modules: [inspector],
      nullGetter,
    });
  } catch (err) {
    throw new TemplateParseError(
      `Unparseable template: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  const allTags = Object.keys(inspector.getAllTags());
  const catalog = new Set<string>(TEMPLATE_TAG_KEYS);
  const found = allTags.filter((t) => catalog.has(t));
  const unknown = allTags.filter((t) => !catalog.has(t));
  return { found, unknown };
}
