"use client";

import * as React from "react";
import { renderToString } from "katex";
import "katex/dist/katex.min.css";

/**
 * KaTeX-rendered formula (display mode). Formula source is the vetted
 * FORMULAS registry (lib/model/formulas.ts), never user input, so the
 * generated markup is trusted. Numeric-LTR convention (AGENTS.md /
 * spec §7): the formula body stays LTR even under the Arabic locale, only
 * surrounding chrome flips.
 */
export function Formula({ tex }: { tex: string }) {
  const html = React.useMemo(() => {
    try {
      return renderToString(tex, { throwOnError: false, displayMode: true });
    } catch {
      return tex;
    }
  }, [tex]);

  return (
    <div
      dir="ltr"
      role="img"
      aria-label={tex}
      className="financial text-navy overflow-x-auto py-1 text-start text-[0.95rem] [&_.katex-display]:my-0"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
