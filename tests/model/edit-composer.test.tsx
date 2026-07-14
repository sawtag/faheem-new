import * as React from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import { LiveModel } from "@/components/model/live-model";

/**
 * WS-C acceptance — the conversational edit composer on the Live Model.
 * /api/model-edit is mocked at the fetch boundary (zero network); reduced
 * motion is forced so the choreography clock collapses and value assertions
 * are deterministic.
 */

beforeAll(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: query.includes("prefers-reduced-motion"),
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }),
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const NAME = { en: "Jahez", ar: "جاهز" };

function renderModel() {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <LiveModel companyId="jahez" companyName={NAME} />
    </NextIntlClientProvider>,
  );
}

function cell(container: HTMLElement, key: string): HTMLElement {
  const el = container.querySelector<HTMLElement>(`[data-node-key="${key}"]`);
  if (!el) throw new Error(`no cell for ${key}`);
  return el;
}

function stubEditApi(payload: unknown) {
  const fetchMock = vi.fn(async () => ({
    ok: true,
    json: async () => payload,
  }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("EditComposer — admitted edit", () => {
  it("chip submit → choreography stages in order → value applied at Valuation → recommendation", async () => {
    const fetchMock = stubEditApi({
      kind: "edit",
      assumptionKey: "ordersGrowth.0",
      value: 0.2,
      summary: "ok",
    });
    const user = userEvent.setup();
    const { container } = renderModel();

    expect(cell(container, "base.perShare").textContent).toContain("14.36");

    await user.click(screen.getByTestId("edit-chip-growth"));

    // the POST carried the instruction + lang + assumptions
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const body = JSON.parse(
      (fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1]
        .body as string,
    ) as { instruction: string; lang: string; assumptions: unknown };
    expect(body.instruction).toBe(en.model.edit.chips.growth);
    expect(body.lang).toBe("en");
    expect(body.assumptions).toBeTruthy();

    // choreography completes: recommendation line lands (Writing done)
    await screen.findByTestId("edit-recommendation");
    expect(screen.getByTestId("edit-composer-input")).toHaveValue("");

    // stages rendered in the team order; compliance visibly skipped for a
    // non-debt/zakat edit
    const stages = [
      ...container.querySelectorAll('[data-testid^="edit-stage-"]'),
    ].map((el) => el.getAttribute("data-testid"));
    expect(stages).toEqual([
      "edit-stage-valuation",
      "edit-stage-critical-review",
      "edit-stage-compliance",
      "edit-stage-writing",
    ]);
    expect(
      screen.getByTestId("edit-stage-compliance").getAttribute("data-status"),
    ).toBe("skipped");
    expect(
      screen.getByTestId("edit-stage-valuation").getAttribute("data-status"),
    ).toBe("done");

    // the value actually applied — outputs moved off base
    await waitFor(() => {
      expect(cell(container, "base.perShare").textContent).not.toContain(
        "14.36",
      );
    });
    expect(cell(container, "assumptions.ordersGrowth.0").textContent).toContain(
      "20.0",
    );

    // the recommendation is computed from the NEW outputs (house formatters)
    const rec = screen.getByTestId("edit-recommendation").textContent!;
    expect(rec).toMatch(/SAR/);
    expect(rec).toMatch(/%/);
  });

  it("a zakat edit runs the Compliance re-check (not skipped)", async () => {
    stubEditApi({
      kind: "edit",
      assumptionKey: "zakat",
      value: 0.02,
      summary: "ok",
    });
    const user = userEvent.setup();
    renderModel();

    await user.click(screen.getByTestId("edit-composer-input"));
    await user.keyboard("set zakat to 2%{Enter}");

    await screen.findByTestId("edit-recommendation");
    expect(screen.getByTestId("edit-composer-input")).toHaveValue("");
    expect(
      screen.getByTestId("edit-stage-compliance").getAttribute("data-status"),
    ).toBe("done");
  });

  it("a probability edit applies the rebalance companions too", async () => {
    stubEditApi({
      kind: "edit",
      assumptionKey: "probBull",
      value: 0.4,
      also: [
        { assumptionKey: "probBase", value: 0.4 },
        { assumptionKey: "probBear", value: 0.2 },
      ],
      summary: "ok",
    });
    const user = userEvent.setup();
    const { container } = renderModel();

    await user.click(screen.getByTestId("edit-composer-input"));
    await user.keyboard("set the bull probability to 40%{Enter}");
    await screen.findByTestId("edit-recommendation");

    expect(cell(container, "assumptions.probBull").textContent).toContain(
      "40.0",
    );
    expect(cell(container, "assumptions.probBase").textContent).toContain(
      "40.0",
    );
    expect(cell(container, "assumptions.probBear").textContent).toContain(
      "20.0",
    );
  });
});

describe("EditComposer — source-locked", () => {
  it("locked chip → Critical Review flags the lock → bilingual message, model unchanged", async () => {
    stubEditApi({
      kind: "source-locked",
      target: "revenue",
      summary: "locked",
    });
    const user = userEvent.setup();
    const { container } = renderModel();

    const before = cell(container, "base.perShare").textContent;
    await user.click(screen.getByTestId("edit-chip-locked"));

    await screen.findByTestId("edit-source-locked");
    expect(screen.getByTestId("edit-source-locked").textContent).toContain(
      en.model.edit.sourceLocked,
    );

    // choreography ran Valuation → Critical Review (flagged); no compliance/writing
    expect(
      screen
        .getByTestId("edit-stage-critical-review")
        .getAttribute("data-status"),
    ).toBe("flagged");
    expect(screen.queryByTestId("edit-stage-writing")).toBeNull();

    // the model did NOT move
    expect(cell(container, "base.perShare").textContent).toBe(before);
    expect(screen.queryByTestId("edit-recommendation")).toBeNull();
  });
});

describe("EditComposer — unparsed", () => {
  it("shows the gentle hint and leaves the model untouched", async () => {
    stubEditApi({ kind: "unparsed", summary: "nope" });
    const user = userEvent.setup();
    const { container } = renderModel();

    const before = cell(container, "base.perShare").textContent;
    await user.click(screen.getByTestId("edit-composer-input"));
    await user.keyboard("do a barrel roll{Enter}");

    await screen.findByTestId("edit-unparsed");
    expect(screen.queryByTestId("edit-choreography")).toBeNull();
    expect(cell(container, "base.perShare").textContent).toBe(before);
    expect(screen.getByTestId("edit-composer-input")).toHaveValue(
      "do a barrel roll",
    );
  });

  it("aborts a stalled request, restores the submit control, and retains the instruction", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn(
      (_url: string | URL | Request, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"));
          });
        }),
    );
    vi.stubGlobal("fetch", fetchMock);
    renderModel();

    const input = screen.getByTestId("edit-composer-input");
    const instruction = "raise terminal growth to 3.5%";
    fireEvent.change(input, { target: { value: instruction } });
    fireEvent.submit(input.closest("form")!);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });

    expect(screen.getByTestId("edit-unparsed")).toBeInTheDocument();
    expect(input).toHaveValue(instruction);
    expect(
      screen.getByRole("button", { name: en.model.edit.submit }),
    ).toBeEnabled();
    const [, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(init.signal?.aborted).toBe(true);
  });
});
