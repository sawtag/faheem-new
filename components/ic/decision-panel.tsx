"use client";

import * as React from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  CircleAlert,
  CircleCheck,
  CircleX,
  Download,
  FileText,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { LogoTile } from "@/components/ui/logo-tile";
import { CiteChip } from "@/components/ic/comparison-table";
import {
  briefRows,
  clearDecision,
  DECISIONS,
  readDecisions,
  writeDecision,
  type BriefRow,
  type IcDecision,
  type RecordedDecision,
} from "@/components/ic/decision";
import { recordIcDecision } from "@/components/ic/decision-actions";
import { KIND_TILE } from "@/components/generate/file-card";
import { publishGoldenSelection } from "@/lib/demo/golden-bus";
import type { ArtifactMeta, Deal, IcMetrics, Lang } from "@/lib/types";
import { formatDate, formatPercent, westernNumber } from "@/lib/utils";

const EASE = [0.4, 0, 0.2, 1] as const;

const TONE_ICON = {
  pass: CircleCheck,
  warn: CircleAlert,
  fail: CircleX,
} as const;

const TONE_TEXT = {
  pass: "text-accent-700",
  warn: "text-warning-700",
  fail: "text-danger-700",
} as const;

const DECISION_BADGE: Record<IcDecision, BadgeProps["variant"]> = {
  advance: "mint",
  defer: "warning",
  decline: "danger",
};

/** (row key, tone) → ic.decision.* message id for the brief line. */
function rowMessageKey(row: BriefRow): string {
  switch (row.key) {
    case "hurdle":
      return row.tone === "pass"
        ? "hurdlePass"
        : row.tone === "fail"
          ? "hurdleFail"
          : "hurdleEqual";
    case "compliance":
      return row.tone === "pass" ? "compliancePass" : "complianceFail";
    case "mandateFit":
      return row.tone === "pass" ? "mandatePass" : "mandateWarn";
    case "risk":
      return row.tone === "pass"
        ? "riskLow"
        : row.tone === "warn"
          ? "riskModerate"
          : "riskHigh";
  }
}

/** The per-kind question the sparkle button seeds into the IC chat. */
function artifactQuestionKey(kind: ArtifactMeta["kind"]): string {
  return kind === "xlsx" ? "askXlsx" : kind === "docx" ? "askDocx" : "askPptx";
}

interface PendingChoice {
  deal: Deal;
  metrics: IcMetrics;
  decision: IcDecision;
}

/**
 * The decision phase (the demo's third human gate). One card per committee
 * column: Faheem's verified pre-decision brief (derived from `icMetrics`, every
 * figure sourced), the materials on the table (deliverables + the cited
 * analysis, each askable in the advisory chat), and the committee's
 * Advance / Defer / Decline call, confirmed against the brief and recorded to
 * the append-only audit trail. Faheem briefs; the committee decides.
 */
export function DecisionPanel({
  columns,
  artifacts,
  onOpenDoc,
}: {
  columns: Deal[];
  artifacts: ArtifactMeta[];
  onOpenDoc: (docId: string, page: number) => void;
}) {
  const t = useTranslations("ic.decision");
  const locale = useLocale() as Lang;
  const reduce = useReducedMotion();

  // Hydrate recorded votes after mount, localStorage is client-only, a
  // legitimate external-store sync (same convention as ChatView's resolver).
  const [decided, setDecided] = React.useState<
    Record<string, RecordedDecision>
  >({});
  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDecided(readDecisions());
  }, []);

  const [pending, setPending] = React.useState<PendingChoice | null>(null);
  const [recording, setRecording] = React.useState(false);

  async function confirm() {
    if (!pending || recording) return;
    setRecording(true);
    const summary = `${t(pending.decision)} · ${pending.deal.name[locale]}`;
    try {
      await recordIcDecision(summary);
    } catch {
      /* the vote still records locally; the audit poller shows the gap */
    }
    const entry: RecordedDecision = {
      decision: pending.decision,
      ts: new Date().toISOString(),
    };
    writeDecision(pending.deal.id, entry);
    setDecided((prev) => ({ ...prev, [pending.deal.id]: entry }));
    setRecording(false);
    setPending(null);
  }

  function revise(dealId: string) {
    clearDecision(dealId);
    setDecided((prev) => {
      const next = { ...prev };
      delete next[dealId];
      return next;
    });
  }

  return (
    <section aria-labelledby="ic-decision-heading" className="mt-8">
      <div className="flex items-baseline justify-between gap-4">
        <h2
          id="ic-decision-heading"
          className="text-navy text-lg font-extrabold"
        >
          {t("title")}
        </h2>
      </div>
      <p className="text-text-secondary mt-1 max-w-2xl text-[0.8125rem] leading-relaxed">
        {t("subtitle")}
      </p>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        {columns.map((deal, i) => (
          <motion.div
            key={deal.id}
            initial={reduce ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: EASE, delay: i * 0.04 }}
          >
            <DecisionCard
              deal={deal}
              artifacts={artifacts.filter((a) => a.workspace === deal.id)}
              recorded={decided[deal.id]}
              locale={locale}
              onOpenDoc={onOpenDoc}
              onChoose={(decision) =>
                deal.icMetrics &&
                setPending({ deal, metrics: deal.icMetrics, decision })
              }
              onRevise={() => revise(deal.id)}
            />
          </motion.div>
        ))}
      </div>

      <Dialog
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open) setPending(null);
        }}
      >
        {pending && (
          <DialogContent data-testid="ic-decision-dialog">
            <DialogTitle>{t("confirmTitle")}</DialogTitle>
            <DialogDescription>
              {t("confirmSummary", {
                decision: t(pending.decision),
                deal: pending.deal.name[locale],
              })}
            </DialogDescription>

            <div className="border-border bg-bg rounded-card mt-4 border p-4">
              <p className="text-text-secondary text-[0.6875rem] font-bold tracking-[0.06em] uppercase">
                {t("briefLabel")}
              </p>
              <ul className="mt-2.5 flex flex-col gap-1.5">
                {briefRows(pending.metrics).map((row) => (
                  <BriefLine
                    key={row.key}
                    row={row}
                    metrics={pending.metrics}
                    locale={locale}
                  />
                ))}
              </ul>
              <p className="text-text mt-3 text-sm leading-snug">
                {pending.metrics.recommendation[locale]}
              </p>
              <CiteChip
                docId={pending.metrics.cite.docId}
                page={pending.metrics.cite.page}
                locale={locale}
                onOpen={(docId, page) => {
                  // The PdfPanel sits under the dialog overlay; hand off cleanly.
                  setPending(null);
                  onOpenDoc(docId, page);
                }}
              />
            </div>

            <p className="text-text-secondary mt-3 text-xs leading-relaxed">
              {t("confirmNote")}
            </p>

            <div className="mt-5 flex items-center justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPending(null)}
              >
                {t("cancel")}
              </Button>
              <Button
                size="sm"
                loading={recording}
                onClick={() => void confirm()}
                data-testid="ic-decision-record"
              >
                {t("record")}
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </section>
  );
}

// ─────────────────────────────── deal card ───────────────────────────────

function DecisionCard({
  deal,
  artifacts,
  recorded,
  locale,
  onOpenDoc,
  onChoose,
  onRevise,
}: {
  deal: Deal;
  artifacts: ArtifactMeta[];
  recorded?: RecordedDecision;
  locale: Lang;
  onOpenDoc: (docId: string, page: number) => void;
  onChoose: (decision: IcDecision) => void;
  onRevise: () => void;
}) {
  const t = useTranslations("ic.decision");
  const m = deal.icMetrics;

  return (
    <div
      data-testid={`ic-decision-card-${deal.id}`}
      className="border-border bg-card rounded-card flex h-full flex-col border p-5 shadow-[var(--shadow-card)]"
    >
      <div className="flex items-center gap-2.5">
        <LogoTile
          label={deal.name.en}
          initial={deal.name[locale].charAt(0)}
          size={24}
        />
        <span className="text-navy min-w-0 truncate text-[0.9375rem] font-bold">
          {deal.name[locale]}
        </span>
        <span className="ms-auto shrink-0">
          {recorded ? (
            <Badge
              variant={DECISION_BADGE[recorded.decision]}
              data-testid={`ic-decision-recorded-${deal.id}`}
            >
              {t(recorded.decision)}
            </Badge>
          ) : (
            <Badge variant="neutral">{t("awaiting")}</Badge>
          )}
        </span>
      </div>

      {m ? (
        <>
          <ul className="mt-4 flex flex-col gap-1.5">
            {briefRows(m).map((row) => (
              <BriefLine key={row.key} row={row} metrics={m} locale={locale} />
            ))}
          </ul>

          <p className="text-text-secondary mt-4 text-[0.6875rem] font-bold tracking-[0.06em] uppercase">
            {t("onTable")}
          </p>
          <ul className="mt-2 flex flex-col gap-1.5">
            <li>
              <MaterialRow
                icon={<FileText className="size-4" aria-hidden="true" />}
                tile="bg-navy-50 text-navy-700"
                name={t("analysisDoc")}
                onOpen={() => onOpenDoc(m.cite.docId, 1)}
                ask={{
                  label: t("askAbout", { name: t("analysisDoc") }),
                  question: t("askAnalysis", { company: deal.name[locale] }),
                }}
              />
            </li>
            {artifacts.map((a) => {
              const { icon: Icon, tile } = KIND_TILE[a.kind];
              return (
                <li key={a.id}>
                  <MaterialRow
                    icon={<Icon className="size-4" aria-hidden="true" />}
                    tile={tile}
                    name={a.name[locale]}
                    downloadHref={a.file}
                    ask={{
                      label: t("askAbout", { name: a.name[locale] }),
                      question: t(artifactQuestionKey(a.kind), {
                        company: deal.name[locale],
                      }),
                    }}
                  />
                </li>
              );
            })}
          </ul>

          <div className="border-border mt-4 flex items-center gap-2 border-t pt-4">
            {recorded ? (
              <>
                <p className="text-text-secondary text-xs leading-snug">
                  {t("recordedLine", {
                    time: formatDate(recorded.ts, locale, { withTime: true }),
                  })}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="ms-auto shrink-0"
                  startIcon={
                    <RotateCcw className="size-4" aria-hidden="true" />
                  }
                  onClick={onRevise}
                >
                  {t("revise")}
                </Button>
              </>
            ) : (
              DECISIONS.map((decision) => (
                <Button
                  key={decision}
                  variant={decision === "advance" ? "secondary" : "outline"}
                  size="sm"
                  className="flex-1"
                  data-testid={`ic-decide-${decision}-${deal.id}`}
                  onClick={() => onChoose(decision)}
                >
                  {t(decision)}
                </Button>
              ))
            )}
          </div>
        </>
      ) : (
        <p className="text-text-secondary mt-4 text-xs leading-snug italic">
          {t("pending")}
        </p>
      )}
    </div>
  );
}

// ─────────────────────────────── brief line ───────────────────────────────

function BriefLine({
  row,
  metrics,
  locale,
}: {
  row: BriefRow;
  metrics: IcMetrics;
  locale: Lang;
}) {
  const t = useTranslations("ic.decision");
  const Icon = TONE_ICON[row.tone];
  const values: Record<string, string> = {
    hurdle: formatPercent(metrics.hurdle, locale, { decimals: 0 }),
    bps: westernNumber(Number(row.values.bps ?? 0), locale),
    score: westernNumber(metrics.riskScore, locale, 1),
  };
  return (
    <li className="flex items-start gap-2 text-[0.8125rem] leading-snug">
      <Icon
        className={`mt-0.5 size-4 shrink-0 ${TONE_TEXT[row.tone]}`}
        aria-hidden="true"
      />
      <span className="text-text">{t(rowMessageKey(row), values)}</span>
    </li>
  );
}

// ───────────────────────────── material row ─────────────────────────────

/**
 * One item on the committee's table: open/download the material itself, or the
 * sparkle, seed the advisory chat with a grounded question about it (the same
 * prefill bus the ⌘K palette uses; the committee reviews before sending).
 */
function MaterialRow({
  icon,
  tile,
  name,
  onOpen,
  downloadHref,
  ask,
}: {
  icon: React.ReactNode;
  tile: string;
  name: string;
  onOpen?: () => void;
  downloadHref?: string;
  ask: { label: string; question: string };
}) {
  const t = useTranslations("ic.decision");

  const body = (
    <>
      <span
        className={`rounded-btn grid size-7 shrink-0 place-items-center ${tile}`}
      >
        {icon}
      </span>
      <span className="text-navy min-w-0 truncate text-[0.8125rem] font-semibold">
        {name}
      </span>
      {downloadHref && (
        <Download
          className="text-text-secondary size-3.5 shrink-0"
          aria-hidden="true"
        />
      )}
    </>
  );

  return (
    <div className="group flex items-center gap-2">
      {downloadHref ? (
        <a
          href={downloadHref}
          download
          className="hover:bg-navy-50 focus-visible:ring-accent focus-visible:ring-offset-card rounded-btn flex min-w-0 flex-1 items-center gap-2.5 px-1.5 py-1 transition-colors duration-[var(--duration-fast)] ease-[var(--ease)] outline-none focus-visible:ring-2 focus-visible:ring-offset-1"
        >
          {body}
        </a>
      ) : (
        <button
          type="button"
          onClick={onOpen}
          className="hover:bg-navy-50 focus-visible:ring-accent focus-visible:ring-offset-card rounded-btn flex min-w-0 flex-1 items-center gap-2.5 px-1.5 py-1 text-start transition-colors duration-[var(--duration-fast)] ease-[var(--ease)] outline-none focus-visible:ring-2 focus-visible:ring-offset-1"
        >
          {body}
        </button>
      )}
      <button
        type="button"
        title={ask.label}
        aria-label={ask.label}
        onClick={() =>
          publishGoldenSelection({
            context: { kind: "ic" },
            text: ask.question,
          })
        }
        className="bg-accent-50 text-accent-700 hover:bg-accent-100 focus-visible:ring-accent focus-visible:ring-offset-card rounded-pill flex shrink-0 items-center gap-1 px-2 py-1 text-[0.6875rem] font-semibold transition-colors duration-[var(--duration-fast)] ease-[var(--ease)] outline-none focus-visible:ring-2 focus-visible:ring-offset-1"
      >
        <Sparkles className="size-3" aria-hidden="true" />
        {t("ask")}
      </button>
    </div>
  );
}
