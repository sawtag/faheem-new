/**
 * Scratch preview, NOT part of the vitest suite (filename lacks `.test.`).
 * Writes the Jahez workbook to /tmp and prints the headline outputs.
 *
 *   npx tsx tests/generate/preview.ts
 */
import { writeFileSync } from "node:fs";
import { buildJahezWorkbook } from "@/lib/generate/xlsx";
import { computeModel } from "@/lib/model/compute";

async function main() {
  const m = computeModel();
  const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
  const sar = (x: number) => `SAR ${x.toFixed(2)}`;
  const line = (k: string, v: string) => console.log(`  ${k.padEnd(34)} ${v}`);

  console.log("\n=== WACC build ===");
  line(
    "rf / ERP / beta",
    `${pct(m.rf)} / ${pct(m.erp)} / ${m.beta.toFixed(2)}`,
  );
  line("Cost of equity (Ke)", pct(m.ke));
  line("Cost of debt (pre / after tax)", `${pct(m.kdPre)} / ${pct(m.kdAfter)}`);
  line("We / Wd", `${pct(m.we)} / ${pct(m.wd)}`);
  line("WACC", pct(m.wacc));

  console.log("\n=== DCF (base) ===");
  line("Σ PV explicit FCFF", m.base.sumPv.toFixed(1));
  line(
    "Terminal value / PV(TV)",
    `${m.base.tv.toFixed(1)} / ${m.base.pvTv.toFixed(1)}`,
  );
  line("Enterprise value", m.base.ev.toFixed(1));
  line("Net cash bridge", m.netCash.toFixed(1));
  line("Equity value", m.base.equity.toFixed(1));
  line("Value per share", sar(m.base.perShare));
  line("Current price", sar(m.price));
  line("Implied upside", pct(m.base.upside));
  line("IRR at entry (base)", pct(m.base.irr));

  console.log("\n=== Scenarios ===");
  for (const [n, s] of [
    ["Bull", m.bull],
    ["Base", m.base],
    ["Bear", m.bear],
  ] as const) {
    line(
      `${n} perShare / upside / IRR`,
      `${sar(s.perShare)} / ${pct(s.upside)} / ${pct(s.irr)}`,
    );
  }
  line("Weighted value/share", sar(m.weightedPerShare));
  line("Weighted expected return", pct(m.weightedReturn));

  console.log("\n=== Comps (implied SAR/share) ===");
  line(
    "EV/Rev tal/dd/dh",
    `${m.comps.evRev.talabat.toFixed(2)} / ${m.comps.evRev.doordash.toFixed(2)} / ${m.comps.evRev.dhero.toFixed(2)}`,
  );
  line(
    "EV/EBITDA tal/dd/dh",
    `${m.comps.evEbitda.talabat.toFixed(2)} / ${m.comps.evEbitda.doordash.toFixed(2)} / ${m.comps.evEbitda.dhero.toFixed(2)}`,
  );
  line(
    "P/E tal/dd",
    `${m.comps.pe.talabat.toFixed(2)} / ${m.comps.pe.doordash.toFixed(2)}`,
  );
  line(
    "Field min/median/max",
    `${m.comps.field.min.toFixed(2)} / ${m.comps.field.median.toFixed(2)} / ${m.comps.field.max.toFixed(2)}`,
  );

  console.log("\n=== Compliance ===");
  line(
    "Debt/mktcap",
    `${pct(m.compliance.debtRatio)} (${m.compliance.debtPass ? "PASS" : "FAIL"})`,
  );
  line(
    "Cash/mktcap",
    `${pct(m.compliance.cashRatio)} (${m.compliance.cashPass ? "PASS" : "FAIL"})`,
  );
  line("(Debt+lease)/mktcap", pct(m.compliance.leaseInclRatio));
  line("Overall", m.compliance.pass ? "PASS" : "REVIEW");

  console.log("\n=== IC / risk ===");
  line("Composite risk score", m.riskScore.toFixed(2));
  line(
    "IRR / hurdle / expReturn",
    `${pct(m.ic.irr)} / ${m.ic.hurdle}% / ${pct(m.ic.expectedReturn)}`,
  );

  console.log("\n=== Sensitivity grid 1 (value/share) ===");
  console.log("  WACC→ " + m.waccAxis.map((w) => pct(w)).join("  "));
  m.grid1.forEach((row, i) =>
    console.log(
      `  g=${pct(m.gAxis[i] ?? 0)} ` + row.map((x) => x.toFixed(2)).join("   "),
    ),
  );

  const buf = await buildJahezWorkbook();
  const out = "/tmp/jahez-valuation-model.xlsx";
  writeFileSync(out, buf);
  console.log(
    `\nWorkbook written: ${out} (${(buf.length / 1024).toFixed(0)} KB)`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
