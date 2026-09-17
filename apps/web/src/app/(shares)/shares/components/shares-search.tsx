import { IconSearch } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { Input } from "@/components/ui/input";
import { SharesSearchProps } from "../types";

export function SharesSearch({ searchQuery, onSearchChange, totalShares, filteredCount }: SharesSearchProps) {
  const t = useTranslations();

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border/70 bg-card p-4 sm:p-5">
      <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center">
        <div className="relative w-full max-w-xs">
          <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder={t("shares.search.placeholder")}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        {searchQuery && (
          <span className="text-sm text-muted-foreground">
            {t("shares.search.results", {
              filtered: filteredCount,
              total: totalShares,
            })}
          </span>
        )}
      </div>
    </div>
  );
}
