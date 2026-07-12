"use client";

import { Ellipsis } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip } from "@/components/ui/tooltip";
import { ConnectorAvatar } from "@/components/connections/connector-avatar";
import { cn } from "@/lib/utils";
import type { Connector } from "@/lib/connectors";
import type { Lang } from "@/lib/types";

/** Connected/Available list row for the standalone Connections page (design-briefs §2.2). */
export function ConnectorRow({
  connector,
  justConnected,
  onConnect,
  onDisconnect,
}: {
  connector: Connector;
  justConnected: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}) {
  const t = useTranslations("connections");
  const locale = useLocale() as Lang;
  const name = connector.name[locale];

  return (
    <Tooltip content={connector.tooltip[locale]} side="top">
      <div
        className={cn(
          "hover:bg-navy-50 flex min-h-16 items-center gap-3 px-4 transition-colors duration-[var(--duration-slow)] ease-[var(--ease)]",
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

        {connector.status === "connected" ? (
          <div className="flex shrink-0 items-center gap-3">
            <span className="flex items-center gap-1.5">
              <span
                className="bg-accent inline-block size-2 rounded-full"
                aria-hidden="true"
              />
              <span className="text-accent-700 text-xs font-medium">
                {t("connected")}
              </span>
            </span>
            <Button variant="outline" size="sm">
              {t("configure")}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={t("moreActions")}
                  className="w-9 px-0"
                >
                  <Ellipsis className="size-4" aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onSelect={onDisconnect}>
                  {t("disconnect")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
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
      </div>
    </Tooltip>
  );
}
