/**
 * Tiny, dependency-free valid-PDF generator for tests + the e2e upload fixture.
 * Builds a single-page PDF (Helvetica base font) with a correct xref table, so
 * both the upload route's magic-byte check and the react-pdf viewer are happy.
 * No new deps, just hand-assembled bytes with computed offsets.
 */
import fs from "node:fs";
import path from "node:path";

export function makeSamplePdf(title = "Faheem Sample Note"): Buffer {
  const stream = `BT /F1 20 Tf 72 720 Td (${title}) Tj 0 -28 Td /F1 12 Tf (Uploaded via Faheem for the demo.) Tj ET`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];

  const header = "%PDF-1.4\n";
  const offsets: number[] = [];
  let body = "";
  let pos = header.length;
  objects.forEach((obj, i) => {
    offsets[i] = pos;
    const chunk = `${i + 1} 0 obj\n${obj}\nendobj\n`;
    body += chunk;
    pos += chunk.length;
  });

  const xrefStart = pos;
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets)
    xref += `${String(off).padStart(10, "0")} 00000 n \n`;
  const trailer = `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  // latin1 keeps 1 char === 1 byte, so the computed offsets stay exact.
  return Buffer.from(header + body + xref + trailer, "latin1");
}

export const SAMPLE_PDF_PATH = path.join(
  process.cwd(),
  "tests/fixtures/sample-note.pdf",
);

/** Ensure the on-disk e2e fixture exists; returns its absolute path. */
export function ensureSampleFixture(): string {
  if (!fs.existsSync(SAMPLE_PDF_PATH)) {
    fs.mkdirSync(path.dirname(SAMPLE_PDF_PATH), { recursive: true });
    fs.writeFileSync(SAMPLE_PDF_PATH, makeSamplePdf());
  }
  return SAMPLE_PDF_PATH;
}
