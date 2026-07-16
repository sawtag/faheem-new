"use client";

import { CircleCheck } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tooltip } from "@/components/ui/tooltip";
import { ConnectorAvatar } from "@/components/connections/connector-avatar";
import { cn } from "@/lib/utils";
import type { Connector } from "@/lib/connectors";
import type { Lang } from "@/lib/types";

/** Onboarding Step 1 connector card, "wizard dress" of the same connector data (design-briefs §2.4). */
export function ConnectorWizardCard({
  connector,
  justConnected,
  onConnect,
  provisioned = false,
}: {
  connector: Connector;
  justConnected: boolean;
  onConnect: () => void;
  /** provisioned with the workspace (not user-connected): shows the "Provisioned" label rather than the bare connected check. */
  provisioned?: boolean;
}) {
  const t = useTranslations("connections");
  const tOnb = useTranslations("onboarding");
  const locale = useLocale() as Lang;
  const name = connector.name[locale];
  const connected = connector.status === "connected";

  return (
    <Tooltip content={connector.tooltip[locale]} side="top">
      <Card
        padding="sm"
        className={cn(
          "flex items-center gap-3 transition-colors duration-[var(--duration-slow)] ease-[var(--ease)]",
          justConnected && "bg-accent-50",
        )}
      >
        <ConnectorAvatar tile={connector.tile} label={name} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <bdi className="text-navy truncate text-[0.9375rem] font-semibold">
              {name}
            </bdi>
            {connector.badge && (
              <Badge variant={connector.badge} size="sm" className="uppercase">
                {connector.badge}
              </Badge>
            )}
          </div>
          <p className="text-text-secondary truncate text-[0.8125rem]">
            {connector.description[locale]}
          </p>
        </div>
        {connected ? (
          provisioned ? (
            <span className="bg-accent-50 text-accent-700 rounded-pill inline-flex shrink-0 items-center gap-1 px-2 py-0.5 text-xs font-bold whitespace-nowrap">
              <CircleCheck className="size-3.5" aria-hidden="true" />
              {tOnb("provisioned")}
            </span>
          ) : (
            <CircleCheck
              className="text-accent size-5 shrink-0"
              aria-hidden="true"
            />
          )
        ) : (
          <Button
            variant="secondary"
            size="sm"
            className="shrink-0"
            onClick={onConnect}
          >
            {t("connect")}
          </Button>
        )}
      </Card>
    </Tooltip>
  );
}
