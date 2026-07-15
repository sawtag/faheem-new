/**
 * Connector catalog, the single source of truth for the Connections page
 * (`/connections`) and the onboarding stepper's Connect step (`/onboarding`).
 * Both surfaces render the SAME array in the SAME order (AGENTS.md asset
 * policy: connector tiles/copy are data, never inline in JSX).
 *
 * `group` distinguishes Lunar's own systems from third-party/market sources,
 * unused by this task's screens but kept so the home omnibox source-picker
 * (spec §4 item 2, a different task) can reuse this module rather than
 * redefining the catalog.
 *
 * Tile letters are FIXED per connector regardless of locale (design-briefs
 * §2.7: "monogram letters never flip"), always set explicitly, never derived
 * from the localized name's first character.
 *
 * Brand logos are vendored under `public/logos/connectors/` (see its
 * manifest.json for per-file provenance) and referenced as `image` tiles;
 * brands whose sourced asset is mush at tile size (full lockups, faint seals,
 * washed crops) or that sourcing failed for (Bloomberg, PitchBook, Intralinks,
 * Datasite, marketaux, WAMID) fall back to the monogram tile, same as every
 * Saudi connector without a clean SVG (AGENTS.md assets policy).
 *
 * Ordering (standing user rule): within each status section, Saudi/local
 * connectors sort ABOVE international ones.
 */
import type { Localized } from "@/lib/types";

export type ConnectorGroup = "internal" | "external";
export type ConnectorStatus = "connected" | "available";
export type ConnectorBadge = "beta" | "mvp";

export type ConnectorTile =
  | { kind: "monogram"; initial: string; tint?: "navy" | "accent" }
  | { kind: "icon"; icon: "layout-template"; tint?: "navy" | "accent" }
  | { kind: "image"; src: string };

export interface Connector {
  id: string;
  name: Localized;
  /** row/card one-liner */
  description: Localized;
  /** hover tooltip, one sentence (design-briefs §2.9 wow detail #1) */
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
      en: "Official Tadawul filings, disclosures and announcements, Faheem's primary public-market source.",
      ar: "إفصاحات تداول الرسمية، مصدر فهيم الأساسي لبيانات السوق العامة.",
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
    id: "sahmk",
    name: { en: "SAHMK API", ar: "سهمك" },
    description: {
      en: "350+ Tadawul companies, fundamentals & prices",
      ar: "أكثر من 350 شركة مدرجة في تداول، بيانات أساسية وأسعار",
    },
    tooltip: {
      en: "Fundamentals and live prices for 350+ Tadawul-listed companies.",
      ar: "بيانات أساسية وأسعار لحظية لأكثر من 350 شركة مدرجة في تداول.",
    },
    group: "external",
    status: "connected",
    tile: { kind: "image", src: "/logos/connectors/sahmk.png" },
  },
  {
    id: "gastat",
    name: { en: "GASTAT", ar: "الهيئة العامة للإحصاء" },
    description: {
      en: "Official statistics publications, synced to the data room",
      ar: "إصدارات إحصائية رسمية، مرتبطة بغرفة البيانات",
    },
    tooltip: {
      en: "Official Saudi statistics, the authoritative source for macro and sector indicators.",
      ar: "الإحصاءات الرسمية السعودية، المصدر المعتمد للمؤشرات الكلية والقطاعية.",
    },
    group: "external",
    status: "connected",
    // Real GASTAT mark on the 40px tile; the picker keeps the monogram (the
    // thin linework fails the crisp bar at 20px, lib/sources.ts).
    tile: { kind: "image", src: "/logos/connectors/gastat.svg" },
  },
  {
    id: "lunar-data-room",
    name: { en: "Lunar Data Room", ar: "غرفة بيانات لونار" },
    description: {
      en: "Deal documents & internal files",
      ar: "مستندات الصفقات والملفات الداخلية",
    },
    tooltip: {
      en: "Lunar's own deal documents and internal files, the private corpus behind every workspace.",
      ar: "مستندات الصفقات والملفات الداخلية الخاصة بلونار، القاعدة الخاصة وراء كل مساحة عمل.",
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
  {
    id: "shared-folder",
    name: { en: "Windows Shared Folder", ar: "مجلد Windows المشترك" },
    description: {
      en: "Deal files on the firm's network shares",
      ar: "ملفات الصفقات على مجلدات الشبكة الداخلية للشركة",
    },
    tooltip: {
      en: "Deal files on the firm's Windows network shares, indexed for search.",
      ar: "ملفات الصفقات على مجلدات شبكة Windows الداخلية، مفهرسة للبحث.",
    },
    group: "internal",
    status: "connected",
    tile: { kind: "monogram", initial: "W", tint: "navy" },
  },
  // International connected, market feeds + workplace systems (the OAuth
  // integrations behind the composer's Internal Sources picker group).
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
    id: "sharepoint",
    name: { en: "SharePoint", ar: "SharePoint" },
    description: {
      en: "Team sites, memos, and document libraries",
      ar: "مواقع الفرق والمذكرات ومكتبات المستندات",
    },
    tooltip: {
      en: "SharePoint team sites, memos and document libraries across the firm.",
      ar: "مواقع فرق SharePoint والمذكرات ومكتبات المستندات عبر الشركة.",
    },
    group: "internal",
    status: "connected",
    tile: { kind: "image", src: "/logos/connectors/sharepoint.svg" },
  },
  {
    id: "onedrive",
    name: { en: "OneDrive", ar: "OneDrive" },
    description: {
      en: "Analysts' synced working files",
      ar: "ملفات العمل المتزامنة للمحللين",
    },
    tooltip: {
      en: "Each analyst's synced OneDrive working files.",
      ar: "ملفات العمل المتزامنة لكل محلل على OneDrive.",
    },
    group: "internal",
    status: "connected",
    tile: { kind: "image", src: "/logos/connectors/onedrive.svg" },
  },
  {
    id: "outlook",
    name: { en: "Outlook", ar: "Outlook" },
    description: {
      en: "Deal-team email threads and attachments",
      ar: "سلاسل بريد فريق الصفقة والمرفقات",
    },
    tooltip: {
      en: "Deal-team Outlook threads and attachments, kept in context.",
      ar: "سلاسل بريد فريق الصفقة ومرفقاته في Outlook، ضمن السياق.",
    },
    group: "internal",
    status: "connected",
    tile: { kind: "image", src: "/logos/connectors/outlook.svg" },
  },
  {
    id: "teams",
    name: { en: "Microsoft Teams", ar: "Microsoft Teams" },
    description: {
      en: "Deal-channel messages and shared files",
      ar: "رسائل قنوات الصفقات والملفات المشتركة",
    },
    tooltip: {
      en: "Microsoft Teams deal-channel messages and shared files.",
      ar: "رسائل قنوات الصفقات والملفات المشتركة على Microsoft Teams.",
    },
    group: "internal",
    status: "connected",
    tile: { kind: "image", src: "/logos/connectors/teams.svg" },
  },
  {
    id: "gmail",
    name: { en: "Gmail", ar: "Gmail" },
    description: {
      en: "Deal-related mail and attachments",
      ar: "البريد المرتبط بالصفقات والمرفقات",
    },
    tooltip: {
      en: "Deal-related Gmail messages and attachments.",
      ar: "رسائل ومرفقات Gmail المرتبطة بالصفقات.",
    },
    group: "internal",
    status: "connected",
    tile: { kind: "image", src: "/logos/connectors/gmail.svg" },
  },
  {
    id: "google-calendar",
    name: { en: "Google Calendar", ar: "تقويم Google" },
    description: {
      en: "Meetings, IC dates, and roadshow schedules",
      ar: "الاجتماعات ومواعيد لجنة الاستثمار وجداول الجولات الترويجية",
    },
    tooltip: {
      en: "Meetings, IC dates and roadshow schedules from Google Calendar.",
      ar: "الاجتماعات ومواعيد لجنة الاستثمار وجداول الجولات من تقويم Google.",
    },
    group: "internal",
    status: "connected",
    tile: { kind: "image", src: "/logos/connectors/google-calendar.svg" },
  },
  {
    id: "gdrive",
    name: { en: "Google Drive", ar: "Google Drive" },
    description: {
      en: "Shared drives and working documents",
      ar: "المجلدات المشتركة ومستندات العمل",
    },
    tooltip: {
      en: "Google Drive shared drives and working documents.",
      ar: "المجلدات المشتركة ومستندات العمل على Google Drive.",
    },
    group: "internal",
    status: "connected",
    tile: { kind: "image", src: "/logos/connectors/gdrive.svg" },
  },
  {
    id: "slack",
    name: { en: "Slack", ar: "Slack" },
    description: {
      en: "Deal-desk channels and pinned decisions",
      ar: "قنوات مكتب الصفقات والقرارات المثبتة",
    },
    tooltip: {
      en: "Slack deal-desk channels and the decisions pinned in them.",
      ar: "قنوات مكتب الصفقات على Slack والقرارات المثبتة فيها.",
    },
    group: "internal",
    status: "connected",
    tile: { kind: "image", src: "/logos/connectors/slack.svg" },
  },
  {
    id: "salesforce",
    name: { en: "Salesforce", ar: "Salesforce" },
    description: {
      en: "Relationship and pipeline records",
      ar: "سجلات العلاقات وخط أنابيب الصفقات",
    },
    tooltip: {
      en: "Salesforce relationship and pipeline records for sourcing context.",
      ar: "سجلات العلاقات وخط أنابيب الصفقات في Salesforce لسياق التوريد.",
    },
    group: "internal",
    status: "connected",
    tile: { kind: "image", src: "/logos/connectors/salesforce.svg" },
  },
  {
    id: "granola",
    name: { en: "Granola", ar: "Granola" },
    description: {
      en: "AI meeting notes and call transcripts",
      ar: "ملاحظات الاجتماعات ونصوص المكالمات بالذكاء الاصطناعي",
    },
    tooltip: {
      en: "AI meeting notes and call transcripts from deal-team calls.",
      ar: "ملاحظات اجتماعات ونصوص مكالمات فريق الصفقة بالذكاء الاصطناعي.",
    },
    group: "internal",
    status: "connected",
    tile: { kind: "image", src: "/logos/connectors/granola.png" },
  },

  // ── Available (Saudi/local first) ──────────────────────────────────────
  {
    id: "od-data-gov-sa",
    name: { en: "od.data.gov.sa", ar: "od.data.gov.sa" },
    description: {
      en: "Saudi open government data",
      ar: "البيانات الحكومية المفتوحة السعودية",
    },
    tooltip: {
      en: "Saudi Arabia's open government data platform, public datasets across sectors.",
      ar: "منصة البيانات الحكومية المفتوحة في السعودية، بيانات عامة تغطي مختلف القطاعات.",
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
    id: "alinma-open-banking",
    name: {
      en: "Alinma Open Banking",
      ar: "الإنماء، الخدمات المصرفية المفتوحة",
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
      en: "Private-market data, deal comps, valuations and investor activity.",
      ar: "بيانات الأسواق الخاصة، الصفقات المماثلة والتقييمات ونشاط المستثمرين.",
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
    tile: { kind: "image", src: "/logos/connectors/capital-iq.svg" },
  },
  {
    id: "social-alt-data",
    name: {
      en: "Social & Alt-Data",
      ar: "المحتوى الاجتماعي والبيانات البديلة",
    },
    description: {
      en: "Real social/forum feeds & alt-data, MVP roadmap",
      ar: "تغذيات اجتماعية ومنتديات وبيانات بديلة حقيقية، على خارطة طريق الإصدار الأولي",
    },
    tooltip: {
      en: "Live social, forum and alt-data feeds for the Market Sentiment agent. Today the agent reads a clearly-labeled illustrative demo pack, this connector is what would replace it in production.",
      ar: "تغذيات حية من المحتوى الاجتماعي والمنتديات والبيانات البديلة لوكيل المزاج السوقي. حالياً يقرأ الوكيل حزمة توضيحية تجريبية مُعلَّمة بوضوح، وهذا الموصّل هو ما سيحل محلها في الإنتاج.",
    },
    group: "external",
    status: "available",
    badge: "mvp",
    tile: { kind: "monogram", initial: "S" },
  },
];
