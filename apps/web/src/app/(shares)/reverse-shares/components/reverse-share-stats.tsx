"use client";

import { IconToggleLeft, IconToggleRight } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

interface ReverseShareStatsProps {
  filesCount: number;
  maxFiles: number | null;
  isActive: boolean;
}

export function ReverseShareStats({ filesCount, maxFiles, isActive }: ReverseShareStatsProps) {
  const t = useTranslations();

  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="text-center p-2 bg-muted/30 rounded-lg">
        <p className="text-lg font-semibold text-green-600">{filesCount}</p>
        <p className="text-xs text-muted-foreground">{t("reverseShares.labels.filesReceived")}</p>
      </div>
      <div className="text-center p-2 bg-muted/30 rounded-lg">
        <p className="text-lg font-semibold text-blue-600">{maxFiles || "∞"}</p>
        <p className="text-xs text-muted-foreground">{t("reverseShares.labels.fileLimit")}</p>
      </div>
      <div className="text-center p-2 bg-muted/30 rounded-lg">
        <div className="flex items-center justify-center gap-1">
          {isActive ? (
            <IconToggleRight className="h-5 w-5 text-green-600" />
          ) : (
            <IconToggleLeft className="h-5 w-5 text-red-600" />
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {isActive ? t("reverseShares.status.active") : t("reverseShares.status.inactive")}
        </p>
      </div>
    </div>
  );
}
