/**
 * Connector catalog — the single source of truth for the Connections page
 * (`/connections`) and the onboarding stepper's Connect step (`/onboarding`).
 * Both surfaces render the SAME array in the SAME order (AGENTS.md asset
 * policy: connector tiles/copy are data, never inline in JSX).
 *
 * `group` distinguishes Lunar's own systems from third-party/market sources —
 * unused by this task's screens but kept so the home omnibox source-picker
 * (spec §4 item 2, a different task) can reuse this module rather than
 * redefining the catalog.
 *
 * Tile letters are FIXED per connector regardless of locale (design-briefs
 * §2.7: "monogram letters never flip") — always set explicitly, never derived
 * from the localized name's first character.
 *
 * `simple-icons` (16.26.0) has no glyphs for Bloomberg, PitchBook, Intralinks,
 * Datasite, Capital IQ or marketaux (verified against the package's icon
 * data — these are enterprise/fintech brands outside its consumer-tech-heavy
 * catalog). Those five + marketaux fall back to the monogram tile, same as
 * every Saudi connector without a clean SVG (AGENTS.md assets policy).
 */
import type { Localized } from "@/lib/types";

export type ConnectorGroup = "internal" | "external";
export type ConnectorStatus = "connected" | "available";
export type ConnectorBadge = "beta" | "mvp";

export type ConnectorTile =
  | { kind: "monogram"; initial: string; tint?: "navy" | "accent" }
  | { kind: "icon"; icon: "layout-template"; tint?: "navy" | "accent" };

export interface Connector {
  id: string;
  name: Localized;
  /** row/card one-liner */
  description: Localized;
  /** hover tooltip — one sentence (design-briefs §2.9 wow detail #1) */
  tooltip: Localized;
  group: ConnectorGroup;
  status: ConnectorStatus;
  badge?: ConnectorBadge;
  tile: ConnectorTile;
}

export const CONNECTORS: Connector[] = [
  // ── Connected ──────────────────────────────────────────────────────────
  {
    id: "saudi-exchange",
    name: { en: "Saudi Exchange Disclosures", ar: "إفصاحات تداول" },
    description: {
      en: "Official Tadawul filings & announcements",
      ar: "إفصاحات وإعلانات تداول الرسمية",
    },
    tooltip: {
      en: "Official Tadawul filings, disclosures and announcements — Faheem's primary public-market source.",
      ar: "إفصاحات تداول الرسمية — مصدر فهيم الأساسي لبيانات السوق العامة.",
    },
    group: "external",
    status: "connected",
    tile: { kind: "monogram", initial: "ت", tint: "navy" },
  },
  {
    id: "argaam",
    name: { en: "Argaam", ar: "أرقام" },
    description: {
      en: "Saudi financial news & market data",
      ar: "أخبار وبيانات السوق المالية السعودية",
    },
    tooltip: {
      en: "Real-time Saudi financial news and market data feeding Faheem's screening and research agents.",
      ar: "أخبار وبيانات السوق المالية السعودية بشكل لحظي، تغذّي وكلاء الفرز والبحث في فهيم.",
    },
    group: "external",
    status: "connected",
    tile: { kind: "monogram", initial: "أ", tint: "accent" },
  },
  {
    id: "marketaux",
    name: { en: "marketaux", ar: "marketaux" },
    description: {
      en: "Global market news API",
      ar: "واجهة أخبار الأسواق العالمية",
    },
    tooltip: {
      en: "Global market news API that broadens Faheem's coverage beyond the Saudi market.",
      ar: "واجهة أخبار عالمية للأسواق توسّع تغطية فهيم إلى ما وراء السوق السعودية.",
    },
    group: "external",
    status: "connected",
    badge: "beta",
    tile: { kind: "monogram", initial: "M", tint: "navy" },
  },
  {
    id: "lunar-data-room",
    name: { en: "Lunar Data Room", ar: "غرفة بيانات لونار" },
    description: {
      en: "Deal documents & internal files",
      ar: "مستندات الصفقات والملفات الداخلية",
    },
    tooltip: {
      en: "Lunar's own deal documents and internal files — the private corpus behind every workspace.",
      ar: "مستندات الصفقات والملفات الداخلية الخاصة بلونار — القاعدة الخاصة وراء كل مساحة عمل.",
    },
    group: "internal",
    status: "connected",
    tile: { kind: "monogram", initial: "L", tint: "navy" },
  },
  {
    id: "templates",
    name: { en: "Templates", ar: "القوالب" },
    description: {
      en: "Lunar-branded memo, model & deck templates",
      ar: "قوالب المذكرات والنماذج والعروض بهوية لونار",
    },
    tooltip: {
      en: "Lunar-branded memo, model and deck templates so every deliverable ships house-styled.",
      ar: "قوالب المذكرات والنماذج والعروض بهوية لونار، لضمان مخرجات موحّدة الطابع.",
    },
    group: "internal",
    status: "connected",
    tile: { kind: "icon", icon: "layout-template", tint: "navy" },
  },

  // ── Available ──────────────────────────────────────────────────────────
  {
    id: "sahmk",
    name: { en: "SAHMK API", ar: "سهمك" },
    description: {
      en: "350+ Tadawul companies, fundamentals & prices",
      ar: "أكثر من 350 شركة مدرجة في تداول — بيانات أساسية وأسعار",
    },
    tooltip: {
      en: "Fundamentals and live prices for 350+ Tadawul-listed companies.",
      ar: "بيانات أساسية وأسعار لحظية لأكثر من 350 شركة مدرجة في تداول.",
    },
    group: "external",
    status: "available",
    badge: "mvp",
    tile: { kind: "monogram", initial: "س", tint: "navy" },
  },
  {
    id: "bloomberg",
    name: { en: "Bloomberg", ar: "Bloomberg" },
    description: {
      en: "Terminal data & analytics",
      ar: "بيانات وتحليلات بلومبرغ تيرمنال",
    },
    tooltip: {
      en: "Terminal-grade market data and analytics for deeper cross-asset coverage.",
      ar: "بيانات وتحليلات سوقية بمستوى بلومبرغ تيرمنال لتغطية أوسع لفئات الأصول.",
    },
    group: "external",
    status: "available",
    tile: { kind: "monogram", initial: "B" },
  },
  {
    id: "pitchbook",
    name: { en: "PitchBook", ar: "PitchBook" },
    description: { en: "Private-market data", ar: "بيانات الأسواق الخاصة" },
    tooltip: {
      en: "Private-market data — deal comps, valuations and investor activity.",
      ar: "بيانات الأسواق الخاصة — الصفقات المماثلة والتقييمات ونشاط المستثمرين.",
    },
    group: "external",
    status: "available",
    tile: { kind: "monogram", initial: "P" },
  },
  {
    id: "intralinks",
    name: { en: "Intralinks", ar: "Intralinks" },
    description: { en: "Virtual data rooms", ar: "غرف بيانات افتراضية" },
    tooltip: {
      en: "Secure virtual data rooms for due-diligence document exchange.",
      ar: "غرف بيانات افتراضية آمنة لتبادل مستندات الفحص النافي للجهالة.",
    },
    group: "external",
    status: "available",
    tile: { kind: "monogram", initial: "I" },
  },
  {
    id: "datasite",
    name: { en: "Datasite", ar: "Datasite" },
    description: { en: "Virtual data rooms", ar: "غرف بيانات افتراضية" },
    tooltip: {
      en: "Secure virtual data rooms for due-diligence document exchange.",
      ar: "غرف بيانات افتراضية آمنة لتبادل مستندات الفحص النافي للجهالة.",
    },
    group: "external",
    status: "available",
    tile: { kind: "monogram", initial: "D" },
  },
  {
    id: "od-data-gov-sa",
    name: { en: "od.data.gov.sa", ar: "od.data.gov.sa" },
    description: {
      en: "Saudi open government data",
      ar: "البيانات الحكومية المفتوحة السعودية",
    },
    tooltip: {
      en: "Saudi Arabia's open government data platform — public datasets across sectors.",
      ar: "منصة البيانات الحكومية المفتوحة في السعودية — بيانات عامة تغطي مختلف القطاعات.",
    },
    group: "external",
    status: "available",
    tile: { kind: "monogram", initial: "ب", tint: "navy" },
  },
  {
    id: "rega",
    name: { en: "REGA", ar: "الهيئة العامة للعقار" },
    description: {
      en: "Real-estate market indicators",
      ar: "مؤشرات سوق العقار",
    },
    tooltip: {
      en: "Real-estate market indicators from Saudi Arabia's real estate authority.",
      ar: "مؤشرات سوق العقار الصادرة عن الهيئة العامة للعقار.",
    },
    group: "external",
    status: "available",
    tile: { kind: "monogram", initial: "ع", tint: "navy" },
  },
  {
    id: "gastat",
    name: { en: "GASTAT", ar: "الهيئة العامة للإحصاء" },
    description: {
      en: "Official statistics publications — synced to the data room",
      ar: "إصدارات إحصائية رسمية — مرتبطة بغرفة البيانات",
    },
    tooltip: {
      en: "Official Saudi statistics — the authoritative source for macro and sector indicators.",
      ar: "الإحصاءات الرسمية السعودية — المصدر المعتمد للمؤشرات الكلية والقطاعية.",
    },
    group: "external",
    status: "connected",
    tile: { kind: "monogram", initial: "إ", tint: "navy" },
  },
  {
    id: "alinma-open-banking",
    name: {
      en: "Alinma Open Banking",
      ar: "الإنماء — الخدمات المصرفية المفتوحة",
    },
    description: {
      en: "Books & ERP via SAMA open-banking framework",
      ar: "الدفاتر وتخطيط الموارد عبر إطار الخدمات المصرفية المفتوحة لساما",
    },
    tooltip: {
      en: "Books and ERP data via SAMA's open-banking framework.",
      ar: "بيانات الدفاتر وتخطيط الموارد عبر إطار الخدمات المصرفية المفتوحة لدى ساما.",
    },
    group: "external",
    status: "available",
    badge: "mvp",
    tile: { kind: "monogram", initial: "ا", tint: "accent" },
  },
  {
    id: "capital-iq",
    name: { en: "Capital IQ", ar: "Capital IQ" },
    description: {
      en: "Company financials & screening",
      ar: "بيانات مالية للشركات وفرز",
    },
    tooltip: {
      en: "Company financials and screening for comps and precedent-transaction work.",
      ar: "بيانات مالية للشركات وأدوات فرز لأعمال المقارنات والصفقات السابقة.",
    },
    group: "external",
    status: "available",
    tile: { kind: "monogram", initial: "C" },
  },
];
