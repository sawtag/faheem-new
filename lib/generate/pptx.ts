/**
 * Jahez board deck, the Lunar-branded PowerPoint deliverable (§11 "Board deck
 * (PPTX) ~8 slides").
 *
 * ① thesis-on-a-page ② market map ③ unit-economics bridge ④ valuation football
 * field ⑤ scenario IRRs vs the 15% hurdle ⑥ risk matrix ⑦ mandate fit
 * ⑧ recommendation. 16:9, one Lunar-branded slide master (charcoal band, gold
 * rule, serif titles, "Prepared by Faheem for Lunar Investments" footer +
 * page number on every slide).
 *
 * Titles/subtitles/commentary come from `data/narratives.json`, resolved via
 * `resolveNarrativeTree()` against `buildNarrativeFacts(computeModel())`, the
 * same fact bag the IC memo uses, so the deck can never disagree with the memo
 * or the workbook (AGENTS.md rule 5). Every chart on the data slides (unit-
 * economics bridge, football field, scenario bars, risk grid) is drawn with
 * native pptxgenjs shapes from `ModelResult` directly, no invented figures,
 * no chart-library guesswork.
 */
import PptxGenJS from "pptxgenjs";
import {
  buildNarrativeFacts,
  fact,
  formatModelInputValue,
  loadModelInputs,
  loadNarratives,
  lunarBrand as B,
  resolveNarrativeTree,
  riskRegister,
  type NarrativeFacts,
} from "@/lib/generate/shared";
import { computeModel } from "@/lib/model/compute";
import type { ModelResult } from "@/lib/model/types";

// ════════════════════════════ narrative shapes ══════════════════════════════
interface DeckPillar {
  title: string;
  body: string;
}
interface Slide1N {
  title: string;
  subtitle: string;
  recommendationLine: string;
  pillars: DeckPillar[];
  footnote: string;
}
interface Player {
  name: string;
  note: string;
}
interface Slide2N {
  title: string;
  subtitle: string;
  players: Player[];
  footnote: string;
}
interface SlidePlainN {
  title: string;
  subtitle: string;
  footnote: string;
}
interface Slide8N {
  title: string;
  recommendationLine: string;
  adviceLine: string;
  footnote: string;
}
interface DeckNarratives {
  slide1: Slide1N;
  slide2: Slide2N;
  slide3: SlidePlainN;
  slide4: SlidePlainN;
  slide5: SlidePlainN;
  slide6: SlidePlainN;
  slide7: SlidePlainN;
  slide8: Slide8N;
}

// ═══════════════════════════════ layout constants ═══════════════════════════
const MASTER = "LUNAR_MASTER";
const SLIDE_W = 13.33;
const SLIDE_H = 7.5;
const CONTENT_X = 0.5;
const CONTENT_W = SLIDE_W - 1.0;

function defineMaster(pptx: PptxGenJS): void {
  pptx.defineSlideMaster({
    title: MASTER,
    background: { color: B.paper },
    objects: [
      { rect: { x: 0, y: 0, w: "100%", h: 1.02, fill: { color: B.charcoal } } },
      { rect: { x: 0, y: 1.02, w: "100%", h: 0.035, fill: { color: B.gold } } },
      {
        text: {
          text: "LUNAR INVESTMENTS",
          options: {
            x: SLIDE_W - 3.3,
            y: 0.15,
            w: 2.9,
            h: 0.3,
            fontFace: B.sans,
            fontSize: 9,
            bold: true,
            color: B.cream,
            align: "right",
          },
        },
      },
      {
        line: {
          x: CONTENT_X,
          y: SLIDE_H - 0.42,
          w: CONTENT_W,
          h: 0,
          line: { color: B.border, width: 0.75 },
        },
      },
      {
        text: {
          text: "Prepared by Faheem for Lunar Investments, Advisory only. Not investment advice.",
          options: {
            x: CONTENT_X,
            y: SLIDE_H - 0.38,
            w: 10.5,
            h: 0.28,
            fontFace: B.sans,
            fontSize: 7.5,
            italic: true,
            color: B.inkMuted,
          },
        },
      },
    ],
    slideNumber: {
      x: SLIDE_W - 0.7,
      y: SLIDE_H - 0.38,
      w: 0.5,
      h: 0.28,
      fontFace: B.sans,
      fontSize: 7.5,
      color: B.inkMuted,
    },
  });
}

function addTitle(
  slide: PptxGenJS.Slide,
  title: string,
  subtitle?: string,
): void {
  slide.addText(title, {
    x: CONTENT_X,
    y: 0.14,
    w: SLIDE_W - 3.6,
    h: 0.58,
    fontFace: B.serif,
    fontSize: 23,
    bold: true,
    color: B.cream,
    align: "left",
    valign: "middle",
  });
  if (subtitle) {
    slide.addText(subtitle, {
      x: CONTENT_X,
      y: 0.68,
      w: SLIDE_W - 1.0,
      h: 0.3,
      fontFace: B.sans,
      fontSize: 11.5,
      italic: true,
      color: B.goldLight,
      align: "left",
    });
  }
}

function addFootnote(slide: PptxGenJS.Slide, text: string): void {
  slide.addText(text, {
    x: CONTENT_X,
    y: SLIDE_H - 0.82,
    w: CONTENT_W,
    h: 0.3,
    fontFace: B.sans,
    fontSize: 8,
    italic: true,
    color: B.inkMuted,
    align: "left",
  });
}

// ═════════════════════════════════ slide 1 ══════════════════════════════════
function buildSlide1(pptx: PptxGenJS, n: Slide1N): void {
  const slide = pptx.addSlide({ masterName: MASTER });
  addTitle(slide, n.title, n.subtitle);

  slide.addShape(pptx.ShapeType.rect, {
    x: CONTENT_X,
    y: 1.3,
    w: CONTENT_W,
    h: 0.58,
    fill: { color: B.goldPale },
    line: { color: B.gold, width: 1 },
  });
  slide.addText(n.recommendationLine, {
    x: CONTENT_X + 0.15,
    y: 1.3,
    w: CONTENT_W - 0.3,
    h: 0.58,
    fontFace: B.sans,
    fontSize: 12.5,
    bold: true,
    color: B.charcoal,
    valign: "middle",
    align: "center",
  });

  const gap = 0.32;
  const cardW = (CONTENT_W - gap * 2) / 3;
  const y = 2.2;
  const h = 4.0;
  n.pillars.forEach((p, i) => {
    const x = CONTENT_X + i * (cardW + gap);
    slide.addShape(pptx.ShapeType.rect, {
      x,
      y,
      w: 0.06,
      h,
      fill: { color: B.gold },
    });
    slide.addShape(pptx.ShapeType.rect, {
      x: x + 0.06,
      y,
      w: cardW - 0.06,
      h,
      fill: { color: B.white },
      line: { color: B.border, width: 0.75 },
    });
    slide.addText(p.title, {
      x: x + 0.28,
      y: y + 0.22,
      w: cardW - 0.56,
      h: 0.95,
      fontFace: B.serif,
      fontSize: 14,
      bold: true,
      color: B.charcoal,
      valign: "top",
    });
    slide.addText(p.body, {
      x: x + 0.28,
      y: y + 1.2,
      w: cardW - 0.56,
      h: h - 1.45,
      fontFace: B.sans,
      fontSize: 10.5,
      color: B.ink,
      valign: "top",
      lineSpacingMultiple: 1.18,
    });
  });

  addFootnote(slide, n.footnote);
}

// ═════════════════════════════════ slide 2 ══════════════════════════════════
function buildSlide2(pptx: PptxGenJS, n: Slide2N): void {
  const slide = pptx.addSlide({ masterName: MASTER });
  addTitle(slide, n.title, n.subtitle);

  const cols = 2;
  const gap = 0.4;
  const cardW = (CONTENT_W - gap) / cols;
  const cardH = 2.15;
  n.players.forEach((p, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = CONTENT_X + col * (cardW + gap);
    const y = 1.55 + row * (cardH + 0.35);
    const isJahez = i === 0;
    slide.addShape(pptx.ShapeType.roundRect, {
      x,
      y,
      w: cardW,
      h: cardH,
      rectRadius: 0.06,
      fill: { color: isJahez ? B.goldPale : B.white },
      line: { color: isJahez ? B.gold : B.border, width: isJahez ? 1.5 : 0.75 },
    });
    slide.addText(p.name, {
      x: x + 0.28,
      y: y + 0.2,
      w: cardW - 0.56,
      h: 0.5,
      fontFace: B.serif,
      fontSize: 15,
      bold: true,
      color: B.charcoal,
    });
    slide.addText(p.note, {
      x: x + 0.28,
      y: y + 0.78,
      w: cardW - 0.56,
      h: cardH - 1.0,
      fontFace: B.sans,
      fontSize: 10.5,
      color: B.ink,
      valign: "top",
    });
  });

  addFootnote(slide, n.footnote);
}

// ═════════════════════════════════ slide 3 ══════════════════════════════════
function buildSlide3(pptx: PptxGenJS, n: SlidePlainN): void {
  const slide = pptx.addSlide({ masterName: MASTER });
  addTitle(slide, n.title, n.subtitle);

  const inputs = loadModelInputs();
  const boxes = [
    {
      label: "Orders",
      value: formatModelInputValue(inputs.get("fy25.orders")!),
    },
    { label: "GMV", value: formatModelInputValue(inputs.get("fy25.gmv")!) },
    {
      label: "Net revenue",
      value: formatModelInputValue(inputs.get("fy25.net_revenue")!),
    },
    {
      label: "Adj. EBITDA",
      value: formatModelInputValue(inputs.get("fy25.adj_ebitda")!),
    },
  ];
  const connectors = [
    `x AOV ${formatModelInputValue(inputs.get("fy25.aov")!)}`,
    `take rate ${formatModelInputValue(inputs.get("fy25.take_rate")!)}`,
    `EBITDA margin ${formatModelInputValue(inputs.get("fy25.adj_ebitda_margin")!)}`,
  ];

  const gap = 0.55;
  const boxW = (CONTENT_W - gap * (boxes.length - 1)) / boxes.length;
  const y = 3.0;
  const boxH = 1.5;
  boxes.forEach((b, i) => {
    const x = CONTENT_X + i * (boxW + gap);
    slide.addShape(pptx.ShapeType.roundRect, {
      x,
      y,
      w: boxW,
      h: boxH,
      rectRadius: 0.05,
      fill: { color: B.charcoal },
      line: { color: B.gold, width: 1 },
    });
    slide.addText(b.label, {
      x,
      y: y + 0.18,
      w: boxW,
      h: 0.4,
      align: "center",
      fontFace: B.sans,
      fontSize: 11,
      color: B.goldLight,
      bold: true,
    });
    slide.addText(b.value, {
      x,
      y: y + 0.6,
      w: boxW,
      h: 0.72,
      align: "center",
      valign: "middle",
      fontFace: B.serif,
      fontSize: 16,
      bold: true,
      color: B.cream,
    });
    if (i < boxes.length - 1) {
      const cx = x + boxW;
      slide.addText("→", {
        x: cx,
        y: y + 0.42,
        w: gap,
        h: 0.6,
        align: "center",
        fontFace: B.sans,
        fontSize: 22,
        color: B.gold,
        bold: true,
      });
      slide.addText(connectors[i]!, {
        x: cx - 0.5,
        y: y - 0.42,
        w: gap + 1.0,
        h: 0.38,
        align: "center",
        fontFace: B.sans,
        fontSize: 9.5,
        italic: true,
        color: B.charcoalMid,
      });
    }
  });

  addFootnote(slide, n.footnote);
}

// ═════════════════════════════════ slide 4 ══════════════════════════════════
function buildSlide4(
  pptx: PptxGenJS,
  n: SlidePlainN,
  model: ModelResult,
): void {
  const slide = pptx.addSlide({ masterName: MASTER });
  addTitle(slide, n.title, n.subtitle);

  const axisX = 1.7;
  const axisW = 10.1;
  const axisY = 5.0;
  const maxVal = Math.ceil((model.comps.field.max * 1.08) / 5) * 5;
  const scale = (v: number): number => axisX + (v / maxVal) * axisW;

  slide.addShape(pptx.ShapeType.line, {
    x: axisX,
    y: axisY,
    w: axisW,
    h: 0,
    line: { color: B.charcoalMid, width: 1.25 },
  });
  const step = maxVal / 6;
  for (let t = 0; t <= 6; t++) {
    const v = Math.round(t * step);
    const x = scale(v);
    slide.addShape(pptx.ShapeType.line, {
      x,
      y: axisY,
      w: 0,
      h: 0.08,
      line: { color: B.charcoalMid, width: 1 },
    });
    slide.addText(`SAR ${v}`, {
      x: x - 0.5,
      y: axisY + 0.1,
      w: 1,
      h: 0.25,
      align: "center",
      fontFace: B.sans,
      fontSize: 8,
      color: B.inkMuted,
    });
  }

  const barY = 2.85;
  const barH = 0.55;
  const xMin = scale(model.comps.field.min);
  const xMax = scale(model.comps.field.max);
  slide.addShape(pptx.ShapeType.rect, {
    x: xMin,
    y: barY,
    w: xMax - xMin,
    h: barH,
    fill: { color: B.band },
    line: { color: B.borderStrong, width: 1 },
  });
  slide.addText("Trading comps range (EV/Revenue, EV/EBITDA, P/E)", {
    x: xMin - 1,
    y: barY - 0.35,
    w: xMax - xMin + 2,
    h: 0.3,
    align: "center",
    fontFace: B.sans,
    fontSize: 10,
    bold: true,
    color: B.charcoalMid,
  });

  const xMed = scale(model.comps.field.median);
  slide.addShape(pptx.ShapeType.line, {
    x: xMed,
    y: barY - 0.05,
    w: 0,
    h: barH + 0.1,
    line: { color: B.charcoal, width: 1.5, dashType: "dash" },
  });
  slide.addText(`Median SAR ${model.comps.field.median.toFixed(2)}`, {
    x: xMed - 0.9,
    y: barY + barH + 0.06,
    w: 1.8,
    h: 0.25,
    align: "center",
    fontFace: B.sans,
    fontSize: 8,
    color: B.charcoalMid,
  });

  const xDcf = scale(model.base.perShare);
  slide.addShape(pptx.ShapeType.diamond, {
    x: xDcf - 0.09,
    y: barY - 0.5,
    w: 0.18,
    h: 0.18,
    fill: { color: B.positive },
    line: { color: B.charcoal, width: 0.75 },
  });
  slide.addText(`DCF target, SAR ${model.base.perShare.toFixed(2)}`, {
    x: xDcf - 1.1,
    y: barY - 1.0,
    w: 2.2,
    h: 0.42,
    align: "center",
    fontFace: B.sans,
    fontSize: 9,
    bold: true,
    color: B.positive,
  });

  const xCur = scale(model.price);
  slide.addShape(pptx.ShapeType.line, {
    x: xCur,
    y: barY - 0.15,
    w: 0,
    h: barH + 0.3,
    line: { color: B.negative, width: 1.5 },
  });
  slide.addText(`Current, SAR ${model.price.toFixed(2)}`, {
    x: xCur - 0.9,
    y: barY + barH + 0.38,
    w: 1.8,
    h: 0.3,
    align: "center",
    fontFace: B.sans,
    fontSize: 8.5,
    color: B.negative,
  });

  addFootnote(slide, n.footnote);
}

// ═════════════════════════════════ slide 5 ══════════════════════════════════
function buildSlide5(
  pptx: PptxGenJS,
  n: SlidePlainN,
  model: ModelResult,
): void {
  const slide = pptx.addSlide({ masterName: MASTER });
  addTitle(slide, n.title, n.subtitle);

  const chartX = 2.2;
  const chartW = 9.0;
  const baseY = 5.9;
  const chartH = 3.4;
  const maxIrr = Math.max(model.bull.irr, model.ic.hurdle / 100 + 0.05);
  const axisMax = (Math.ceil((maxIrr * 100) / 5) * 5) / 100;
  const scaleY = (v: number): number => baseY - (v / axisMax) * chartH;

  slide.addShape(pptx.ShapeType.line, {
    x: chartX,
    y: baseY,
    w: chartW,
    h: 0,
    line: { color: B.charcoalMid, width: 1.25 },
  });

  const scenarios: { label: string; v: number; color: string }[] = [
    { label: "Bear (25%)", v: model.bear.irr, color: B.negative },
    { label: "Base (50%)", v: model.base.irr, color: B.charcoal },
    { label: "Bull (25%)", v: model.bull.irr, color: B.positive },
  ];
  const barW = 1.7;
  const gap = (chartW - barW * 3) / 4;
  scenarios.forEach((s, i) => {
    const x = chartX + gap + i * (barW + gap);
    const yTop = scaleY(s.v);
    slide.addShape(pptx.ShapeType.rect, {
      x,
      y: yTop,
      w: barW,
      h: baseY - yTop,
      fill: { color: s.color },
      line: { color: B.charcoal, width: 0.5 },
    });
    slide.addText(`${(s.v * 100).toFixed(1)}%`, {
      x,
      y: yTop - 0.35,
      w: barW,
      h: 0.3,
      align: "center",
      fontFace: B.sans,
      fontSize: 12,
      bold: true,
      color: s.color,
    });
    slide.addText(s.label, {
      x,
      y: baseY + 0.1,
      w: barW,
      h: 0.3,
      align: "center",
      fontFace: B.sans,
      fontSize: 10.5,
      color: B.charcoalMid,
    });
  });

  const hurdleY = scaleY(model.ic.hurdle / 100);
  slide.addShape(pptx.ShapeType.line, {
    x: chartX,
    y: hurdleY,
    w: chartW,
    h: 0,
    line: { color: B.gold, width: 1.75, dashType: "dash" },
  });
  slide.addText(`Lunar hurdle, ${model.ic.hurdle.toFixed(1)}%`, {
    x: chartX + chartW - 2.7,
    y: hurdleY - 0.34,
    w: 2.7,
    h: 0.28,
    align: "right",
    fontFace: B.sans,
    fontSize: 10,
    bold: true,
    color: B.warn,
  });

  addFootnote(slide, n.footnote);
}

// ═════════════════════════════════ slide 6 ══════════════════════════════════
function buildSlide6(
  pptx: PptxGenJS,
  n: SlidePlainN,
  model: ModelResult,
): void {
  const slide = pptx.addSlide({ masterName: MASTER });
  addTitle(slide, n.title, n.subtitle);

  const gx = 0.85;
  const gy = 1.85;
  const cellSize = 0.7;
  for (let impact = 5; impact >= 1; impact--) {
    for (let prob = 1; prob <= 5; prob++) {
      const score = impact * prob;
      const fill = score > 12 ? B.negative : score > 6 ? B.warn : B.positive;
      const x = gx + (prob - 1) * cellSize;
      const y = gy + (5 - impact) * cellSize;
      slide.addShape(pptx.ShapeType.rect, {
        x,
        y,
        w: cellSize - 0.03,
        h: cellSize - 0.03,
        fill: { color: fill, transparency: 78 },
        line: { color: B.border, width: 0.5 },
      });
    }
  }
  for (let prob = 1; prob <= 5; prob++) {
    slide.addText(String(prob), {
      x: gx + (prob - 1) * cellSize,
      y: gy + 5 * cellSize + 0.02,
      w: cellSize,
      h: 0.24,
      align: "center",
      fontFace: B.sans,
      fontSize: 9,
      color: B.inkMuted,
    });
  }
  for (let impact = 1; impact <= 5; impact++) {
    slide.addText(String(impact), {
      x: gx - 0.3,
      y: gy + (5 - impact) * cellSize,
      w: 0.26,
      h: cellSize,
      align: "center",
      valign: "middle",
      fontFace: B.sans,
      fontSize: 9,
      color: B.inkMuted,
    });
  }
  slide.addText("Probability", {
    x: gx,
    y: gy + 5 * cellSize + 0.26,
    w: cellSize * 5,
    h: 0.25,
    align: "center",
    fontFace: B.sans,
    fontSize: 9,
    italic: true,
    color: B.inkMuted,
  });
  slide.addText("Impact", {
    x: gx - 0.62,
    y: gy,
    w: 0.28,
    h: cellSize * 5,
    align: "center",
    valign: "middle",
    fontFace: B.sans,
    fontSize: 9,
    italic: true,
    color: B.inkMuted,
    textDirection: "vert270",
  });

  riskRegister.forEach((r, i) => {
    const x = gx + (r.probability - 1) * cellSize + cellSize / 2 - 0.14;
    const y = gy + (5 - r.impact) * cellSize + cellSize / 2 - 0.14;
    slide.addShape(pptx.ShapeType.ellipse, {
      x,
      y,
      w: 0.28,
      h: 0.28,
      fill: { color: B.charcoal },
      line: { color: B.cream, width: 1 },
    });
    slide.addText(String(i + 1), {
      x,
      y,
      w: 0.28,
      h: 0.28,
      align: "center",
      valign: "middle",
      fontFace: B.sans,
      fontSize: 10,
      bold: true,
      color: B.cream,
    });
  });

  const headerFill = { color: B.charcoal };
  const rows: PptxGenJS.TableRow[] = [
    [
      {
        text: "#",
        options: {
          fontFace: B.sans,
          fontSize: 9,
          bold: true,
          color: B.cream,
          fill: headerFill,
          align: "center",
        },
      },
      {
        text: "Risk",
        options: {
          fontFace: B.sans,
          fontSize: 9,
          bold: true,
          color: B.cream,
          fill: headerFill,
        },
      },
      {
        text: "Score",
        options: {
          fontFace: B.sans,
          fontSize: 9,
          bold: true,
          color: B.cream,
          fill: headerFill,
          align: "center",
        },
      },
    ],
    ...riskRegister.map((r, i): PptxGenJS.TableRow => [
      {
        text: String(i + 1),
        options: {
          fontFace: B.sans,
          fontSize: 9,
          bold: true,
          color: B.charcoal,
          align: "center",
        },
      },
      {
        text: r.name,
        options: { fontFace: B.sans, fontSize: 9, color: B.ink },
      },
      {
        text: String(r.probability * r.impact),
        options: {
          fontFace: B.sans,
          fontSize: 9,
          bold: true,
          color: B.charcoal,
          align: "center",
        },
      },
    ]),
  ];
  slide.addTable(rows, {
    x: 5.55,
    y: 1.85,
    w: 7.2,
    colW: [0.5, 5.6, 1.1],
    border: { type: "solid", color: B.border, pt: 0.5 },
    autoPage: false,
  });
  slide.addText(
    `Composite score (peak-weighted): ${model.riskScore.toFixed(1)} / 10`,
    {
      x: 5.55,
      y: 6.0,
      w: 7.2,
      h: 0.3,
      fontFace: B.sans,
      fontSize: 10,
      bold: true,
      color: B.charcoalMid,
    },
  );

  addFootnote(slide, n.footnote);
}

// ═════════════════════════════════ slide 7 ══════════════════════════════════
function buildSlide7(
  pptx: PptxGenJS,
  n: SlidePlainN,
  model: ModelResult,
  facts: NarrativeFacts,
): void {
  const slide = pptx.addSlide({ masterName: MASTER });
  addTitle(slide, n.title, n.subtitle);

  const headerFill = { color: B.charcoal };
  const headerCell = (text: string): PptxGenJS.TableCell => ({
    text,
    options: {
      fontFace: B.sans,
      fontSize: 10,
      bold: true,
      color: B.cream,
      fill: headerFill,
    },
  });
  const bodyCell = (
    text: string,
    opts: { bold?: boolean; color?: string; align?: PptxGenJS.HAlign } = {},
  ): PptxGenJS.TableCell => ({
    text,
    options: {
      fontFace: B.sans,
      fontSize: 10,
      bold: opts.bold ?? false,
      color: opts.color ?? B.ink,
      align: opts.align,
    },
  });

  const irrPass = model.weightedReturn >= 0.15;
  const rows: PptxGenJS.TableRow[] = [
    [
      headerCell("Criterion"),
      headerCell("Status"),
      headerCell("Detail"),
      headerCell("Cite"),
    ],
    [
      bodyCell("Sector mandate"),
      bodyCell("PASS", { bold: true, color: B.positive }),
      bodyCell(
        "Quick-commerce & logistics falls within the Technology & Consumer mandate",
      ),
      bodyCell("p.3"),
    ],
    [
      bodyCell("IRR hurdle (15%)"),
      bodyCell(irrPass ? "PASS" : "REVIEW", {
        bold: true,
        color: irrPass ? B.positive : B.warn,
      }),
      bodyCell(
        `Weighted return ${fact(facts, "calc.weightedReturn")} vs ${fact(facts, "calc.hurdle")} hurdle`,
      ),
      bodyCell("p.3"),
    ],
    [
      bodyCell("Single-name concentration (10% cap)"),
      bodyCell("PASS*", { bold: true, color: B.positive }),
      bodyCell("Sized within cap, final ticket sizing is an IC decision"),
      bodyCell("p.4"),
    ],
    [
      bodyCell("Liquidity"),
      bodyCell("PASS", { bold: true, color: B.positive }),
      bodyCell("Tadawul-listed (6017) with active daily trading"),
      bodyCell("p.4"),
    ],
    [
      bodyCell("Compliance screen"),
      bodyCell(fact(facts, "calc.complianceStatus"), {
        bold: true,
        color: model.compliance.pass ? B.positive : B.negative,
      }),
      bodyCell(
        `Debt ${fact(facts, "calc.debtRatio")}, cash ${fact(facts, "calc.cashRatio")} of market cap (both <33%)`,
      ),
      bodyCell("p.5"),
    ],
  ];
  slide.addTable(rows, {
    x: CONTENT_X,
    y: 1.55,
    w: CONTENT_W,
    colW: [2.7, 1.3, 6.83, 0.9],
    border: { type: "solid", color: B.border, pt: 0.5 },
    autoPage: false,
  });
  slide.addText(
    "* Concentration pass is directional, final ticket sizing is an Investment Committee decision, not asserted here.",
    {
      x: CONTENT_X,
      y: 5.55,
      w: CONTENT_W,
      h: 0.3,
      fontFace: B.sans,
      fontSize: 8.5,
      italic: true,
      color: B.inkMuted,
    },
  );

  addFootnote(slide, n.footnote);
}

// ═════════════════════════════════ slide 8 ══════════════════════════════════
function buildSlide8(pptx: PptxGenJS, n: Slide8N, facts: NarrativeFacts): void {
  const slide = pptx.addSlide({ masterName: MASTER });
  addTitle(slide, n.title);

  slide.addShape(pptx.ShapeType.rect, {
    x: 1.7,
    y: 2.1,
    w: SLIDE_W - 3.4,
    h: 1.15,
    fill: { color: B.charcoal },
    line: { color: B.gold, width: 1.5 },
  });
  slide.addText(fact(facts, "calc.rating"), {
    x: 1.7,
    y: 2.15,
    w: SLIDE_W - 3.4,
    h: 0.68,
    align: "center",
    valign: "middle",
    fontFace: B.serif,
    fontSize: 32,
    bold: true,
    color: B.cream,
  });
  slide.addText(n.recommendationLine, {
    x: 1.7,
    y: 2.82,
    w: SLIDE_W - 3.4,
    h: 0.4,
    align: "center",
    valign: "middle",
    fontFace: B.sans,
    fontSize: 11,
    color: B.goldLight,
  });
  slide.addText(n.adviceLine, {
    x: 1.7,
    y: 3.85,
    w: SLIDE_W - 3.4,
    h: 0.6,
    align: "center",
    fontFace: B.sans,
    fontSize: 15,
    italic: true,
    bold: true,
    color: B.charcoal,
  });

  addFootnote(slide, n.footnote);
}

// ═══════════════════════════════ deck builder ═══════════════════════════════
export async function buildBoardDeck(): Promise<Buffer> {
  const model = computeModel();
  const facts = buildNarrativeFacts(model);
  const deck = resolveNarrativeTree(
    loadNarratives().deck as unknown as DeckNarratives,
    facts,
  );

  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "Faheem";
  pptx.company = "Lunar Investments";
  pptx.title = "Jahez International, Board Deck";
  defineMaster(pptx);

  buildSlide1(pptx, deck.slide1);
  buildSlide2(pptx, deck.slide2);
  buildSlide3(pptx, deck.slide3);
  buildSlide4(pptx, deck.slide4, model);
  buildSlide5(pptx, deck.slide5, model);
  buildSlide6(pptx, deck.slide6, model);
  buildSlide7(pptx, deck.slide7, model, facts);
  buildSlide8(pptx, deck.slide8, facts);

  const out = await pptx.write({ outputType: "nodebuffer" });
  return out as unknown as Buffer;
}
