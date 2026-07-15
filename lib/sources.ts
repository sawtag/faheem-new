/**
 * Data-source taxonomy — the single source of truth for the composer's nested
 * "All sources" picker (external market data · broker research · internal
 * systems). The picker groups, master toggles, submenu rows and hover tooltips
 * all derive from this array.
 *
 * To add a data source, append one entry here — the composer picker, toggles,
 * and tooltips derive from it. Nothing else needs editing.
 *
 * Icon policy (AGENTS.md assets rule): providers with a crisp vendored brand
 * glyph in `public/logos/connectors/` (see its manifest.json for provenance)
 * use an `image` icon, rendered bare at row size; providers whose sourced
 * asset reads as mush at 20px (full lockups, faint seals, washed crops) and
 * the ones sourcing failed for keep monogram tiles (initial + navy/accent
 * tint, the same shape lib/connectors.ts uses); generic concepts use lucide
 * icons. Tile initials are FIXED per entry regardless of locale.
 *
 * Order matters: within each group GCC/local providers come first, then the
 * international set. `external` → `broker` → `internal` is the picker's group
 * order too.
 */
import type { Localized } from "@/lib/types";

export type SourceGroup = "external" | "broker" | "internal";

/** The picker's group order (also the order groups render in level 1). */
export const SOURCE_GROUPS: readonly SourceGroup[] = [
  "external",
  "broker",
  "internal",
];

/**
 * A source's tile/icon. Mirrors lib/connectors.ts's discriminated `ConnectorTile`
 * shape rather than parallel optional fields: `monogram` (letter tile),
 * `lucide` (kebab icon name) or `image` (vendored brand glyph, rendered bare).
 */
export type SourceIcon =
  | { kind: "monogram"; initial: string; tint?: "navy" | "accent" }
  | { kind: "lucide"; name: string }
  | { kind: "image"; src: string };

export interface Source {
  id: string;
  name: Localized;
  description: Localized;
  group: SourceGroup;
  icon: SourceIcon;
  /** Canonical provider/developer page — the bare domain shows in the picker
   *  tooltip as a credibility signal (text only, never a live link). */
  url?: string;
  /** initial toggle state — defaults ON when omitted. */
  defaultOn?: boolean;
}

export const SOURCES: Source[] = [
  // ── External · market data & filings (GCC/local first) ──────────────────
  {
    id: "sahmk",
    url: "https://www.sahmk.sa/developers/docs",
    name: { en: "SAHMK", ar: "سهمك" },
    description: {
      en: "Real-time Tadawul market data — TASI and Nomu quotes, financials, and announcements.",
      ar: "بيانات تداول اللحظية — أسعار تاسي ونمو والقوائم المالية والإعلانات.",
    },
    group: "external",
    icon: { kind: "image", src: "/logos/connectors/sahmk.png" },
  },
  {
    id: "wamid",
    url: "https://www.wamid.sa",
    name: { en: "WAMID DataHub", ar: "واميد" },
    description: {
      en: "Institutional Saudi capital-market datasets from the Saudi Tadawul Group.",
      ar: "بيانات مؤسسية لأسواق المال السعودية من مجموعة تداول السعودية.",
    },
    group: "external",
    icon: { kind: "monogram", initial: "و", tint: "accent" },
  },
  {
    id: "wathq",
    url: "https://developer.wathq.sa",
    name: { en: "Wathq", ar: "وثق" },
    description: {
      en: "Ministry of Commerce APIs — commercial registry, ownership, and national-address lookups.",
      ar: "واجهات وزارة التجارة — السجل التجاري والملكية والعنوان الوطني.",
    },
    group: "external",
    icon: { kind: "monogram", initial: "و", tint: "navy" },
  },
  {
    id: "argaam-plus",
    url: "https://www.argaamplus.com",
    name: { en: "Argaam Plus", ar: "أرقام بلس" },
    description: {
      en: "Full Tadawul financials, analyst estimates, and market analytics.",
      ar: "القوائم المالية الكاملة لتداول وتقديرات المحللين وتحليلات السوق.",
    },
    group: "external",
    icon: { kind: "monogram", initial: "أ", tint: "accent" },
  },
  {
    id: "mubasher",
    url: "https://estore.directfn.sa",
    name: { en: "Mubasher (DirectFN)", ar: "مباشر" },
    description: {
      en: "Real-time and end-of-day price feeds plus news for 80+ markets including Tadawul.",
      ar: "أسعار لحظية ونهاية اليوم وأخبار لأكثر من 80 سوقًا من بينها تداول.",
    },
    group: "external",
    icon: { kind: "image", src: "/logos/connectors/mubasher.svg" },
  },
  {
    id: "sama-open-data",
    url: "https://www.sama.gov.sa/en-US/EconomicReports/pages/database.aspx",
    name: { en: "SAMA Open Data", ar: "ساما — البيانات المفتوحة" },
    description: {
      en: "Official Saudi Central Bank statistics — rates, FX, and banking-sector data.",
      ar: "إحصاءات البنك المركزي السعودي الرسمية — الأسعار والصرف والقطاع المصرفي.",
    },
    group: "external",
    icon: { kind: "monogram", initial: "س", tint: "accent" },
  },
  {
    id: "gastat",
    url: "https://database.stats.gov.sa",
    name: { en: "GASTAT", ar: "الهيئة العامة للإحصاء" },
    description: {
      en: "Saudi official statistics API — economy, demographics, and labor market.",
      ar: "واجهة الإحصاءات الرسمية السعودية — الاقتصاد والسكان وسوق العمل.",
    },
    group: "external",
    icon: { kind: "monogram", initial: "إ", tint: "navy" },
  },
  {
    id: "lean",
    url: "https://dev.leantech.me",
    name: { en: "Lean Technologies", ar: "لين تكنولوجيز" },
    description: {
      en: "SAMA-licensed open-banking APIs for bank account and transaction data.",
      ar: "واجهات مصرفية مفتوحة مرخصة من ساما لبيانات الحسابات والمعاملات.",
    },
    group: "external",
    icon: { kind: "image", src: "/logos/connectors/lean.svg" },
  },
  {
    id: "zawya",
    url: "https://www.zawya.com",
    name: { en: "Zawya (LSEG)", ar: "زاوية (LSEG)" },
    description: {
      en: "MENA business and capital-markets intelligence.",
      ar: "معلومات الأعمال وأسواق المال في الشرق الأوسط وشمال أفريقيا.",
    },
    group: "external",
    icon: { kind: "monogram", initial: "ز", tint: "navy" },
  },
  {
    id: "earnings",
    name: { en: "Earnings", ar: "مكالمات النتائج" },
    description: {
      en: "Earnings-call transcripts and management commentary.",
      ar: "نصوص مكالمات النتائج وتعليقات الإدارة.",
    },
    group: "external",
    icon: { kind: "lucide", name: "phone-call" },
  },
  {
    id: "sec-filings",
    url: "https://www.sec.gov/search-filings/edgar-application-programming-interfaces",
    name: { en: "SEC Filings", ar: "إفصاحات SEC" },
    description: {
      en: "Filings from the U.S. Securities and Exchange Commission — 10-K, 10-Q, 8-K, and more.",
      ar: "إفصاحات هيئة الأوراق المالية الأمريكية — 10-K و10-Q و8-K وغيرها.",
    },
    group: "external",
    icon: { kind: "lucide", name: "landmark" },
  },
  {
    id: "investor-presentations",
    name: { en: "Investor Presentations", ar: "عروض المستثمرين" },
    description: {
      en: "Company decks and investor-relations materials.",
      ar: "عروض الشركات ومواد علاقات المستثمرين.",
    },
    group: "external",
    icon: { kind: "lucide", name: "presentation" },
  },
  {
    id: "web",
    name: { en: "Web", ar: "الويب" },
    description: {
      en: "Live web search across public sources.",
      ar: "بحث مباشر عبر المصادر العامة.",
    },
    group: "external",
    icon: { kind: "lucide", name: "globe" },
  },
  {
    id: "pitchbook",
    url: "https://pitchbook.com/products/direct-access-data",
    name: { en: "PitchBook", ar: "PitchBook" },
    description: {
      en: "Private-market intelligence — company firmographics, latest financing, active investors, and fund data.",
      ar: "معلومات الأسواق الخاصة — بيانات الشركات وآخر جولات التمويل والمستثمرين النشطين وبيانات الصناديق.",
    },
    group: "external",
    icon: { kind: "monogram", initial: "P", tint: "accent" },
  },
  {
    id: "capital-iq",
    url: "https://www.spglobal.com/market-intelligence/en/solutions/products/sp-capital-iq-pro",
    name: { en: "Capital IQ", ar: "Capital IQ" },
    description: {
      en: "Fundamentals, estimates, and market data from S&P Capital IQ.",
      ar: "البيانات الأساسية والتقديرات وبيانات السوق من S&P Capital IQ.",
    },
    group: "external",
    icon: { kind: "image", src: "/logos/connectors/capital-iq.svg" },
  },
  {
    id: "crunchbase",
    url: "https://data.crunchbase.com",
    name: { en: "Crunchbase", ar: "Crunchbase" },
    description: {
      en: "Startup and private-company profiles, funding rounds, and investors.",
      ar: "ملفات الشركات الناشئة والخاصة وجولات التمويل والمستثمرون.",
    },
    group: "external",
    icon: { kind: "image", src: "/logos/connectors/crunchbase.png" },
  },
  {
    id: "third-bridge",
    url: "https://www.thirdbridge.com/en-us/services/library",
    name: { en: "Third Bridge Library", ar: "مكتبة Third Bridge" },
    description: {
      en: "Expert-network transcripts from Third Bridge interviews with industry specialists.",
      ar: "نصوص مقابلات شبكة الخبراء مع متخصصي القطاعات.",
    },
    group: "external",
    icon: { kind: "image", src: "/logos/connectors/third-bridge.png" },
  },
  {
    id: "international-filings",
    name: { en: "International Filings", ar: "الإفصاحات الدولية" },
    description: {
      en: "Regulatory filings from international exchanges and regulators.",
      ar: "إفصاحات تنظيمية من البورصات والجهات الرقابية الدولية.",
    },
    group: "external",
    icon: { kind: "lucide", name: "file-text" },
  },
  {
    id: "companies-house",
    url: "https://developer.company-information.service.gov.uk",
    name: { en: "UK Companies House", ar: "سجل الشركات البريطاني" },
    description: {
      en: "UK company registry — filings, officers, and ownership.",
      ar: "سجل الشركات في المملكة المتحدة — الإفصاحات والمديرون والملكية.",
    },
    group: "external",
    icon: { kind: "image", src: "/logos/connectors/companies-house.svg" },
  },

  // ── Broker research (Saudi/MENA sell-side houses) ───────────────────────
  {
    id: "snb-capital",
    url: "https://research.snbcapital.com/web/snb-research",
    name: { en: "SNB Capital", ar: "الأهلي المالية" },
    description: {
      en: "Saudi equity research and sector coverage.",
      ar: "أبحاث الأسهم السعودية وتغطية القطاعات.",
    },
    group: "broker",
    icon: { kind: "image", src: "/logos/connectors/snb-capital.png" },
  },
  {
    id: "alrajhi-capital",
    url: "https://alrajhi-capital.sa/research",
    name: { en: "Al Rajhi Capital", ar: "الراجحي المالية" },
    description: {
      en: "Saudi sell-side equity research and market strategy.",
      ar: "أبحاث الأسهم السعودية واستراتيجية السوق.",
    },
    group: "broker",
    icon: { kind: "image", src: "/logos/connectors/alrajhi-capital.png" },
  },
  {
    id: "jadwa",
    url: "https://www.jadwa.com/en/section/research",
    name: { en: "Jadwa Investment", ar: "جدوى للاستثمار" },
    description: {
      en: "Macro research and sector reports on the Saudi economy.",
      ar: "أبحاث الاقتصاد الكلي وتقارير القطاعات في السعودية.",
    },
    group: "broker",
    icon: { kind: "monogram", initial: "J", tint: "navy" },
  },
  {
    id: "riyad-capital",
    url: "https://www.riyadcapital.com/research-reports",
    name: { en: "Riyad Capital", ar: "الرياض المالية" },
    description: {
      en: "Equity research and initiations across TASI sectors.",
      ar: "أبحاث الأسهم والتغطيات الجديدة في قطاعات تاسي.",
    },
    group: "broker",
    icon: { kind: "image", src: "/logos/connectors/riyad-capital.png" },
  },
  {
    id: "efg-hermes",
    url: "https://www.efg-hermes.com/en/our-services/research",
    name: { en: "EFG Hermes", ar: "إي إف جي هيرميس" },
    description: {
      en: "MENA-wide sell-side research and strategy.",
      ar: "أبحاث واستراتيجية على مستوى الشرق الأوسط وشمال أفريقيا.",
    },
    group: "broker",
    icon: { kind: "image", src: "/logos/connectors/efg-hermes.png" },
  },

  // ── Internal · the firm's own systems (native corpus first) ─────────────
  {
    id: "dataroom",
    name: { en: "Lunar Data Room", ar: "غرفة بيانات لونار" },
    description: {
      en: "Deal documents and internal files.",
      ar: "مستندات الصفقات والملفات الداخلية.",
    },
    group: "internal",
    icon: { kind: "lucide", name: "folder-lock" },
  },
  {
    id: "templates",
    name: { en: "Templates", ar: "القوالب" },
    description: {
      en: "Lunar-branded memo, model and deck templates.",
      ar: "قوالب المذكرات والنماذج والعروض بعلامة لونار.",
    },
    group: "internal",
    icon: { kind: "lucide", name: "layout-template" },
  },
  {
    id: "mandate",
    name: { en: "Mandate", ar: "التفويض" },
    description: {
      en: "Your IC Charter — cited back in every decision.",
      ar: "ميثاق لجنة الاستثمار — يُستشهد به في كل قرار.",
    },
    group: "internal",
    icon: { kind: "lucide", name: "scroll-text" },
  },
  {
    id: "org-analytics",
    name: { en: "Organization Analytics", ar: "تحليلات المؤسسة" },
    description: {
      en: "Usage and knowledge analytics across your firm's workspace.",
      ar: "تحليلات الاستخدام والمعرفة عبر مساحة عمل شركتك.",
    },
    group: "internal",
    icon: { kind: "lucide", name: "chart-line" },
  },
  {
    id: "shared-folder",
    name: { en: "Windows Shared Folder", ar: "مجلد Windows المشترك" },
    description: {
      en: "Deal files on the firm's network shares.",
      ar: "ملفات الصفقات على مجلدات الشبكة الداخلية للشركة.",
    },
    group: "internal",
    icon: { kind: "lucide", name: "hard-drive" },
  },
  {
    id: "sharepoint",
    url: "https://learn.microsoft.com/en-us/graph",
    name: { en: "SharePoint", ar: "SharePoint" },
    description: {
      en: "Team sites, memos, and document libraries.",
      ar: "مواقع الفرق والمذكرات ومكتبات المستندات.",
    },
    group: "internal",
    icon: { kind: "image", src: "/logos/connectors/sharepoint.svg" },
  },
  {
    id: "onedrive",
    url: "https://learn.microsoft.com/en-us/graph",
    name: { en: "OneDrive", ar: "OneDrive" },
    description: {
      en: "Analysts' synced working files.",
      ar: "ملفات العمل المتزامنة للمحللين.",
    },
    group: "internal",
    icon: { kind: "image", src: "/logos/connectors/onedrive.svg" },
  },
  {
    id: "outlook",
    url: "https://learn.microsoft.com/en-us/graph",
    name: { en: "Outlook", ar: "Outlook" },
    description: {
      en: "Deal-team email threads and attachments.",
      ar: "سلاسل بريد فريق الصفقة والمرفقات.",
    },
    group: "internal",
    icon: { kind: "image", src: "/logos/connectors/outlook.svg" },
  },
  {
    id: "teams",
    url: "https://learn.microsoft.com/en-us/graph",
    name: { en: "Microsoft Teams", ar: "Microsoft Teams" },
    description: {
      en: "Deal-channel messages and shared files.",
      ar: "رسائل قنوات الصفقات والملفات المشتركة.",
    },
    group: "internal",
    icon: { kind: "image", src: "/logos/connectors/teams.svg" },
  },
  {
    id: "gmail",
    url: "https://developers.google.com",
    name: { en: "Gmail", ar: "Gmail" },
    description: {
      en: "Deal-related mail and attachments.",
      ar: "البريد المرتبط بالصفقات والمرفقات.",
    },
    group: "internal",
    icon: { kind: "image", src: "/logos/connectors/gmail.svg" },
  },
  {
    id: "google-calendar",
    url: "https://developers.google.com",
    name: { en: "Google Calendar", ar: "تقويم Google" },
    description: {
      en: "Meetings, IC dates, and roadshow schedules.",
      ar: "الاجتماعات ومواعيد لجنة الاستثمار وجداول الجولات الترويجية.",
    },
    group: "internal",
    icon: { kind: "image", src: "/logos/connectors/google-calendar.svg" },
  },
  {
    id: "gdrive",
    url: "https://developers.google.com",
    name: { en: "Google Drive", ar: "Google Drive" },
    description: {
      en: "Shared drives and working documents.",
      ar: "المجلدات المشتركة ومستندات العمل.",
    },
    group: "internal",
    icon: { kind: "image", src: "/logos/connectors/gdrive.svg" },
  },
  {
    id: "slack",
    url: "https://api.slack.com",
    name: { en: "Slack", ar: "Slack" },
    description: {
      en: "Deal-desk channels and pinned decisions.",
      ar: "قنوات مكتب الصفقات والقرارات المثبتة.",
    },
    group: "internal",
    icon: { kind: "image", src: "/logos/connectors/slack.svg" },
  },
  {
    id: "salesforce",
    url: "https://developer.salesforce.com",
    name: { en: "Salesforce", ar: "Salesforce" },
    description: {
      en: "Relationship and pipeline records.",
      ar: "سجلات العلاقات وخط أنابيب الصفقات.",
    },
    group: "internal",
    icon: { kind: "image", src: "/logos/connectors/salesforce.svg" },
  },
  {
    id: "granola",
    url: "https://granola.ai",
    name: { en: "Granola", ar: "Granola" },
    description: {
      en: "AI meeting notes and call transcripts.",
      ar: "ملاحظات الاجتماعات ونصوص المكالمات بالذكاء الاصطناعي.",
    },
    group: "internal",
    icon: { kind: "image", src: "/logos/connectors/granola.png" },
  },
];

/** Sources in one group, in declared (curated) order. */
export function sourcesInGroup(group: SourceGroup): Source[] {
  return SOURCES.filter((s) => s.group === group);
}
