// Asset pipeline for the Faheem hackathon deck.
// Outputs PNGs into ./assets/
import sharp from "sharp";
import { readFile, mkdir } from "node:fs/promises";
import path from "node:path";

const OUT = "assets";
const PDFA = "../pdfassets";
await mkdir(OUT, { recursive: true });

// Brand hexes (from app/globals.css @theme)
const NAVY = "#061F52";
const EMERALD = "#07966F";
const WHITE = "#FFFFFF";
const AMBER = "#B45309";
const NAVY400 = "#7590C6";

// ---------- 1. Composite PDF-extracted logos (image + smask -> transparent PNG)
async function compositeMask(img, mask, out) {
  const alpha = await sharp(path.join(PDFA, mask)).toColourspace("b-w").toBuffer();
  await sharp(path.join(PDFA, img))
    .joinChannel(alpha)
    .png()
    .toFile(path.join(OUT, out));
  console.log("logo:", out);
}
await compositeMask("p1-001.png", "p1-002.png", "amad-hackathon.png"); // 1146x701
await compositeMask("p1-003.png", "p1-004.png", "sponsor-wide.png");   // 2048x401
await compositeMask("p1-005.png", "p1-006.png", "sponsor-tall.png");   // 2048x777

// ---------- 2. Faheem glyph (exact traced paths from components/ui/logo.tsx)
const BARS = [
  "M 150 206.8 C 142.6 210.6, 61.8 268.2, 59.1 271.6 C 54.9 276.9, 54.9 277.4, 55.2 391.5 C 55.5 494.9, 55.6 501.5, 57.2 501.8 C 58.2 502, 63.2 498.8, 69 494.2 C 96.3 472.7, 124.7 461, 160.8 456.5 C 169.8 455.3, 169 467.6, 169 334.7 C 169 200.6, 169.5 210, 161.1 206.7 C 155.9 204.6, 154.2 204.6, 150 206.8",
  "M 301 110.3 C 299.1 111, 281.5 122.8, 262 136.5 C 242.5 150.2, 222.7 164, 218 167.3 C 206.8 175.1, 206 175.8, 203.9 180.5 C 201.2 186.2, 200.9 451.8, 203.6 454.4 C 205.8 456.6, 250.9 456.7, 265.2 454.5 C 285.8 451.4, 310 439.6, 316 429.7 C 318.9 425.1, 319.2 122.2, 316.3 116.3 C 313.7 110.6, 307.2 108.1, 301 110.3",
  "M 456.1 9.5 C 454.2 10.3, 448.4 14.1, 443.1 17.8 C 437.8 21.6, 416.7 36.5, 396.2 50.9 C 374.6 66.2, 357.8 78.7, 356.2 80.8 L 353.5 84.3 353.5 246.3 C 353.5 396.1, 353.6 408.4, 355.2 409.3 C 356.8 410.3, 366.9 403, 415 366.2 C 419.1 363.1, 431.1 353.9, 441.5 346 C 471.2 323.2, 472.7 322, 473.8 319.6 C 475.8 315.1, 475.7 17.7, 473.7 14.6 C 470 8.9, 462.3 6.7, 456.1 9.5",
];
const ARROW =
  "M 575.5 280.6 C 568.9 283.1, 558.8 286.8, 553 288.9 C 507.7 305.4, 507.4 305.6, 520.1 312.1 C 524.8 314.5, 527 316.7, 527 319 C 527 321.4, 499 346.8, 466.4 374.1 C 444.9 392, 405.5 422.6, 384.2 438 C 338.3 471, 308.6 485.7, 275 492.1 C 264.4 494.1, 259.1 494.4, 208 495.1 C 150.8 495.8, 145.9 496.2, 130.5 500.5 C 88.7 512.2, 59.7 530.9, 25.2 568.3 C 12.2 582.4, 11.4 583.5, 13 585.5 C 14.2 586.9, 30.3 587, 161.4 586.7 L 308.5 586.4 319.5 583.8 C 380 569.6, 395.3 554.2, 525.9 375 C 528.9 370.9, 533.8 364.1, 536.9 359.9 C 540 355.7, 544 350.2, 545.8 347.6 C 551.3 339.6, 553.1 340, 560 351.1 C 567.5 362.9, 568.2 362.5, 574.7 341 C 577.6 331.4, 583 314.2, 586.6 302.8 C 595.9 273.5, 595.7 273, 575.5 280.6";

async function glyph(barColor, out, px = 1600) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 603 596">
    ${BARS.map((d) => `<path d="${d}" fill="${barColor}"/>`).join("")}
    <path d="${ARROW}" fill="${EMERALD}"/>
  </svg>`;
  await sharp(Buffer.from(svg)).resize({ width: px }).png().toFile(path.join(OUT, out));
  console.log("glyph:", out);
}
await glyph(NAVY, "faheem-glyph-brand.png");
await glyph(WHITE, "faheem-glyph-reverse.png");

// ---------- 3. Lucide icons -> colored PNGs (stroke recolor, 512px)
const ICONS = {
  // problem stats
  clock: [EMERALD], "file-stack": [EMERALD], database: [EMERALD], recycle: [EMERALD],
  // data sources
  "chart-candlestick": [EMERALD], "building-2": [EMERALD], earth: [EMERALD],
  newspaper: [EMERALD], "folder-lock": [EMERALD], "book-open-check": [EMERALD],
  // tech
  "app-window": [EMERALD], "brain-circuit": [EMERALD], "file-output": [EMERALD],
  // idea rows
  sparkles: [EMERALD], users: [EMERALD], "database-zap": [EMERALD],
  // journey
  "user-round": [WHITE, NAVY], workflow: [WHITE, NAVY], "shield-check": [WHITE, EMERALD],
  "user-check": [WHITE, NAVY], "package-check": [WHITE, EMERALD],
  search: [NAVY], calculator: [NAVY], scale: [NAVY], "pen-line": [NAVY],
  "bell-ring": [NAVY], "file-search": [NAVY],
  // pipeline
  "cloud-download": [WHITE], filter: [WHITE], cpu: [WHITE], send: [WHITE],
  // alignment + summary
  "badge-check": [EMERALD], target: [EMERALD], package: [NAVY], trophy: [EMERALD],
  timer: [EMERALD], "layout-dashboard": [EMERALD],
  "messages-square": [NAVY], "file-spreadsheet": [NAVY], presentation: [NAVY],
  // validation + demo + challenges
  network: [EMERALD], "git-branch": [EMERALD], "scan-search": [EMERALD],
  "play-circle": [EMERALD], "circle-check": [EMERALD],
  "triangle-alert": [AMBER], handshake: [EMERALD], route: [NAVY],
  landmark: [EMERALD], "link-2": [EMERALD],
};
const slug = (c) => c.replace("#", "").toLowerCase();
for (const [name, colors] of Object.entries(ICONS)) {
  const src = await readFile(
    `node_modules/lucide-static/icons/${name}.svg`, "utf8");
  for (const color of colors) {
    const svg = src.replace(/stroke="currentColor"/, `stroke="${color}"`);
    await sharp(Buffer.from(svg), { density: 300 })
      .resize({ width: 512 })
      .png()
      .toFile(path.join(OUT, `ic-${name}-${slug(color)}.png`));
  }
}
console.log("icons done:", Object.keys(ICONS).length);
