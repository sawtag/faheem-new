"use client";

import * as React from "react";

/**
 * Minimal answer-prose renderer for the analyst register the demo authors:
 * `**bold**` lead-ins, `## ` sub-heads, `- ` bullet lists, blank-line
 * paragraphs, and inline `[[n]]` citation markers (delegated to
 * `renderCitation`). Deliberately small — the corpus of markdown is ours, so a
 * full markdown engine would be dead weight (AGENTS.md rule 6).
 */
type RenderCitation = (n: number) => React.ReactNode;

function renderInline(
  text: string,
  renderCitation: RenderCitation,
): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const re = /\*\*([^*]+)\*\*|\[\[(\d+)\]\]/g;
  let last = 0;
  let i = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    if (m[1] !== undefined) {
      nodes.push(
        <strong key={`b${i}`} className="text-navy font-bold">
          {m[1]}
        </strong>,
      );
    } else if (m[2] !== undefined) {
      nodes.push(
        <React.Fragment key={`c${i}`}>
          {renderCitation(Number(m[2]))}
        </React.Fragment>,
      );
    }
    last = re.lastIndex;
    i += 1;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

export function Markdown({
  text,
  renderCitation,
}: {
  text: string;
  renderCitation: RenderCitation;
}) {
  const blocks: React.ReactNode[] = [];
  let list: string[] = [];
  let key = 0;

  const flushList = () => {
    if (list.length === 0) return;
    const items = list;
    blocks.push(
      <ul
        key={`ul${key++}`}
        className="marker:text-navy-300 my-2.5 list-disc space-y-1.5 ps-5"
      >
        {items.map((li, idx) => (
          <li key={idx} className="ps-1">
            {renderInline(li, renderCitation)}
          </li>
        ))}
      </ul>,
    );
    list = [];
  };

  for (const raw of text.split("\n")) {
    const line = raw.trimEnd();
    if (/^\s*[-*]\s+/.test(line)) {
      list.push(line.replace(/^\s*[-*]\s+/, ""));
      continue;
    }
    flushList();
    if (line.trim() === "") continue;
    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    if (heading) {
      blocks.push(
        <p
          key={`h${key++}`}
          className="text-navy mt-4 mb-1 text-[1.0625rem] font-bold"
        >
          {renderInline(heading[2] ?? "", renderCitation)}
        </p>,
      );
      continue;
    }
    blocks.push(
      <p key={`p${key++}`} className="my-2.5">
        {renderInline(line, renderCitation)}
      </p>,
    );
  }
  flushList();

  return <>{blocks}</>;
}
