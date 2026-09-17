import { IconPlus, IconRefresh, IconSearch } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface ReverseSharesSearchProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onCreateReverseShare: () => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
  totalReverseShares: number;
  filteredCount: number;
}

export function ReverseSharesSearch({
  searchQuery,
  onSearchChange,
  onCreateReverseShare,
  onRefresh,
  isRefreshing = false,
  totalReverseShares,
  filteredCount,
}: ReverseSharesSearchProps) {
  const t = useTranslations();

  return (
    <div className="flex flex-col gap-5 rounded-xl border border-border/70 bg-card p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-semibold">{t("reverseShares.search.title")}</h2>
        <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
          <Button variant="outline" size="icon" onClick={onRefresh} disabled={isRefreshing}>
            <IconRefresh className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </Button>
          <Button onClick={onCreateReverseShare} className="w-full sm:w-auto">
            <IconPlus className="h-4 w-4" />
            {t("reverseShares.search.createButton")}
          </Button>
        </div>
      </div>

      <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center">
        <div className="relative w-full max-w-md">
          <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder={t("reverseShares.search.placeholder")}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        {searchQuery && (
          <span className="text-sm text-muted-foreground">
            {t("reverseShares.search.results", {
              filtered: filteredCount,
              total: totalReverseShares,
            })}
          </span>
        )}
      </div>
    </div>
  );
}
