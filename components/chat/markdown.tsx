"use client";

import * as React from "react";
import { AnswerTable } from "@/components/chat/answer-table";
import { isTableStart, parseMarkdownTable } from "@/lib/chart-data";

/**
 * Minimal answer-prose renderer for the analyst register the demo authors:
 * `**bold**` lead-ins, `## ` sub-heads, `- ` bullet lists, blank-line
 * paragraphs, GitHub-style `|` tables (delegated to `AnswerTable`), and inline
 * `[[n]]` citation markers (delegated to `renderCitation`). Deliberately small,
 * the corpus of markdown is ours, so a full markdown engine would be dead
 * weight (AGENTS.md rule 6).
 */
type RenderCitation = (n: number) => React.ReactNode;

/** Inline `**bold**` + `[[n]]` chips. `strongClass` lets table cells keep the
 *  row's colour (danger tint on delta cells) instead of forcing navy. */
export function renderInline(
  text: string,
  renderCitation: RenderCitation,
  strongClass = "text-navy font-bold",
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
        <strong key={`b${i}`} className={strongClass}>
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
  streaming = false,
}: {
  text: string;
  renderCitation: RenderCitation;
  streaming?: boolean;
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

  const lines = text.split("\n");
  let i = 0;
  while (i < lines.length) {
    const line = lines[i]!.trimEnd();

    // GitHub-style table: a pipe row immediately followed by a `---` divider.
    if (line.includes("|") && isTableStart(line, lines[i + 1])) {
      const block: string[] = [];
      let j = i;
      while (
        j < lines.length &&
        lines[j]!.includes("|") &&
        lines[j]!.trim() !== ""
      ) {
        block.push(lines[j]!);
        j += 1;
      }
      const parsed = parseMarkdownTable(block);
      if (parsed && !parsed.malformed) {
        flushList();
        blocks.push(
          <AnswerTable
            key={`t${key++}`}
            table={parsed}
            renderCell={(cell) =>
              renderInline(cell, renderCitation, "font-semibold")
            }
            streaming={streaming}
          />,
        );
        i = j;
        continue;
      }
      // malformed / still-streaming → fall through, render lines as prose
    }

    if (/^\s*[-*]\s+/.test(line)) {
      list.push(line.replace(/^\s*[-*]\s+/, ""));
      i += 1;
      continue;
    }
    flushList();
    if (line.trim() === "") {
      i += 1;
      continue;
    }
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
      i += 1;
      continue;
    }
    blocks.push(
      <p key={`p${key++}`} className="my-2.5">
        {renderInline(line, renderCitation)}
      </p>,
    );
    i += 1;
  }
  flushList();

  return <>{blocks}</>;
}
