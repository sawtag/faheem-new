"use client";

import * as React from "react";
import { Markdown } from "@/components/chat/markdown";
import { CitationChip } from "@/components/chat/citation-chip";
import { citationMap, type CitationRef } from "@/components/chat/reduce";

/**
 * Renders a streamed/seeded analyst answer: prose (16px/1.7, bold sub-heads,
 * tight bullets, tabular financial figures) with inline `[[n]]` markers swapped
 * for numbered CitationChips. While streaming, a trailing half-formed marker is
 * held back so `[[` never flashes before its number arrives.
 */
export function MessageStream({
  text,
  citations,
  streaming = false,
  onOpenDoc,
}: {
  text: string;
  citations: CitationRef[];
  streaming?: boolean;
  onOpenDoc?: (docId: string, page: number) => void;
}) {
  const map = React.useMemo(() => citationMap(citations), [citations]);
  const renderCitation = React.useCallback(
    (n: number) => (
      <CitationChip n={n} citation={map.get(n)} onOpen={onOpenDoc} />
    ),
    [map, onOpenDoc],
  );

  const display = streaming ? text.replace(/\[\[\d*$/, "") : text;

  return (
    <div className="financial text-text text-base leading-[1.7] [&_p:first-child]:mt-0 [&_p:last-child]:mb-0">
      <Markdown
        text={display}
        renderCitation={renderCitation}
        streaming={streaming}
      />
    </div>
  );
}
