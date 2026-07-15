/**
 * POST /api/model-edit, turn a plain-language instruction into a whitelisted
 * assumption edit (WS-C, live-model-provenance plan §3).
 *
 * Scripted-first: `parseEdit` resolves the demo edit set (EN + AR) locally and
 * OFFLINE, cached mode never calls out. Only when the local parser can't
 * resolve AND the mode is live/auto do we make ONE small Claude call (strict
 * JSON, via lib/ai/client.ts), and its output is re-validated against the SAME
 * whitelist before it can return. Editing a sourced actual yields a graceful
 * "source-locked" outcome. Every actionable edit and every source-locked
 * attempt appends one audit entry (actor Ali), mirroring the chat route.
 */
import { z } from "zod";
import { getClient, getImproveModel } from "@/lib/ai/client";
import type { MessageCreateParams } from "@/lib/ai/client";
import { resolveMode } from "@/lib/ai/mode";
import { appendAudit } from "@/lib/audit";
import { BASE_ASSUMPTIONS } from "@/lib/model/compute";
import {
  PROB_KEYS,
  baseField,
  displayNative,
  parseEdit,
  rebalanceProbabilities,
  validateEdit,
  whitelistKeys,
  type EditParse,
} from "@/lib/model/edit-parser";
import { LangSchema, type Lang } from "@/lib/types";
import type { Assumptions } from "@/lib/model/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  instruction: z.string().min(1),
  lang: LangSchema,
  /** current Assumptions, used for relative edits + old→new audit detail */
  assumptions: z
    .record(z.string(), z.union([z.number(), z.array(z.number())]))
    .optional(),
  /** selected cell's assumptionKey, when the analyst edits from a selection */
  selection: z.string().optional(),
  companyId: z.string().optional(),
});

function readCookie(request: Request, name: string): string | undefined {
  const header = request.headers.get("cookie");
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === name) {
      try {
        return decodeURIComponent(part.slice(eq + 1).trim());
      } catch {
        return undefined;
      }
    }
  }
  return undefined;
}

// ─────────────────────────── bilingual summaries ───────────────────────────

function editSummary(lang: Lang, rebalanced: boolean): string {
  if (rebalanced) {
    return lang === "ar"
      ? "تم فهم التعليمات، أُعيدت موازنة أوزان السيناريوهات ليبقى مجموع الاحتمالات 100٪، ويُعاد احتساب النموذج."
      : "Instruction understood, scenario weights rebalanced so probabilities still sum to 100%, recomputing the model.";
  }
  return lang === "ar"
    ? "تم فهم التعليمات، يُعاد احتساب النموذج."
    : "Instruction understood, recomputing the model.";
}

function sourceLockedSummary(lang: Lang): string {
  return lang === "ar"
    ? "هذا الرقم قيمة فعلية موثّقة، مُقفلة من المصدر ولا يمكن تعديلها. القيم الفعلية تأتي من المستندات المصدرية؛ عدّل الافتراضات بدلاً من ذلك."
    : "That figure is a sourced actual, it's source-locked and can't be edited. Actuals come from the source documents; edit an assumption instead.";
}

function unparsedSummary(lang: Lang): string {
  return lang === "ar"
    ? "تعذّر ربط ذلك بافتراض قابل للتعديل. جرّب مثلاً: «ارفع نمو الطلبات لعام 2026 إلى 20٪» أو «ماذا لو كان النمو النهائي 3.5٪؟»."
    : 'Couldn\'t map that to an editable assumption. Try e.g. "raise FY26 order growth to 20%" or "what if terminal growth is 3.5%?".';
}

// ─────────────────────────── live fallback (live/auto only) ───────────────────────────

function liveParserPrompt(lang: Lang): string {
  const keys = whitelistKeys().join(", ");
  return [
    "You map a single plain-language instruction about a DCF model into ONE assumption edit.",
    "Return STRICT JSON only, no prose.",
    `The ONLY editable assumption keys are: ${keys}.`,
    "Array keys are indexed 0..N for forecast years FY26E..FY30E (index 0 = FY26E).",
    "Values are the model's NATIVE units: DECIMALS for rate/percent fields (0.2 = 20%, 0.035 = 3.5%), integer years for holdYears, raw score for riskWeights.",
    'If the instruction targets a SOURCED ACTUAL (any FY23–FY25 revenue/GMV/EBITDA/net income/AOV/orders figure, or the share price) return {"kind":"source-locked","target":"<name>"}, those are immutable.',
    'If you cannot map it to a listed key, return {"kind":"unparsed"}.',
    'Otherwise return {"kind":"edit","assumptionKey":"<one of the listed keys>","value":<number in native units>}.',
    lang === "ar" ? "The instruction may be in Arabic." : "",
  ]
    .filter(Boolean)
    .join("\n");
}

const LIVE_SCHEMA = {
  type: "object",
  properties: {
    kind: { type: "string", enum: ["edit", "source-locked", "unparsed"] },
    assumptionKey: { type: "string" },
    value: { type: "number" },
    target: { type: "string" },
  },
  required: ["kind"],
  additionalProperties: false,
} as const;

async function liveParse(
  instruction: string,
  lang: Lang,
): Promise<EditParse | null> {
  try {
    const params: MessageCreateParams & { temperature?: number } = {
      model: getImproveModel(),
      max_tokens: 256,
      temperature: 0,
      system: liveParserPrompt(lang),
      messages: [{ role: "user", content: instruction }],
      output_config: {
        format: { type: "json_schema", schema: LIVE_SCHEMA },
      },
    };
    const res = await getClient().messages.create(params);
    const text = res.content.find((b) => b.type === "text")?.text ?? "{}";
    const obj = JSON.parse(text) as {
      kind?: string;
      assumptionKey?: unknown;
      value?: unknown;
      target?: unknown;
    };
    if (obj.kind === "source-locked") {
      return { kind: "source-locked", target: String(obj.target ?? "") };
    }
    if (
      obj.kind === "edit" &&
      typeof obj.assumptionKey === "string" &&
      typeof obj.value === "number"
    ) {
      // re-validate against the SAME whitelist, an illegal/hallucinated key is
      // rejected here, never trusted from the model.
      const v = validateEdit(obj.assumptionKey, obj.value);
      return v
        ? { kind: "edit", assumptionKey: v.assumptionKey, value: v.value }
        : { kind: "unparsed" };
    }
    return { kind: "unparsed" };
  } catch {
    // any network/model/parse failure degrades to "unparsed" (never throws)
    return null;
  }
}

// ─────────────────────────────── handler ───────────────────────────────

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid model-edit request" },
      { status: 400 },
    );
  }
  const { instruction, lang, assumptions, companyId } = parsed.data;
  // merge over BASE so partial client payloads can't produce NaN in the
  // relative-edit / rebalance math
  const a = {
    ...BASE_ASSUMPTIONS,
    ...(assumptions ?? {}),
  } as Assumptions;

  let result = parseEdit(instruction, lang, a);

  // Live fallback: only when the scripted parser gave up AND the mode is
  // live/auto. Cached mode is bulletproof-offline and NEVER calls out.
  if (result.kind === "unparsed") {
    const mode = resolveMode(readCookie(request, "faheem_mode"));
    if (mode !== "cached") {
      const live = await liveParse(instruction, lang);
      if (live) result = live;
      // the live path skips parseEdit's rebalance, apply the same invariant
      if (
        result.kind === "edit" &&
        (PROB_KEYS as readonly string[]).includes(result.assumptionKey)
      ) {
        result = {
          ...result,
          also: rebalanceProbabilities(a, result.assumptionKey, result.value),
        };
      }
    }
  }

  const context = `workspace:${companyId ?? "jahez"}`;

  if (result.kind === "edit") {
    const field = baseField(result.assumptionKey);
    const dot = result.assumptionKey.indexOf(".");
    const idx = dot === -1 ? null : Number(result.assumptionKey.slice(dot + 1));
    const old =
      idx === null
        ? (a as unknown as Record<string, number>)[field]
        : (a as unknown as Record<string, number[]>)[field]?.[idx];
    const oldStr = typeof old === "number" ? displayNative(field, old) : "base";
    const rebalanced = (result.also?.length ?? 0) > 0;
    appendAudit({
      ts: new Date().toISOString(),
      user: "Ali",
      context,
      action: "model-edit",
      question: `${result.assumptionKey}: ${oldStr} → ${displayNative(
        field,
        result.value,
      )}${rebalanced ? " (scenario weights rebalanced)" : ""}`,
    });
    return Response.json({
      kind: "edit",
      assumptionKey: result.assumptionKey,
      value: result.value,
      ...(result.also ? { also: result.also } : {}),
      summary: editSummary(lang, rebalanced),
    });
  }

  if (result.kind === "source-locked") {
    appendAudit({
      ts: new Date().toISOString(),
      user: "Ali",
      context,
      action: "model-edit",
      question: `source-locked (blocked): ${result.target}`,
    });
    return Response.json({
      kind: "source-locked",
      target: result.target,
      summary: sourceLockedSummary(lang),
    });
  }

  return Response.json({ kind: "unparsed", summary: unparsedSummary(lang) });
}
