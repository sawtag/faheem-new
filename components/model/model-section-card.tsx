"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";

export function ModelSectionCard({
  titleKey,
  captionKey,
  children,
  footer,
}: {
  titleKey: string;
  captionKey: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const t = useTranslations();
  return (
    <Card padding="md" elevated className="min-w-0">
      <div className="mb-3 flex flex-col gap-0.5">
        <h3 className="text-navy text-[0.9375rem] font-bold">{t(titleKey)}</h3>
        <p className="text-text-secondary text-xs leading-relaxed">
          {t(captionKey)}
        </p>
      </div>
      {children}
      {footer}
    </Card>
  );
}
