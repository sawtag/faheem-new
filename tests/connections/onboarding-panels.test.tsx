import * as React from "react";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { act, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import { AssemblePanel } from "@/components/connections/onboarding/assemble-panel";
import { CompletePanel } from "@/components/connections/onboarding/complete-panel";
import manifest from "@/data/corpus/manifest.json";
import { AGENTS } from "@/lib/ai/agents";

/**
 * Task E: guards the "never invent a number" rule (AGENTS.md rule 5) for the
 * assemble/complete beat, the derived counts (documents, pages, agents) must
 * equal the real sums from data/corpus/manifest.json and lib/ai/agents.ts,
 * not a hardcoded figure. Reduced motion is forced so the choreography
 * collapses to its end state and CountUp renders the final value immediately
 * (same technique as tests/model/edit-composer.test.tsx).
 */

const DOC_COUNT = manifest.length;
const PAGE_COUNT = manifest.reduce((sum, doc) => sum + doc.pages, 0);
const AGENT_COUNT = AGENTS.length;

// This jsdom build ships no Storage (tests/chat/chat-persistence.test.ts), so
// polyfill an in-memory localStorage, exactly what complete-panel.tsx writes
// through to on mount.
function installMemoryLocalStorage(): void {
  const store = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => void store.set(k, String(v)),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
    key: (i: number) => [...store.keys()][i] ?? null,
    get length() {
      return store.size;
    },
  });
}

beforeEach(installMemoryLocalStorage);

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
  vi.unstubAllGlobals();
});

function withIntl(node: React.ReactNode) {
  return (
    <NextIntlClientProvider locale="en" messages={en}>
      {node}
    </NextIntlClientProvider>
  );
}

describe("AssemblePanel", () => {
  it("real data sanity: the corpus has more than one document and each carries a positive page count", () => {
    // guards against a future empty/malformed manifest silently zeroing DOC_COUNT/PAGE_COUNT
    expect(manifest.length).toBeGreaterThan(0);
    for (const doc of manifest) {
      expect(doc.pages).toBeGreaterThan(0);
    }
    expect(AGENTS.length).toBeGreaterThan(0);
  });

  it("indexing stage reports the real document and page counts, never a hardcoded figure", async () => {
    const onDone = vi.fn();
    render(
      withIntl(
        <AssemblePanel
          docs={DOC_COUNT}
          pages={PAGE_COUNT}
          agents={AGENT_COUNT}
          onDone={onDone}
        />,
      ),
    );

    expect(
      screen.getByText(
        `Indexing ${DOC_COUNT} documents (${PAGE_COUNT} pages) from your connected sources`,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(`Activating ${AGENT_COUNT} specialist agents`),
    ).toBeInTheDocument();
  });

  it("reduced motion jumps straight to onDone", async () => {
    const onDone = vi.fn();
    render(
      withIntl(
        <AssemblePanel
          docs={DOC_COUNT}
          pages={PAGE_COUNT}
          agents={AGENT_COUNT}
          onDone={onDone}
        />,
      ),
    );

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});

describe("CompletePanel", () => {
  it("renders the four workspace stats from real data (systems, docs, pages, agents)", () => {
    render(
      withIntl(
        <CompletePanel
          systems={7}
          docs={DOC_COUNT}
          pages={PAGE_COUNT}
          agents={AGENT_COUNT}
        />,
      ),
    );

    expect(screen.getByText("7")).toBeInTheDocument();
    expect(screen.getByText(String(DOC_COUNT))).toBeInTheDocument();
    expect(screen.getByText(String(PAGE_COUNT))).toBeInTheDocument();
    expect(screen.getByText(String(AGENT_COUNT))).toBeInTheDocument();
    expect(screen.getByText("Systems connected")).toBeInTheDocument();
    expect(screen.getByText("Documents indexed")).toBeInTheDocument();
    expect(screen.getByText("Pages indexed")).toBeInTheDocument();
    expect(screen.getByText("Agents active")).toBeInTheDocument();
  });

  it("marks the workspace onboarded in localStorage on mount", () => {
    render(
      withIntl(
        <CompletePanel
          systems={7}
          docs={DOC_COUNT}
          pages={PAGE_COUNT}
          agents={AGENT_COUNT}
        />,
      ),
    );

    expect(localStorage.getItem("faheem_onboarding_done")).toBe("1");
  });
});
