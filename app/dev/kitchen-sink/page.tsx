"use client";

/**
 * Design-QA surface (gate A): every primitive, every variant, rendered once
 * LTR/EN and once RTL/AR. Dev-only, hardcoded copy is permitted here (and only
 * here); the token + logical-property lint rules still apply.
 */

import * as React from "react";
import {
  ArrowRight,
  Check,
  Ellipsis,
  Plus,
  Search,
  ShieldCheck,
  User,
} from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { LogoTile } from "@/components/ui/logo-tile";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Stepper } from "@/components/ui/stepper";
import { Toggle } from "@/components/ui/toggle";
import { Tooltip } from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const en = {
  logo: "Logo system",
  animated: "Animated (bar rise + arrow draw)",
  replay: "Replay",
  monoOnNavy: "Mono (currentColor) on navy",
  tiles: "Monogram tiles & avatars",
  buttons: "Buttons",
  loading: "Signing in…",
  withIcons: "Search",
  proceed: "Continue",
  disabled: "Disabled",
  badges: "Badges, pills & scorecard semantics",
  neutral: "Neutral",
  navy: "Navy",
  verified: "Verified",
  warning: "Warning",
  danger: "Danger",
  pass: "Pass",
  warn: "Warn",
  fail: "Fail",
  inputs: "Inputs",
  searchPh: "Search or enter a company",
  userPh: "Username",
  amountPh: "15",
  invalid: "Invalid entry",
  errorText: "Enter your username and password",
  tabs: "Tabs",
  overview: "Overview",
  documents: "Documents",
  chats: "Chats",
  overviewBody: "Company overview and screening scorecard.",
  documentsBody: "Filings, disclosures and the data room.",
  chatsBody: "Prior conversations in this workspace.",
  toggle: "Toggle",
  compliance: "Compliance screen required",
  dialog: "Dialog",
  openDialog: "Open dialog",
  dialogTitle: "Connect Saudi Exchange",
  dialogBody:
    "Faheem will get read-only access to official disclosures and filings.",
  note: "Read-only · revocable anytime · logged in the audit trail",
  cancel: "Cancel",
  authorize: "Authorize",
  menu: "Dropdown menu",
  actions: "Actions",
  configure: "Configure",
  rename: "Rename",
  remove: "Remove",
  tooltip: "Tooltip",
  hoverMe: "Hover me",
  tooltipBody:
    "Official Tadawul filings, Faheem's primary public-market source.",
  stepper: "Stepper",
  connect: "Connect",
  agentsStep: "Agents & skills",
  mandate: "Mandate & risk",
  skeletons: "Skeletons",
  ali: "Ali",
} as const;

const ar: Record<keyof typeof en, string> = {
  logo: "نظام الشعار",
  animated: "متحرك (نهوض الأعمدة ورسم السهم)",
  replay: "إعادة",
  monoOnNavy: "أحادي اللون على خلفية كحلية",
  tiles: "البلاطات والصور الرمزية",
  buttons: "الأزرار",
  loading: "جارٍ تسجيل الدخول…",
  withIcons: "بحث",
  proceed: "متابعة",
  disabled: "معطّل",
  badges: "الشارات ودلالات بطاقة الفرز",
  neutral: "محايد",
  navy: "كحلي",
  verified: "موثّق",
  warning: "تحذير",
  danger: "خطر",
  pass: "مطابق",
  warn: "تنبيه",
  fail: "غير مطابق",
  inputs: "الحقول",
  searchPh: "ابحث أو أدخل اسم شركة",
  userPh: "اسم المستخدم",
  amountPh: "15",
  invalid: "إدخال غير صالح",
  errorText: "يرجى إدخال اسم المستخدم وكلمة المرور",
  tabs: "التبويبات",
  overview: "نظرة عامة",
  documents: "المستندات",
  chats: "المحادثات",
  overviewBody: "نظرة عامة على الشركة وبطاقة الفرز.",
  documentsBody: "الإفصاحات والملفات وغرفة البيانات.",
  chatsBody: "المحادثات السابقة في مساحة العمل.",
  toggle: "المفتاح",
  compliance: "فحص الامتثال إلزامي",
  dialog: "النافذة",
  openDialog: "فتح النافذة",
  dialogTitle: "ربط السوق المالية السعودية",
  dialogBody: "سيحصل فهيم على صلاحية قراءة فقط للإفصاحات والملفات الرسمية.",
  note: "قراءة فقط · قابل للإلغاء في أي وقت · مسجَّل في سجل التدقيق",
  cancel: "إلغاء",
  authorize: "تفويض",
  menu: "القائمة المنسدلة",
  actions: "إجراءات",
  configure: "تهيئة",
  rename: "إعادة تسمية",
  remove: "إزالة",
  tooltip: "التلميح",
  hoverMe: "مرّر المؤشر",
  tooltipBody: "إفصاحات تداول الرسمية، مصدر فهيم الأساسي لبيانات السوق العامة.",
  stepper: "الخطوات",
  connect: "الربط",
  agentsStep: "الوكلاء والمهارات",
  mandate: "التفويض والمخاطر",
  skeletons: "الهياكل",
  ali: "علي",
};

type Copy = Record<keyof typeof en, string>;

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-text-secondary text-[0.8125rem] font-bold tracking-[0.04em] uppercase">
        {title}
      </h2>
      <Card padding="lg" elevated className="flex flex-col gap-6">
        {children}
      </Card>
    </section>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap items-center gap-3">{children}</div>;
}

function Kit({ copy }: { copy: Copy }) {
  const [replay, setReplay] = React.useState(0);
  const [on, setOn] = React.useState(true);

  return (
    <div className="flex flex-col gap-10">
      {/* Logo */}
      <Section title={copy.logo}>
        <Row>
          <Logo variant="icon" size={40} />
          <Logo variant="horizontal" size={30} />
          <Logo variant="horizontal-ar" size={30} />
          <Logo variant="horizontal-bilingual" size={34} />
          <Logo variant="vertical" size={40} />
        </Row>
        <div className="flex flex-wrap items-center gap-6">
          <div className="rounded-card bg-navy flex items-center gap-4 p-6">
            <Logo
              key={replay}
              variant="horizontal-bilingual"
              size={40}
              tone="mono"
              animated
              className="text-card"
            />
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setReplay((k) => k + 1)}
            >
              {copy.replay}
            </Button>
          </div>
          <div className="rounded-card bg-navy relative overflow-hidden p-6">
            <Logo
              variant="icon"
              tone="mono"
              decorative
              size={120}
              className="text-card absolute -end-6 -bottom-6 opacity-[0.06]"
            />
            <p className="text-card/70 relative text-xs font-medium">
              {copy.monoOnNavy}
            </p>
            <div className="relative mt-3">
              <Logo
                variant="horizontal"
                tone="mono"
                size={26}
                className="text-card"
              />
            </div>
          </div>
        </div>
      </Section>

      {/* Tiles + avatars */}
      <Section title={copy.tiles}>
        <Row>
          <LogoTile label="Argaam" />
          <LogoTile label="Tadawul" initial="ت" tint="navy" />
          <LogoTile label="SAHMK" initial="س" tint="navy" />
          <LogoTile label="Alinma" initial="ا" tint="accent" />
          <LogoTile label="Darb" />
          <LogoTile label="Thara Pay" />
        </Row>
        <Row>
          <LogoTile label="Argaam" size={24} />
          <LogoTile label="Argaam" size={16} />
          <Avatar name={copy.ali} size="lg" />
          <Avatar name={copy.ali} size="md" />
          <Avatar name={copy.ali} size="sm" square />
        </Row>
      </Section>

      {/* Buttons */}
      <Section title={copy.buttons}>
        <Row>
          <Button variant="primary">{copy.proceed}</Button>
          <Button variant="secondary">{copy.proceed}</Button>
          <Button variant="outline">{copy.proceed}</Button>
          <Button variant="ghost">{copy.proceed}</Button>
        </Row>
        <Row>
          <Button size="sm" variant="primary">
            {copy.proceed}
          </Button>
          <Button
            size="sm"
            variant="outline"
            startIcon={<Plus className="size-4" />}
          >
            {copy.proceed}
          </Button>
          <Button
            variant="secondary"
            startIcon={<Search className="size-4" />}
            endIcon={<ArrowRight className="size-4 rtl:rotate-180" />}
          >
            {copy.withIcons}
          </Button>
        </Row>
        <Row>
          <Button loading>{copy.loading}</Button>
          <Button variant="outline" loading>
            {copy.loading}
          </Button>
          <Button disabled>{copy.disabled}</Button>
        </Row>
      </Section>

      {/* Badges */}
      <Section title={copy.badges}>
        <Row>
          <Badge variant="neutral">{copy.neutral}</Badge>
          <Badge variant="navy">{copy.navy}</Badge>
          <Badge variant="mint">{copy.verified}</Badge>
          <Badge variant="warning">{copy.warning}</Badge>
          <Badge variant="danger">{copy.danger}</Badge>
          <Badge variant="beta" size="sm">
            BETA
          </Badge>
          <Badge variant="mvp" size="sm">
            MVP
          </Badge>
        </Row>
        <Row>
          <Badge variant="mint">
            <Check className="size-3" /> {copy.pass}
          </Badge>
          <Badge variant="warning">{copy.warn}</Badge>
          <Badge variant="danger">{copy.fail}</Badge>
          <Badge variant="mint">
            <ShieldCheck className="size-3" /> {copy.verified} · 12
          </Badge>
        </Row>
      </Section>

      {/* Inputs */}
      <Section title={copy.inputs}>
        <div className="grid max-w-md gap-3">
          <Input
            placeholder={copy.searchPh}
            startIcon={<Search className="size-4" />}
          />
          <Input
            placeholder={copy.userPh}
            startIcon={<User className="size-4" />}
          />
          <Input
            placeholder={copy.amountPh}
            defaultValue="15"
            endSlot={<span className="text-sm font-medium">%</span>}
            inputMode="numeric"
            className="financial"
          />
          <div>
            <Input
              placeholder={copy.userPh}
              invalid
              defaultValue={copy.invalid}
            />
            <p className="text-danger mt-1.5 flex items-center gap-1.5 text-[0.8125rem] font-medium">
              <span aria-hidden="true">!</span>
              {copy.errorText}
            </p>
          </div>
        </div>
      </Section>

      {/* Tabs */}
      <Section title={copy.tabs}>
        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">{copy.overview}</TabsTrigger>
            <TabsTrigger value="documents">{copy.documents}</TabsTrigger>
            <TabsTrigger value="chats">{copy.chats}</TabsTrigger>
          </TabsList>
          <TabsContent
            value="overview"
            className="text-text-secondary text-[0.9375rem]"
          >
            {copy.overviewBody}
          </TabsContent>
          <TabsContent
            value="documents"
            className="text-text-secondary text-[0.9375rem]"
          >
            {copy.documentsBody}
          </TabsContent>
          <TabsContent
            value="chats"
            className="text-text-secondary text-[0.9375rem]"
          >
            {copy.chatsBody}
          </TabsContent>
        </Tabs>
      </Section>

      {/* Toggle */}
      <Section title={copy.toggle}>
        <label className="text-navy flex items-center gap-3 text-[0.9375rem] font-medium">
          <Toggle checked={on} onCheckedChange={setOn} />
          {copy.compliance}
        </label>
      </Section>

      {/* Dialog + Dropdown + Tooltip */}
      <div className="grid gap-10 md:grid-cols-3">
        <Section title={copy.dialog}>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">{copy.openDialog}</Button>
            </DialogTrigger>
            <DialogContent>
              <div className="flex flex-col items-center text-center">
                <LogoTile label="Tadawul" initial="ت" tint="navy" />
                <DialogTitle className="mt-4">{copy.dialogTitle}</DialogTitle>
                <DialogDescription>{copy.dialogBody}</DialogDescription>
                <p className="text-text-secondary mt-5 flex items-center gap-1.5 text-xs font-medium">
                  <ShieldCheck className="text-accent size-4" />
                  {copy.note}
                </p>
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <DialogClose asChild>
                  <Button variant="ghost" size="sm">
                    {copy.cancel}
                  </Button>
                </DialogClose>
                <Button size="sm">{copy.authorize}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </Section>

        <Section title={copy.menu}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" aria-label={copy.actions}>
                <Ellipsis className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuLabel>{copy.actions}</DropdownMenuLabel>
              <DropdownMenuItem>{copy.configure}</DropdownMenuItem>
              <DropdownMenuItem>{copy.rename}</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-danger data-[highlighted]:bg-danger-50">
                {copy.remove}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </Section>

        <Section title={copy.tooltip}>
          <Tooltip content={copy.tooltipBody}>
            <Button variant="outline" size="sm">
              {copy.hoverMe}
            </Button>
          </Tooltip>
        </Section>
      </div>

      {/* Stepper */}
      <Section title={copy.stepper}>
        <Stepper
          current={1}
          steps={[
            { label: copy.connect },
            { label: copy.agentsStep },
            { label: copy.mandate },
          ]}
        />
      </Section>

      {/* Skeletons */}
      <Section title={copy.skeletons}>
        <div className="flex items-center gap-3">
          <Skeleton className="size-10 shrink-0" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-3 w-3/5" />
            <Skeleton className="h-3 w-2/5" />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Card key={i} padding="md" className="flex flex-col gap-3">
              <Skeleton className="size-10" />
              <Skeleton className="h-3 w-4/5" />
              <Skeleton className="h-3 w-3/5" />
            </Card>
          ))}
        </div>
      </Section>
    </div>
  );
}

export default function KitchenSinkPage() {
  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-16 px-8 py-16">
      <header className="flex flex-col gap-2">
        <Logo variant="horizontal-bilingual" size={40} />
        <h1 className="text-h1 text-navy mt-4 font-extrabold">
          Faheem UI, Kitchen Sink
        </h1>
        <p className="text-text-secondary text-[0.9375rem]">
          Every primitive, every variant, reviewed LTR/EN and RTL/AR.
        </p>
      </header>

      <div dir="ltr">
        <Kit copy={en} />
      </div>

      <div className="border-border border-t pt-16" dir="rtl" lang="ar">
        <div className="mb-8 flex items-center gap-2">
          <Badge variant="neutral">RTL · العربية</Badge>
        </div>
        <Kit copy={ar} />
      </div>
    </main>
  );
}
