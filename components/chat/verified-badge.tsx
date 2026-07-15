"use client";

import { BadgeCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";

/**
 * "Verified, N sources cited", the Verification agent made visible. Rendered
 * only from the REAL citation count; zero citations → no badge (never faked).
 */
export function VerifiedBadge({ count }: { count: number }) {
  const t = useTranslations("chat");
  if (count <= 0) return null;
  return (
    <Badge variant="mint" className="mt-3 gap-1.5">
      <BadgeCheck className="size-3.5" aria-hidden="true" />
      <span className="financial">{t("verified", { count })}</span>
    </Badge>
  );
}
