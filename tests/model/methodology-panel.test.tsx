import * as React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { renderToString } from "katex";
import en from "@/messages/en.json";
import ar from "@/messages/ar.json";
import { BASE_ASSUMPTIONS, RATIONALE, buildModel } from "@/lib/model/compute";
import { FORMULAS } from "@/lib/model/formulas";
import { MethodologyPanel } from "@/components/model/methodology-panel";
import type { ModelKey } from "@/lib/model/types";

const { nodes } = buildModel(BASE_ASSUMPTIONS);

function renderPanel(
  props: Partial<React.ComponentProps<typeof MethodologyPanel>> & {
    nodeKey: ModelKey;
  },
  locale: "en" | "ar" = "en",
) {
  const messages = locale === "en" ? en : ar;
  return render(
    <NextIntlClientProvider locale={locale} messages={messages}>
      <MethodologyPanel nodes={nodes} {...props} />
    </NextIntlClientProvider>,
  );
}

describe("MethodologyPanel — computed node", () => {
  it("renders the explainer, the KaTeX formula, and one chip per input", () => {
    renderPanel({ nodeKey: "wacc" });

    // explainer paragraph, from FORMULAS['wacc'].explainerKey
    expect(
      screen.getByText(en.model.formulas.wacc as string),
    ).toBeInTheDocument();

    // formula rendered via KaTeX (Formula sets role="img")
    expect(
      screen.getByRole("img", { name: FORMULAS.wacc!.katex }),
    ).toBeInTheDocument();

    // wacc's provenance.inputs = ["we", "ke", "wd", "kdAfter"] — one chip each
    const waccNode = nodes.wacc!;
    if (waccNode.provenance.kind !== "computed")
      throw new Error("expected computed");
    const inputLabels: Record<string, string> = {
      we: "Weight of equity",
      ke: "Cost of equity",
      wd: "Weight of debt",
      kdAfter: "Cost of debt — after-tax",
    };
    expect(waccNode.provenance.inputs).toEqual(Object.keys(inputLabels));
    for (const label of Object.values(inputLabels)) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it("navigates to an input's own provenance when its chip is clicked", async () => {
    const onNavigate = vi.fn();
    renderPanel({ nodeKey: "wacc", onNavigate });

    await userEvent.click(screen.getByText("Weight of equity"));

    expect(onNavigate).toHaveBeenCalledWith("we");
    // the panel now renders "we"'s own node — its curated label appears as
    // the current heading, and a breadcrumb trail back to wacc is visible.
    expect(screen.getAllByText("Weight of equity").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "WACC" })).toBeInTheDocument();
  });
});

describe("MethodologyPanel — sourced node", () => {
  it("shows the doc + page and fires onOpenSource with docId/page", async () => {
    const onOpenSource = vi.fn();
    renderPanel({ nodeKey: "rf", onOpenSource });

    // rf → { kind: "sourced", docId: "market-data-comps", page: 2 }
    expect(
      screen.getByText("Market Data & Comparables Snapshot"),
    ).toBeInTheDocument();
    expect(screen.getByText("p.2")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Open source" }));
    expect(onOpenSource).toHaveBeenCalledWith("market-data-comps", 2);
  });
});

describe("MethodologyPanel — assumption node", () => {
  it("shows the value, the analyst-assumption badge, and the rationale text", () => {
    renderPanel({ nodeKey: "assumptions.g" });

    expect(screen.getByText("Analyst assumption")).toBeInTheDocument();
    // model.rationale.g is authored EN, verbatim-ish to RATIONALE.g (compute.ts)
    // — same substance, house-style capitalization/spelling.
    expect(
      screen.getByText(/long-run nominal terminal growth/i),
    ).toBeInTheDocument();
  });
});

describe("FORMULAS registry — message + KaTeX integrity", () => {
  it("every formula id has a non-empty explainer message in en AND ar", () => {
    for (const id of Object.keys(FORMULAS)) {
      const enMsg = (en.model.formulas as Record<string, string>)[id];
      const arMsg = (ar.model.formulas as Record<string, string>)[id];
      expect(enMsg?.trim().length ?? 0, `en: ${id}`).toBeGreaterThan(0);
      expect(arMsg?.trim().length ?? 0, `ar: ${id}`).toBeGreaterThan(0);
    }
  });

  it("KaTeX renders every FORMULAS katex string without throwing", () => {
    for (const [id, def] of Object.entries(FORMULAS)) {
      expect(
        () =>
          renderToString(def.katex, { throwOnError: true, displayMode: true }),
        id,
      ).not.toThrow();
    }
  });
});

describe("RATIONALE registry — message integrity", () => {
  it("every rationale key has a message in en AND ar", () => {
    for (const key of Object.keys(RATIONALE)) {
      const enMsg = (en.model.rationale as Record<string, string>)[key];
      const arMsg = (ar.model.rationale as Record<string, string>)[key];
      expect(enMsg?.trim().length ?? 0, `en: ${key}`).toBeGreaterThan(0);
      expect(arMsg?.trim().length ?? 0, `ar: ${key}`).toBeGreaterThan(0);
    }
  });
});

describe("RTL", () => {
  it("renders under the ar locale without leaking raw i18n keys", () => {
    const { container } = renderPanel({ nodeKey: "wacc" }, "ar");
    expect(container.textContent).not.toMatch(/model\.[a-zA-Z.]+/);
  });

  it("renders a sourced and an assumption node under ar without leaking keys", () => {
    const sourced = renderPanel({ nodeKey: "rf" }, "ar");
    expect(sourced.container.textContent).not.toMatch(/model\.[a-zA-Z.]+/);
    sourced.unmount();

    const assumption = renderPanel({ nodeKey: "assumptions.g" }, "ar");
    expect(assumption.container.textContent).not.toMatch(/model\.[a-zA-Z.]+/);
  });

  it("renders indexed/pattern-labeled nodes under ar without leaking keys", () => {
    // netRev.4 / base.perShare exercise the pattern-based label fallback
    // (not a curated exact `model.nodes.<key>` message) — this is the RTL
    // sweep's most important negative case.
    for (const key of [
      "netRev.4",
      "base.perShare",
      "assumptions.riskWeights.2",
    ]) {
      const { container, unmount } = renderPanel({ nodeKey: key }, "ar");
      expect(container.textContent, key).not.toMatch(/model\.[a-zA-Z.]+/);
      unmount();
    }
  });
});
