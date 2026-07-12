"use client";

import * as React from "react";
import { ArrowRight } from "lucide-react";
import { motion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Toggle } from "@/components/ui/toggle";
import { LucideIcon } from "@/components/shell/lucide-icon";
import type { Lang } from "@/lib/types";
import type { ScheduledTask } from "./data";

const EASE = [0.4, 0, 0.2, 1] as const; // mirrors --ease
const STAGGER_CAP = 8;
const STAGGER_S = 0.03;

/** Staggered list reveal (design-briefs §0.3): 30ms/item, capped at 8. */
function reveal(index: number) {
  return {
    initial: { opacity: 0, y: 4 },
    animate: { opacity: 1, y: 0 },
    transition: {
      duration: 0.25,
      ease: EASE,
      delay: Math.min(index, STAGGER_CAP) * STAGGER_S,
    },
  };
}

function TaskRow({
  task,
  index,
  locale,
  enabled,
  onToggle,
  toggleLabel,
  nextRunLabel,
}: {
  task: ScheduledTask;
  index: number;
  locale: Lang;
  enabled: boolean;
  onToggle: (value: boolean) => void;
  toggleLabel: string;
  nextRunLabel: string;
}) {
  return (
    <motion.div
      {...reveal(index)}
      data-testid="scheduled-task-row"
      className="flex items-center gap-3 px-4 py-4"
    >
      <span
        aria-hidden="true"
        className="bg-navy-50 text-navy-600 rounded-btn grid size-10 shrink-0 place-items-center"
      >
        <LucideIcon name={task.icon} className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-navy truncate text-[0.9375rem] font-semibold">
            {task.name[locale]}
          </p>
          <Badge variant="neutral" size="sm">
            {task.cadence[locale]}
          </Badge>
        </div>
        <p className="text-text-secondary mt-1 flex items-center gap-1.5 truncate text-[0.8125rem]">
          <span>{task.schedule[locale]}</span>
          <ArrowRight
            className="size-3.5 shrink-0 rtl:rotate-180"
            aria-hidden="true"
          />
          <bdi className="min-w-0 truncate">{task.destination[locale]}</bdi>
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-4">
        <p className="text-text-secondary financial text-end text-xs">
          <span className="block text-[0.625rem] font-semibold tracking-[0.04em] uppercase">
            {nextRunLabel}
          </span>
          {task.nextRun[locale]}
        </p>
        <Toggle
          checked={enabled}
          onCheckedChange={onToggle}
          aria-label={toggleLabel}
        />
      </div>
    </motion.div>
  );
}

export function ScheduledClient({ tasks }: { tasks: ScheduledTask[] }) {
  const t = useTranslations("scheduled");
  const tShell = useTranslations("shell");
  const locale = useLocale() as Lang;

  const [states, setStates] = React.useState<Record<string, boolean>>(() =>
    Object.fromEntries(tasks.map((task) => [task.id, task.enabled])),
  );

  return (
    <motion.main
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: EASE }}
      className="mx-auto max-w-[860px] px-8 pt-10 pb-16"
    >
      <header>
        <h1 className="text-h1 text-navy font-extrabold">
          {tShell("nav.scheduled")}
        </h1>
        <p className="text-text-secondary mt-2 text-[0.9375rem]">
          {t("subtitle")}
        </p>
      </header>

      <Card
        padding="none"
        elevated
        className="divide-border mt-8 divide-y overflow-hidden"
      >
        {tasks.map((task, i) => (
          <TaskRow
            key={task.id}
            task={task}
            index={i}
            locale={locale}
            enabled={states[task.id] ?? task.enabled}
            onToggle={(value) => setStates((s) => ({ ...s, [task.id]: value }))}
            toggleLabel={t("toggleLabel", { name: task.name[locale] })}
            nextRunLabel={t("nextRun")}
          />
        ))}
      </Card>

      <p className="text-text-secondary mt-6 text-center text-[0.8125rem]">
        {t("footer")}
      </p>
    </motion.main>
  );
}
