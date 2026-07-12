// فهيم — Arabic hackathon deck (Amad 2026), Faheem brand system.
// Material flow mirrors context/Lunar Team - Agentic AI Financial Platform (Faheem).pdf
import pptxgen from "pptxgenjs";

const A = "assets";

// ---------- brand tokens (app/globals.css @theme) ----------
const NAVY = "061F52", NAVY950 = "041437", NAVY800 = "12285C", NAVY700 = "1D3568";
const NAVY500 = "4A66A3", NAVY400 = "7590C6", NAVY200 = "CBD8EE", NAVY100 = "E8EEF8", NAVY50 = "F4F7FC";
const EM = "07966F", EM700 = "05664D", EM300 = "5CC9A8", EM200 = "99DFC8", EM100 = "CCEFE3", EM50 = "E6F7F1";
const BG = "FBFCFE", CARD = "FFFFFF", BORDER = "E3E9F1";
const TEXT = "101D3A", TEXT2 = "314160";
const AMBER = "B45309", AMBER50 = "FEF3E2";

// fonts (installed family names)
const F = "IBM Plex Sans Arabic";            // regular; bold:true -> Bold cut
const FM = "IBM Plex Sans Arabic Medium";
const FS = "IBM Plex Sans Arabic SemiBold";
const SERIF = "Amiri";
const LATIN = "Arial";                        // arrows / glyph-safe latin

const W = 13.333, H = 7.5, MX = 0.67, CW = W - 2 * MX; // 12.0

const pres = new pptxgen();
pres.defineLayout({ name: "WIDE", width: W, height: H });
pres.layout = "WIDE";
pres.rtlMode = true;
pres.author = "فريق لونار";
pres.title = "منصة فهيم — الذكاء التوكيلي للمستثمر السعودي";

// fresh shadow per call (pptxgenjs mutates option objects)
const sh = () => ({ type: "outer", color: "082152", opacity: 0.07, blur: 11, offset: 2, angle: 90 });

// ---------- helpers ----------
function card(s, x, y, w, h, o = {}) {
  s.addShape("roundRect", {
    x, y, w, h, rectRadius: o.r ?? 0.09,
    fill: { color: o.fill ?? CARD },
    line: o.noLine ? { type: "none" } : { color: o.line ?? BORDER, width: o.lineW ?? 0.75 },
    shadow: o.noShadow ? undefined : sh(),
  });
}
// Arabic text (RTL, right-aligned by default)
function ar(s, txt, x, y, w, h, o = {}) {
  s.addText(txt, {
    x, y, w, h, margin: 0,
    fontFace: o.f ?? F, fontSize: o.size ?? 12, color: o.color ?? TEXT,
    bold: o.bold ?? false, align: o.align ?? "right", valign: o.valign ?? "top",
    rtlMode: true, lang: "ar-SA", lineSpacingMultiple: o.lsm ?? 1.22,
    charSpacing: o.charSpacing, transparency: o.transparency,
    fit: o.fit, wrap: true, isTextBox: true,
  });
}
// Latin/number text (LTR)
function en(s, txt, x, y, w, h, o = {}) {
  s.addText(txt, {
    x, y, w, h, margin: 0,
    fontFace: o.f ?? LATIN, fontSize: o.size ?? 12, color: o.color ?? TEXT,
    bold: o.bold ?? false, align: o.align ?? "center", valign: o.valign ?? "middle",
    charSpacing: o.charSpacing, lineSpacingMultiple: o.lsm ?? 1.0, isTextBox: true,
  });
}
function iconCircle(s, icon, cx, cy, d, circleColor, iconScale = 0.52) {
  s.addShape("ellipse", { x: cx - d / 2, y: cy - d / 2, w: d, h: d, fill: { color: circleColor }, line: { type: "none" } });
  const id = d * iconScale;
  s.addImage({ path: `${A}/${icon}.png`, x: cx - id / 2, y: cy - id / 2, w: id, h: id });
}
// left-pointing flow arrow (RTL progression)
function flowArrow(s, x, y, w, h, color = EM) {
  en(s, "←", x, y, w, h, { size: 22, color, bold: true });
}
// content-slide header
function header(s, title, sub, o = {}) {
  ar(s, title, MX, 0.42, CW, 0.62, { size: o.titleSize ?? 26, bold: true, color: NAVY });
  if (sub) ar(s, sub, MX, 1.06, CW, 0.4, { size: 13.5, f: FS, color: EM700 });
}
const GLYPH_AR = 603 / 596; // w/h aspect

// navy facet background for dark slides
function facets(s) {
  s.addShape("rect", { x: -3.2, y: -2.6, w: 11.5, h: 6.2, rotate: 348, fill: { color: NAVY800, transparency: 62 }, line: { type: "none" } });
  s.addShape("rect", { x: 5.6, y: 3.4, w: 12.5, h: 7.2, rotate: 348, fill: { color: NAVY950, transparency: 42 }, line: { type: "none" } });
}

// masters
pres.defineSlideMaster({ title: "CONTENT", background: { color: BG }, objects: [
  { image: { x: MX, y: 0.45, h: 0.4, w: 0.4 * GLYPH_AR, path: `${A}/faheem-glyph-brand.png` } },
], slideNumber: { x: 0.28, y: 7.12, w: 0.5, h: 0.28, color: NAVY400, fontFace: LATIN, fontSize: 9 } });
pres.defineSlideMaster({ title: "DARK", background: { color: NAVY }, objects: [] });

/* ============================================================
   S1 — COVER
============================================================ */
{
  const s = pres.addSlide({ masterName: "DARK" });
  facets(s);
  // hackathon lockup (هاكاثون + أ م د tiles)
  const hw = 1.9, hh = hw * (701 / 1146);
  s.addImage({ path: `${A}/amad-hackathon.png`, x: (W - hw) / 2, y: 0.55, w: hw, h: hh });
  // faheem glyph + wordmark
  const gh = 1.28, gw = gh * GLYPH_AR;
  s.addImage({ path: `${A}/faheem-glyph-reverse.png`, x: (W - gw) / 2, y: 2.18, w: gw, h: gh });
  ar(s, "فهيم", 4.67, 3.52, 4, 0.85, { size: 40, f: FM, color: "FFFFFF", align: "center" });
  en(s, "F A H E E M", 4.67, 4.38, 4, 0.3, { size: 12, color: EM300, charSpacing: 4, bold: true });
  // title + team
  ar(s, "منصة فهيم: الذكاء التوكيلي للمستثمر السعودي", MX, 4.92, CW, 0.62, { size: 27, bold: true, color: "FFFFFF", align: "center" });
  ar(s, "فريق لونار", MX, 5.68, CW, 0.42, { size: 17, f: FM, color: EM300, align: "center" });
  // sponsors
  const tw = 1.75, th = tw * (401 / 2048);
  s.addImage({ path: `${A}/sponsor-wide.png`, x: W - MX - tw - 0.1, y: 6.55, w: tw, h: th }); // Tuwaiq (right)
  const aw = 1.15, ah = aw * (777 / 2048);
  s.addImage({ path: `${A}/sponsor-tall.png`, x: MX, y: 6.5, w: aw, h: ah });               // Alinma (left)
}

/* ============================================================
   S2 — TEAM  أعضاء الفريق
============================================================ */
{
  const s = pres.addSlide({ masterName: "CONTENT" });
  header(s, "أعضاء الفريق", "خمس خبرات متكاملة: مال واستثمار، برمجة وعلوم بيانات، وتصميم واجهات");
  const members = [
    ["فهد العثمان", "خبير مالي", "ف"],
    ["علي أبوخمسين", "خبير مالي", "ع"],
    ["سعود شاهين", "مبرمج وعالِم بيانات", "س"],
    ["ريما القويعي", "مبرمجة وعالِمة بيانات", "ر"],
    ["أروى عسيري", "مصممة واجهات", "أ"],
  ];
  const cw = 2.2, gap = 0.25, y = 2.7, ch = 3.0;
  members.forEach((m, i) => {
    const x = W - MX - cw - i * (cw + gap); // RTL: first member rightmost
    card(s, x, y, cw, ch);
    const cx = x + cw / 2;
    s.addShape("ellipse", { x: cx - 0.575, y: y + 0.42, w: 1.15, h: 1.15, fill: { color: NAVY100 }, line: { color: NAVY200, width: 0.75 } });
    ar(s, m[2], cx - 0.575, y + 0.62, 1.15, 0.8, { size: 30, bold: true, color: NAVY, align: "center" });
    ar(s, m[0], x + 0.1, y + 1.82, cw - 0.2, 0.4, { size: 14.5, bold: true, color: NAVY, align: "center" });
    ar(s, m[1], x + 0.1, y + 2.28, cw - 0.2, 0.55, { size: 11.5, f: FM, color: TEXT2, align: "center" });
  });
}

/* ============================================================
   S3 — AGENDA  المحتويات
============================================================ */
{
  const s = pres.addSlide({ masterName: "CONTENT" });
  header(s, "المحتويات");
  const items = [
    "أعضاء الفريق", "المشكلة وحلها", "وصف الفكرة", "التقنيات المستخدمة",
    "جميع البيانات المستخدمة (نصية وغير نصية)", "كيفية توفير هذه البيانات وكيفية استخدامها", "الملخص",
  ];
  const colW = 5.7, rowH = 0.98, y0 = 1.9;
  items.forEach((t, i) => {
    const col = i < 4 ? 0 : 1;                    // col 0 = right (RTL first)
    const row = col === 0 ? i : i - 4;
    const x = col === 0 ? W - MX - colW : MX;
    const y = y0 + row * rowH + (col === 1 ? rowH / 2 : 0);
    // number tile at the right of the row
    s.addShape("roundRect", { x: x + colW - 0.52, y: y + 0.06, w: 0.52, h: 0.52, rectRadius: 0.09, fill: { color: NAVY }, line: { type: "none" } });
    en(s, String(i + 1).padStart(2, "0"), x + colW - 0.52, y + 0.06, 0.52, 0.52, { size: 14, color: "FFFFFF", bold: true });
    ar(s, t, x, y + 0.06, colW - 0.75, 0.52, { size: 16, f: FS, color: TEXT, valign: "middle" });
  });
}

/* ============================================================
   S4 — PROBLEM  المشكلة
============================================================ */
{
  const s = pres.addSlide({ masterName: "CONTENT" });
  header(s, "المشكلة: قرارات بمليارات الريالات تُبنى يدويًا",
    "التحليل المالي للشركات والاستثمارات بطيء ومكلف ومشتّت بين مئات المصادر وعشرات الأشخاص");
  const stats = [
    ["clock",      "+129", "ساعة عمل",               "لإعداد مذكرة ائتمان أو دراسة استثمار واحدة بالطرق اليدوية"],
    ["file-stack", "+345", "صفحة",                    "في نشرة الإصدار الواحدة تُقرأ وتُلخَّص يدويًا سطرًا بسطر دون استخراج آلي للمعلومات المهمة"],
    ["database",   "+10",  "مصادر منفصلة",            "تداول، وثق، ساما، سوق العقار، الأخبار — كلٌّ في نظام منفصل يعمل عليه المحلل شبه يدويًا"],
    ["recycle",    "صفر",  "قابلية لإعادة الاستخدام", "الخبرة حبيسة أفراد، والتكلفة ترتفع مع كل تحليل ومشروع جديد"],
  ];
  const cw = 2.775, gap = 0.3, y = 1.85, ch = 3.35;
  stats.forEach((st, i) => {
    const x = W - MX - cw - i * (cw + gap);
    card(s, x, y, cw, ch);
    iconCircle(s, `ic-${st[0]}-07966f`, x + cw - 0.62, y + 0.62, 0.72, EM50);
    if (st[1] === "صفر") ar(s, st[1], x + 0.2, y + 1.18, cw - 0.4, 0.85, { size: 36, bold: true, color: EM });
    else en(s, st[1], x + 0.2, y + 1.18, cw - 0.4, 0.85, { f: LATIN, size: 40, bold: true, color: EM, align: "right" });
    ar(s, st[2], x + 0.2, y + 2.06, cw - 0.4, 0.4, { size: 14.5, bold: true, color: NAVY });
    ar(s, st[3], x + 0.2, y + 2.5, cw - 0.4, 0.8, { size: 10.5, color: TEXT2, lsm: 1.28 });
  });
  s.addShape("roundRect", { x: MX, y: 5.6, w: CW, h: 0.85, rectRadius: 0.12, fill: { color: NAVY }, line: { type: "none" }, shadow: sh() });
  ar(s, "النتيجة: قرارات أبطأ، وتكلفة أعلى، وفرص استثمارية تضيع كل يوم", MX + 0.4, 5.6, CW - 0.8, 0.85, { size: 16.5, f: FS, color: "FFFFFF", align: "center", valign: "middle" });
}

/* ============================================================
   S5 — SOLUTION  الحل (dark)
============================================================ */
{
  const s = pres.addSlide({ masterName: "DARK" });
  facets(s);
  s.addShape("roundRect", { x: (W - 1.35) / 2, y: 0.62, w: 1.35, h: 0.52, rectRadius: 0.26, fill: { color: EM }, line: { type: "none" } });
  ar(s, "الحل", (W - 1.35) / 2, 0.62, 1.35, 0.52, { size: 15, f: FS, color: "FFFFFF", align: "center", valign: "middle" });
  const gh = 1.5, gw = gh * GLYPH_AR;
  s.addImage({ path: `${A}/faheem-glyph-reverse.png`, x: (W - gw) / 2, y: 1.5, w: gw, h: gh });
  ar(s, "فهيم", 4.67, 3.1, 4, 0.8, { size: 36, f: FM, color: "FFFFFF", align: "center" });
  en(s, "F A H E E M", 4.67, 3.88, 4, 0.28, { size: 11, color: EM300, charSpacing: 4, bold: true });
  ar(s, "المحلل المالي الذكي: فريق أبحاث مالي متكامل يعمل بالذكاء الاصطناعي التوكيلي", MX, 4.42, CW, 0.6, { size: 24, bold: true, color: "FFFFFF", align: "center" });
  ar(s, "يقرأ آلاف الصفحات، يحلّل البيانات، ويكتب التقارير بالعربية والإنجليزية — في ساعات لا أسابيع", MX, 5.12, CW, 0.45, { size: 14.5, f: FM, color: NAVY200, align: "center" });
  const pills = ["مصمَّم للأسواق السعودية والعالمية", "متوافق مع معيار ساما للمصرفية المفتوحة", "مخرجات مرنة حسب كل شركة ومتطلباتها"];
  const pw = 3.7, pgap = 0.32, total = pills.length * pw + (pills.length - 1) * pgap;
  pills.forEach((p, i) => {
    const x = (W + total) / 2 - pw - i * (pw + pgap); // RTL: first pill rightmost
    s.addShape("roundRect", { x, y: 6.05, w: pw, h: 0.62, rectRadius: 0.31, fill: { color: NAVY800, transparency: 25 }, line: { color: EM, width: 1 } });
    ar(s, p, x + 0.15, 6.05, pw - 0.3, 0.62, { size: 12, f: FS, color: "FFFFFF", align: "center", valign: "middle" });
  });
}

/* ============================================================
   S6 — DATA  البيانات المستخدمة
============================================================ */
{
  const s = pres.addSlide({ masterName: "CONTENT" });
  header(s, "البيانات المستخدمة: عامة وخاصة",
    "واجهات برمجية (APIs) أولًا — مفاتيح ذاتية الخدمة جاهزة، وهذه البداية فقط");
  const cards = [
    ["chart-candlestick", "أسعار السوق — سهمك (SAHMK)", "أسعار لحظية وتاريخية وقوائم مالية وتوزيعات لأكثر من 350 شركة مرخصة من تداول، مع بث لحظي عبر WebSocket وبيانات Twelve Data احتياطية"],
    ["earth",             "السجلات العالمية — بلومبرغ وبيتش بوك", "مصادر الأسواق العالمية بين يديك: تحليل سريع وبيانات متوافقة بسلاسة مع الذكاء الاصطناعي"],
    ["newspaper",         "الأخبار والمعنويات — marketaux API", "أخبار موسومة بالكيانات السعودية: شركات تداول والمؤشر العام — لرصد معنويات السوق لحظة بلحظة"],
    ["building-2",        "العقار — منصة البيانات المفتوحة", "صفقات البورصة العقارية (وزارة العدل) وبيانات المبيعات التاريخية عبر od.data.gov.sa ومؤشرات REGA وبيانات GASTAT"],
    ["folder-lock",       "غرف البيانات الخاصة — Data Rooms", "الشركات الخاصة تشارك بياناتها مع المستثمرين عبر غرف بيانات؛ نعمل على مفاتيح من Intralinks ومن Datasite"],
    ["book-open-check",   "الإفصاحات الرسمية — مكتبة RAG", "نشرات إصدار هيئة السوق المالية والتقارير السنوية للشركات المدرجة — نصوص ثنائية اللغة تتجاوز 300 صفحة"],
  ];
  const cw = 3.86, gap = 0.21, ch = 2.02;
  cards.forEach((c, i) => {
    const col = i % 3, row = Math.floor(i / 3);
    const x = W - MX - cw - col * (cw + gap);
    const y = 1.68 + row * (ch + 0.18);
    card(s, x, y, cw, ch);
    iconCircle(s, `ic-${c[0]}-07966f`, x + cw - 0.55, y + 0.52, 0.62, EM50);
    ar(s, c[1], x + 0.22, y + 0.24, cw - 1.14, 0.62, { size: 12.5, bold: true, color: NAVY, lsm: 1.15 });
    ar(s, c[2], x + 0.22, y + 0.95, cw - 0.44, 1.0, { size: 10, color: TEXT2, lsm: 1.26 });
  });
  s.addShape("roundRect", { x: MX, y: 6.18, w: CW, h: 0.78, rectRadius: 0.1, fill: { color: EM50 }, line: { color: EM200, width: 0.75 } });
  ar(s, "تكامل ومرونة في الربط مع جميع مصادر البيانات بأنواعها — فهيم يصل إلى المعلومة وإن كانت مدفونة في أعماق المستندات وقواعد البيانات",
    MX + 0.4, 6.18, CW - 0.8, 0.78, { size: 13, f: FS, color: EM700, align: "center", valign: "middle" });
}

/* ============================================================
   S7 — TECH  التقنيات المستخدمة
============================================================ */
{
  const s = pres.addSlide({ masterName: "CONTENT" });
  header(s, "التقنيات المستخدمة", "مكدس واحد متكامل — سرعة في التطوير وموثوقية يوم العرض");
  const cards = [
    ["app-window",    "واجهة المنصة", "Next.js 16 · TypeScript · Tailwind", "واجهة عربية/إنجليزية ثنائية الاتجاه (RTL) بهوية بصرية مملوكة بالكامل — كل بكسل مصمم لفهيم"],
    ["brain-circuit", "الذكاء الاصطناعي", "Claude (Anthropic)", "وكلاء متخصصون بمسارات عمل محددة، استشهادات إلزامية مثبتة بالمصدر لكل رقم، وذاكرة سياق للمستندات الطويلة"],
    ["file-output",   "المستندات والمخرجات", "Word · Excel · PowerPoint · PDF", "توليد فوري للمذكرات والنماذج المالية والعروض من داخل المحادثة — قابلة للتنزيل والتحرير مباشرة"],
  ];
  const cw = 3.86, gap = 0.21, y = 1.85, ch = 3.4;
  cards.forEach((c, i) => {
    const x = W - MX - cw - i * (cw + gap);
    card(s, x, y, cw, ch);
    iconCircle(s, `ic-${c[0]}-07966f`, x + cw / 2, y + 0.78, 0.95, EM50);
    ar(s, c[1], x + 0.25, y + 1.42, cw - 0.5, 0.42, { size: 15.5, bold: true, color: NAVY, align: "center" });
    en(s, c[2], x + 0.25, y + 1.92, cw - 0.5, 0.34, { f: LATIN, size: 12, bold: true, color: EM });
    ar(s, c[3], x + 0.3, y + 2.36, cw - 0.6, 0.95, { size: 10.5, color: TEXT2, align: "center", lsm: 1.3 });
  });
  ar(s, "بيانات موثقة عبر مخططات تحقق صارمة (Zod) وسجل تدقيق كامل — لا رقم بلا مصدر",
    MX, 5.55, CW, 0.4, { size: 12, f: FM, color: TEXT2, align: "center" });
}

/* ============================================================
   S8 — IDEA  وصف الفكرة
============================================================ */
{
  const s = pres.addSlide({ masterName: "CONTENT" });
  header(s, "وصف الفكرة", "كيف يتميّز فهيم — وكيف يعمل في مثال تطبيقي");
  // right column: differentiators
  const rx = W - MX - 5.75, rw = 5.75;
  ar(s, "كيف يتميّز فهيم", rx, 1.6, rw, 0.4, { size: 16, bold: true, color: NAVY });
  const diffs = [
    ["sparkles",     "محلل خاص بالمؤسسة", "ذكاء أبحاث اصطناعي مملوك حصريًا للمؤسسة، مدرَّب على بياناتها الخاصة وتوجهاتها الاستثمارية ومعاييرها — يعمل تمامًا كمحلل داخلي"],
    ["users",        "فريق وكلاء متخصصين", "وكلاء فرعيون لكل منهم مسار عمل محدد، مع وصول مباشر إلى بيانات المؤسسة وسياق الصفقات وقوالب المخرجات"],
    ["database-zap", "متصل بالبيانات الحية", "غرف الصفقات والبيانات اللحظية ومنصات عالمية مثل بلومبرغ وبيتش بوك — بالإضافة إلى الاتصال الفعلي وقت التحليل"],
  ];
  diffs.forEach((d, i) => {
    const y = 2.15 + i * 1.55;
    card(s, rx, y, rw, 1.4);
    iconCircle(s, `ic-${d[0]}-07966f`, rx + rw - 0.52, y + 0.7, 0.62, EM50);
    ar(s, d[1], rx + 0.25, y + 0.18, rw - 1.1, 0.35, { size: 13, bold: true, color: NAVY });
    ar(s, d[2], rx + 0.25, y + 0.56, rw - 1.1, 0.75, { size: 10, color: TEXT2, lsm: 1.25 });
  });
  // left column: worked example
  const lx = MX, lw = 5.9;
  card(s, lx, 1.6, lw, 5.25, { fill: NAVY50 });
  ar(s, "كيف يعمل فهيم: مثال تطبيقي — صفقة استثمار خاص", lx + 0.3, 1.82, lw - 0.6, 0.4, { size: 14.5, bold: true, color: NAVY });
  const steps = [
    ["الاستلام", "يُزوَّد فهيم بمستندات غرفة البيانات: مذكرة الطرح الخاص، اتفاقية الشراكة، استبيان العناية الواجبة، ومحاضر المكالمات المرجعية المحفوظة"],
    ["العناية الواجبة", "يسحب البيانات الداعمة من الويب والمنصات المشتركة، يفحص الصندوق وفق معايير المؤسسة المُعدَّة مسبقًا، ويُبرز المخاطر والثغرات قبل المضي قدمًا"],
    ["المخرجات", "تُدقَّق جميع الأرقام مقابل مصادرها ويُفحص تضارب المصالح — فتتحول أيام من العناية اليدوية إلى مسودة أولى جاهزة للمراجعة في دقائق"],
  ];
  steps.forEach((st, i) => {
    const y = 2.42 + i * 1.5;
    s.addShape("ellipse", { x: lx + lw - 0.78, y: y + 0.08, w: 0.48, h: 0.48, fill: { color: NAVY }, line: { type: "none" } });
    en(s, String(i + 1), lx + lw - 0.78, y + 0.08, 0.48, 0.48, { size: 15, color: "FFFFFF", bold: true });
    ar(s, st[0], lx + 0.3, y + 0.06, lw - 1.25, 0.35, { size: 13, bold: true, color: EM700 });
    ar(s, st[1], lx + 0.3, y + 0.44, lw - 1.25, 0.95, { size: 10.5, color: TEXT2, lsm: 1.28 });
  });
}

/* ============================================================
   S9 — JOURNEY  رحلة الطلب داخل فهيم
============================================================ */
{
  const s = pres.addSlide({ masterName: "CONTENT" });
  header(s, "رحلة الطلب داخل فهيم", "من سؤال المحلل إلى مخرجات موثقة جاهزة للتسليم — والإنسان يعتمد القرار");
  const nodes = [
    ["user-round-061f52",    "طلب المحلل",        "سؤال أو مهمة بلغة طبيعية"],
    ["workflow-061f52",      "المنسّق / المخطّط", "يوزّع المهام على الوكلاء ويرتّبها"],
    ["shield-check-07966f",  "التحقق والامتثال",  "شريعة · مصادر · عقوبات · درجات ثقة"],
    ["user-check-061f52",    "مراجعة بشرية",      "اعتماد — أو إعادة توجيه بتعليمات جديدة"],
    ["package-check-07966f", "التسليم النهائي",   "مذكرة · نموذج · عرض — موثق بالمصادر"],
  ];
  const nw = 2.12, gap = 0.35, y = 1.52, nh = 1.26;
  nodes.forEach((n, i) => {
    const x = W - MX - nw - i * (nw + gap);
    card(s, x, y, nw, nh);
    iconCircle(s, `ic-${n[0]}`, x + nw / 2, y + 0.34, 0.5, i === 2 || i === 4 ? EM50 : NAVY100);
    ar(s, n[1], x + 0.08, y + 0.6, nw - 0.16, 0.3, { size: 11.5, bold: true, color: NAVY, align: "center" });
    ar(s, n[2], x + 0.1, y + 0.9, nw - 0.2, 0.33, { size: 8, color: TEXT2, align: "center", lsm: 1.1 });
    if (i < nodes.length - 1) flowArrow(s, x - gap, y + 0.42, gap, 0.4);
  });
  // agents band
  const by = 3.14, bh = 1.92;
  s.addShape("roundRect", { x: MX, y: by, w: CW, h: bh, rectRadius: 0.09, fill: { color: NAVY50 }, line: { color: BORDER, width: 0.75 } });
  ar(s, "وكلاء متخصصون يعملون بالتوازي", MX + 0.35, by + 0.14, CW - 0.7, 0.32, { size: 12.5, f: FS, color: NAVY });
  const agents = [
    ["search",      "البحث والمصادر"],
    ["calculator",  "النمذجة والتقييم"],
    ["scale",       "المقارنات والسوابق"],
    ["pen-line",    "كتابة التقارير"],
    ["bell-ring",   "المراقبة والمحافظ"],
    ["file-search", "ذكاء المستندات"],
  ];
  const chW = 3.6, chGap = 0.3, chH = 0.56;
  agents.forEach((a, i) => {
    const col = i % 3, row = Math.floor(i / 3);
    const x = W - MX - 0.3 - chW - col * (chW + chGap);
    const cy = by + 0.56 + row * (chH + 0.16);
    s.addShape("roundRect", { x, y: cy, w: chW, h: chH, rectRadius: 0.09, fill: { color: CARD }, line: { color: BORDER, width: 0.75 } });
    s.addImage({ path: `${A}/ic-${a[0]}-061f52.png`, x: x + chW - 0.48, y: cy + 0.14, w: 0.28, h: 0.28 });
    ar(s, a[1], x + 0.2, cy, chW - 0.9, chH, { size: 11.5, f: FS, color: TEXT, valign: "middle" });
  });
  // dashed connectors: orchestrator -> band, band -> verification
  const orchCx = W - MX - nw - (nw + gap) + nw / 2;      // node 2 center
  const verCx = W - MX - nw - 2 * (nw + gap) + nw / 2;   // node 3 center
  s.addShape("line", { x: orchCx, y: y + nh, w: 0, h: by - (y + nh), line: { color: NAVY500, width: 1.25, dashType: "dash" } });
  s.addShape("line", { x: verCx, y: y + nh, w: 0, h: by - (y + nh), line: { color: NAVY500, width: 1.25, dashType: "dash" } });
  // shared infrastructure
  const iy = 5.3, ih = 1.02;
  s.addShape("roundRect", { x: MX, y: iy, w: CW, h: ih, rectRadius: 0.09, fill: { color: NAVY }, line: { type: "none" }, shadow: sh() });
  ar(s, "بنية تحتية مشتركة", MX + 0.35, iy + 0.1, CW - 0.7, 0.3, { size: 11.5, f: FS, color: EM300 });
  const infra = [
    "الموصلات: تداول · بلومبرغ · CapIQ · غرف البيانات",
    "الذاكرة والمعرفة: تاريخ الشركات وسياق الصفقات",
    "الصلاحيات والتدقيق: حواجز معلومات وسجل كامل",
  ];
  infra.forEach((t, i) => {
    const x = W - MX - 0.35 - 3.75 - i * 3.85;
    ar(s, t, x, iy + 0.45, 3.75, 0.45, { size: 10.5, color: "FFFFFF", lsm: 1.15 });
  });
  ar(s, "كل خطوة تُسجَّل في سجل التدقيق — وكل رقم يُنسب إلى مصدره وصفحته", MX, 6.55, CW, 0.35, { size: 11.5, f: FM, color: EM700, align: "center" });
}

/* ============================================================
   S10 — PIPELINE  كيفية توفير هذه البيانات
============================================================ */
{
  const s = pres.addSlide({ masterName: "CONTENT" });
  header(s, "كيفية توفير هذه البيانات وكيفية استخدامها", "بياناتنا تمر برحلة تدقيق لضمان أفضل النتائج");
  const steps = [
    ["cloud-download", "الجمع",     "مفاتيح API ذاتية الخدمة (سهمك، وثق، أخبار)، تنزيل مباشر للنشرات والتقارير، ومصادر خاصة كمنصات الشركات السحابية وغرف البيانات"],
    ["filter",         "المعالجة",  "تنظيف وحذف التكرار، تقطيع ذكي للمستندات مع تلخيصها، وتضمينات (Embeddings) في قاعدة متجهات كمصدر لمنظومة RAG"],
    ["cpu",            "التحليل",   "الوكلاء يستدعون الأدوات، يقارنون النتائج من مصادر متعددة، ويحسبون درجات الثقة لكل استنتاج"],
    ["send",           "التسليم",   "إجابات موثقة بالمصادر، ومذكرات ائتمان وتقارير استثمارية بقوالب جاهزة حسب كل شركة وشروطها"],
  ];
  const cw = 2.8, gap = 0.27, y = 1.9, ch = 3.35;
  steps.forEach((st, i) => {
    const x = W - MX - cw - i * (cw + gap);
    card(s, x, y, cw, ch);
    iconCircle(s, `ic-${st[0]}-ffffff`, x + cw / 2, y + 0.75, 0.9, NAVY);
    en(s, String(i + 1), x + cw - 0.6, y + 0.18, 0.42, 0.42, { size: 15, bold: true, color: NAVY400, align: "right", valign: "top", f: LATIN });
    ar(s, st[1], x + 0.2, y + 1.35, cw - 0.4, 0.42, { size: 15.5, bold: true, color: NAVY, align: "center" });
    ar(s, st[2], x + 0.25, y + 1.85, cw - 0.5, 1.35, { size: 10, color: TEXT2, align: "center", lsm: 1.28 });
    if (i < steps.length - 1) flowArrow(s, x - gap, y + 1.4, gap, 0.4);
  });
  s.addShape("roundRect", { x: MX, y: 5.6, w: CW, h: 0.78, rectRadius: 0.1, fill: { color: EM50 }, line: { color: EM200, width: 0.75 } });
  ar(s, "البيانات هي ركيزة فهيم — التدقيق والتحضير عبر مسارات معالجة آلية لبنة أساسية للنجاح",
    MX + 0.4, 5.6, CW - 0.8, 0.78, { size: 13.5, f: FS, color: EM700, align: "center", valign: "middle" });
}

/* ============================================================
   S11 — ALIGNMENT  مواءمة الفكرة
============================================================ */
{
  const s = pres.addSlide({ masterName: "CONTENT" });
  header(s, "مواءمة الفكرة: في قلب المسار وقلب القطاع", "مسار الذكاء الاصطناعي التوليدي للتقنية المالية");
  const cards = [
    ["تطابق حرفي مع وصف المسار", "فهيم يقدّم خدمات مالية حديثة في منصة واحدة، في صميم مجال الذكاء الاصطناعي التوكيلي الحديث"],
    ["مبني على معايير الهاكاثون", "تحليل بيانات من مصادر متعددة ووطنية، تطبيق تقني توكيلي متقدم، تجربة مستخدم عربية، وقابلية تنفيذ فورية"],
    ["رؤية 2030 والمصرفية المفتوحة", "ساما حوّلت المصرفية المفتوحة إلى نظام ترخيص رسمي — ونموذج بياناتنا مبني على معيارها من اليوم الأول"],
    ["قيمة مباشرة للقطاع المصرفي والاستثماري", "أتمتة عمليات الاستثمار بشكل شبه فوري لزيادة الشفافية — ووداعًا لتضييع أسابيع البحث من أجل قرار مالي واحد"],
  ];
  const cw = 5.85, gap = 0.3, ch = 2.3;
  cards.forEach((c, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = W - MX - cw - col * (cw + gap);
    const y = 1.85 + row * (ch + 0.3);
    card(s, x, y, cw, ch);
    s.addImage({ path: `${A}/ic-badge-check-07966f.png`, x: x + cw - 0.75, y: y + 0.3, w: 0.46, h: 0.46 });
    ar(s, c[0], x + 0.3, y + 0.32, cw - 1.15, 0.75, { size: 14.5, bold: true, color: NAVY, lsm: 1.15 });
    ar(s, c[1], x + 0.3, y + 1.12, cw - 0.7, 1.0, { size: 11.5, color: TEXT2, lsm: 1.3 });
  });
}

/* ============================================================
   S12 — SUMMARY  الملخص
============================================================ */
{
  const s = pres.addSlide({ masterName: "CONTENT" });
  header(s, "الملخص", "لمحة شاملة عن المشروع: أهدافه، مخرجاته، وأهم النتائج التي تم الوصول إليها");
  // right: goal
  const rx = W - MX - 5.0, rw = 5.0;
  ar(s, "الهدف", rx, 1.9, rw, 0.4, { size: 16, bold: true, color: NAVY });
  ar(s, "منح كل بنك ووجهة استثمار فريقَ أبحاث ماليًا كاملًا يعمل بالذكاء الاصطناعي التوكيلي — يوحّد مصادر عامة وخاصة عبر واجهات برمجية وقواعد بيانات ومنصات رقمية مختلفة، ويحوّل أسابيع التحليل والمذكرات إلى ساعات قليلة",
    rx, 2.42, rw, 1.7, { size: 12.5, color: TEXT2, lsm: 1.4 });
  const pills = [
    ["timer", "ساعات بدل أسابيع"], ["layout-dashboard", "مصادر بيانات متنوعة"],
    ["badge-check", "لا رقم بلا مصدر"], ["shield-check", "سجل تدقيق كامل"],
  ];
  pills.forEach((p, i) => {
    const pw = 2.35, col = i % 2, row = Math.floor(i / 2);
    const x = rx + rw - pw - col * (pw + 0.3), y = 4.45 + row * 0.82;
    s.addShape("roundRect", { x, y, w: pw, h: 0.6, rectRadius: 0.3, fill: { color: EM50 }, line: { color: EM200, width: 0.75 } });
    s.addImage({ path: `${A}/ic-${p[0]}-07966f.png`, x: x + pw - 0.52, y: y + 0.14, w: 0.32, h: 0.32 });
    ar(s, p[1], x + 0.2, y, pw - 0.75, 0.6, { size: 11.5, f: FS, color: EM700, valign: "middle" });
  });
  // left: outputs + results
  const lx = MX, lw = 6.6;
  card(s, lx, 1.7, lw, 2.2);
  s.addShape("roundRect", { x: lx + lw - 1.75, y: 1.9, w: 1.55, h: 0.44, rectRadius: 0.09, fill: { color: NAVY100 }, line: { type: "none" } });
  ar(s, "المخرجات", lx + lw - 1.75, 1.9, 1.55, 0.44, { size: 12, f: FS, color: NAVY, align: "center", valign: "middle" });
  const outs = [
    "مساعد محادثة يجيب بمصادر موثقة عن تداول والشركات والعقار والاقتصاد",
    "مذكرات ائتمان وتقارير استثمارية بقوالب مؤسستك (Word، PowerPoint، Excel)",
    "فحص متكامل بقوائم مراجعة تلقائية وسجل تدقيق كامل",
  ];
  outs.forEach((t, i) => {
    const y = 2.44 + i * 0.46;
    s.addShape("ellipse", { x: lx + lw - 0.42, y: y + 0.12, w: 0.12, h: 0.12, fill: { color: EM }, line: { type: "none" } });
    ar(s, t, lx + 0.25, y, lw - 0.85, 0.42, { size: 10.5, color: TEXT2 });
  });
  card(s, lx, 4.1, lw, 1.85);
  s.addShape("roundRect", { x: lx + lw - 2.5, y: 4.28, w: 2.3, h: 0.44, rectRadius: 0.09, fill: { color: EM50 }, line: { type: "none" } });
  ar(s, "أهم النتائج حتى الآن", lx + lw - 2.5, 4.28, 2.3, 0.44, { size: 12, f: FS, color: EM700, align: "center", valign: "middle" });
  const results = [
    "منصة عاملة بواجهة عربية/إنجليزية: محادثة موثقة، ووكلاء متخصصون، ومخرجات جاهزة للتنزيل",
    "أرقام حقيقية مدققة من إفصاحات شركة جاهز — كل رقم يُنسب إلى مصدره وصفحته",
  ];
  results.forEach((t, i) => {
    const y = 4.82 + i * 0.52;
    s.addShape("ellipse", { x: lx + lw - 0.42, y: y + 0.12, w: 0.12, h: 0.12, fill: { color: EM }, line: { type: "none" } });
    ar(s, t, lx + 0.25, y, lw - 0.85, 0.5, { size: 10.5, color: TEXT2 });
  });
  // closing banner
  s.addShape("roundRect", { x: MX, y: 6.3, w: CW, h: 0.85, rectRadius: 0.12, fill: { color: NAVY }, line: { type: "none" }, shadow: sh() });
  ar(s, "نحن لا نبني روبوت محادثة! نحن نبني البنية المعرفية للقطاع المالي السعودي بالذكاء الاصطناعي التوكيلي",
    MX + 0.4, 6.3, CW - 0.8, 0.85, { size: 15.5, f: FS, color: "FFFFFF", align: "center", valign: "middle" });
}

/* ============================================================
   S13 — VALIDATION  الاختبار والتحقق
============================================================ */
{
  const s = pres.addSlide({ masterName: "CONTENT" });
  header(s, "الاختبار والتحقق", "بنينا النموذج الأولي لنظام فهيم وشغّلناه بنجاح من خلال واجهة المستخدم");
  const rows = [
    ["network",     "بنية النظام متعدد الوكلاء", "7 فرق متخصصة (البحث والمصادر، ذكاء المستندات، النمذجة والتقييم، المقارنات والسوابق، كتابة التقارير، المراقبة والمحافظ، التحقق والامتثال) تضم أكثر من 20 وكيلًا ذكيًا"],
    ["git-branch",  "تدفق العمل (Graph)",        "اختبار المخطط المرحلي بنجاح: بحث ثم تحليل مستندات بالتوازي، فالنمذجة والمقارنات، فكتابة التقارير، فالتحقق من الامتثال، وأخيرًا المراجعة البشرية"],
    ["scan-search", "واجهات برمجة التطبيقات",    "اختبار واجهات API المطوَّرة واستلام النتائج من الوكلاء عبر واجهة المستخدم"],
  ];
  rows.forEach((r, i) => {
    const y = 1.75 + i * 1.28;
    card(s, MX, y, CW, 1.12);
    iconCircle(s, `ic-${r[0]}-07966f`, W - MX - 0.62, y + 0.56, 0.66, EM50);
    ar(s, r[1], MX + 0.3, y + 0.15, CW - 1.35, 0.35, { size: 13.5, bold: true, color: NAVY });
    ar(s, r[2], MX + 0.3, y + 0.52, CW - 1.35, 0.52, { size: 10.5, color: TEXT2, lsm: 1.25 });
  });
  // progress — RTL bar: 0% at the right edge; solid emerald = today (30%),
  // light emerald = plan by demo day (70%). Labels live INSIDE their segments.
  card(s, MX, 5.7, CW, 1.38);
  ar(s, "نسبة الإنجاز", W - MX - 2.3, 5.88, 2.0, 0.35, { size: 13.5, bold: true, color: NAVY });
  const tx = MX + 0.35, tw = CW - 3.0, ty = 6.32, th = 0.42;
  s.addShape("roundRect", { x: tx, y: ty, w: tw, h: th, rectRadius: 0.21, fill: { color: NAVY100 }, line: { type: "none" } });
  s.addShape("roundRect", { x: tx + tw * 0.3, y: ty, w: tw * 0.4, h: th, rectRadius: 0.21, fill: { color: EM200 }, line: { type: "none" } });
  s.addShape("roundRect", { x: tx + tw * 0.7, y: ty, w: tw * 0.3, h: th, rectRadius: 0.21, fill: { color: EM }, line: { type: "none" } });
  ar(s, "اليوم: 30%", tx + tw * 0.7, ty, tw * 0.3, th, { size: 10.5, f: FS, color: "FFFFFF", align: "center", valign: "middle" });
  ar(s, "الخطة ليوم العرض: 70%", tx + tw * 0.3, ty, tw * 0.4, th, { size: 10.5, f: FS, color: EM700, align: "center", valign: "middle" });
  ar(s, "النموذج الأولي يعمل من واجهة المستخدم — والمرحلة القادمة ربط البيانات الحية وتفعيل الأدوات المالية المتقدمة",
    tx, 6.82, tw, 0.3, { size: 9.5, f: FM, color: TEXT2, align: "center" });
}

/* ============================================================
   S14 — DEMO  اللقطات والفيديوهات
============================================================ */
{
  const s = pres.addSlide({ masterName: "CONTENT" });
  header(s, "اللقطات والفيديوهات والمحاكاة", "النموذج الأولي يعمل عبر واجهة المستخدم — لقطة حية من المنصة");
  // screenshot in browser frame (left side; caption column right = RTL first)
  const fx = MX, fw = 7.9, fy = 1.7, fh = 5.15;
  card(s, fx, fy, fw, fh, { noLine: false });
  // browser chrome bar
  s.addShape("roundRect", { x: fx, y: fy, w: fw, h: 0.42, rectRadius: 0.09, fill: { color: NAVY50 }, line: { color: BORDER, width: 0.75 } });
  ["EF233C", "F59E0B", "07966F"].forEach((c, i) => {
    s.addShape("ellipse", { x: fx + 0.25 + i * 0.24, y: fy + 0.14, w: 0.14, h: 0.14, fill: { color: c }, line: { type: "none" } });
  });
  s.addImage({ path: `${A}/app-shot.png`, x: fx + 0.06, y: fy + 0.46, w: fw - 0.12, h: fh - 0.55, sizing: { type: "contain", w: fw - 0.12, h: fh - 0.55 } });
  // right column
  const rx = fx + fw + 0.4, rw = W - MX - rx;
  card(s, rx, 1.7, rw, 2.15);
  iconCircle(s, "ic-play-circle-07966f", rx + rw / 2, 2.3, 0.8, EM50);
  ar(s, "فيديو مبدئي للنظام", rx + 0.2, 2.85, rw - 0.4, 0.4, { size: 13.5, bold: true, color: NAVY, align: "center" });
  s.addText("اضغط لمشاهدة العرض", {
    x: rx + 0.2, y: 3.3, w: rw - 0.4, h: 0.4, margin: 0, align: "center", valign: "middle",
    fontFace: FS, fontSize: 12, color: EM, underline: true, rtlMode: true, lang: "ar-SA", isTextBox: true,
    hyperlink: { url: "https://drive.google.com/file/d/1EAuhln4EobiPMaurYdSCbPzrmnPThplv/view?usp=sharing" },
  });
  const notes = [
    "واجهة عربية كاملة (RTL) بهوية فهيم",
    "محادثة موثقة بالمصادر مع لوحة المخرجات",
    "مذكرات ونماذج جاهزة للتنزيل",
  ];
  card(s, rx, 4.05, rw, 2.8);
  ar(s, "ما ستشاهده في العرض", rx + 0.25, 4.28, rw - 0.5, 0.4, { size: 12.5, bold: true, color: NAVY });
  notes.forEach((t, i) => {
    const y = 4.78 + i * 0.62;
    s.addShape("ellipse", { x: rx + rw - 0.42, y: y + 0.1, w: 0.12, h: 0.12, fill: { color: EM }, line: { type: "none" } });
    ar(s, t, rx + 0.25, y, rw - 0.85, 0.6, { size: 10.5, color: TEXT2 });
  });
}

/* ============================================================
   S15 — CHALLENGES & ROADMAP
============================================================ */
{
  const s = pres.addSlide({ masterName: "CONTENT" });
  header(s, "التحديات والخطط المستقبلية");
  const cols = [
    {
      icon: "triangle-alert-b45309", chip: "التحديات", chipFill: AMBER50, chipColor: AMBER, dot: AMBER,
      items: [
        "اعتمادات بعض الواجهات (API) تستغرق وقتًا طويلًا",
        "حدود الاستدعاءات في الباقات المجانية لبيانات السوق اللحظية",
        "عدم توفر مصادر API مجانية أو سهلة الوصول لخدمات التحليل المالي",
      ],
    },
    {
      icon: "handshake-07966f", chip: "ما نحتاج المساعدة فيه", chipFill: EM50, chipColor: EM700, dot: EM,
      items: [
        "تسريع اعتماد مفاتيح الواجهات خلال فترة البرنامج، ومفاتيح لواجهات متعاونة مع طويق أو بنك الإنماء",
        "جلسات إرشاد مع خبراء الائتمان والتمويل والاستثمار والمصرفية المفتوحة",
        "الوصول إلى بيئة اختبار المصرفية المفتوحة لتجربة المشروع مع عملاء حقيقيين",
      ],
    },
    {
      icon: "route-061f52", chip: "خارطة الطريق", chipFill: NAVY100, chipColor: NAVY, dot: NAVY,
      items: [
        "الأسبوعان القادمان (70%): ربط البيانات الحية، خط توليد المذكرات، وواجهة المحادثة",
        "يوم العرض: عرض حي متكامل يُظهر قوة وذكاء فهيم وكيف يخدم المصرفي والمستثمر السعودي",
        "ما بعد الهاكاثون: موصلات مصرفية مفتوحة مرخصة، شراكات بنكية واستثمارية، وبيئة اختبار حقيقية",
      ],
    },
  ];
  const cw = 3.86, gap = 0.21, y = 1.75, ch = 4.85;
  cols.forEach((c, i) => {
    const x = W - MX - cw - i * (cw + gap);
    card(s, x, y, cw, ch);
    s.addShape("roundRect", { x: x + 0.3, y: y + 0.3, w: cw - 0.6, h: 0.56, rectRadius: 0.09, fill: { color: c.chipFill }, line: { type: "none" } });
    s.addImage({ path: `${A}/ic-${c.icon}.png`, x: x + cw - 0.75, y: y + 0.44, w: 0.28, h: 0.28 });
    ar(s, c.chip, x + 0.4, y + 0.3, cw - 1.28, 0.56, { size: 12.5, bold: true, color: c.chipColor, valign: "middle" });
    c.items.forEach((t, j) => {
      const iy = y + 1.12 + j * 1.08;
      s.addShape("ellipse", { x: x + cw - 0.46, y: iy + 0.1, w: 0.12, h: 0.12, fill: { color: c.dot }, line: { type: "none" } });
      ar(s, t, x + 0.3, iy, cw - 0.9, 1.0, { size: 10.5, color: TEXT2, lsm: 1.28 });
    });
  });
}

/* ============================================================
   S16 — THANKS  شكرًا
============================================================ */
{
  const s = pres.addSlide({ masterName: "DARK" });
  facets(s);
  const hw = 1.7, hh = hw * (701 / 1146);
  s.addImage({ path: `${A}/amad-hackathon.png`, x: (W - hw) / 2, y: 0.75, w: hw, h: hh });
  ar(s, "شكرًا", MX, 2.6, CW, 1.5, { size: 76, f: SERIF, bold: true, color: "FFFFFF", align: "center" });
  const gh = 0.5, gw = gh * GLYPH_AR;
  s.addImage({ path: `${A}/faheem-glyph-reverse.png`, x: (W - gw) / 2 - 1.1, y: 4.55, w: gw, h: gh });
  ar(s, "فريق لونار — منصة فهيم", (W - 4) / 2 + 0.35, 4.52, 4, 0.55, { size: 16, f: FM, color: EM300, align: "center", valign: "middle" });
  const tw = 1.6, th = tw * (401 / 2048);
  s.addImage({ path: `${A}/sponsor-wide.png`, x: W - MX - tw - 0.1, y: 6.6, w: tw, h: th });
  const aw2 = 1.05, ah2 = aw2 * (777 / 2048);
  s.addImage({ path: `${A}/sponsor-tall.png`, x: MX, y: 6.55, w: aw2, h: ah2 });
}

await pres.writeFile({ fileName: "faheem-deck-ar.pptx" });
console.log("written: faheem-deck-ar.pptx");
