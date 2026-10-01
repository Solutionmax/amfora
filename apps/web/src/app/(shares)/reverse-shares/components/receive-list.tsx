"use client";

import { IconInbox, IconPlus, IconSearch } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { LinkTags } from "@/components/general/share-tags";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { SplitListHeader, SplitListItem } from "@/components/ui/split-view";
import { cn } from "@/lib/utils";
import type { ReverseShare } from "../hooks/use-reverse-shares";
import { RECEIVE_FILTERS, receivedCount, type ReceiveFilter } from "../lib/receive-format";
import { LoadError, NoReceiveLinks } from "./receive-states";

interface ReceiveListProps {
  items: ReverseShare[];
  total: number;
  selectedId: string | null;
  isLoading: boolean;
  error: string | null;
  filter: ReceiveFilter;
  search: string;
  onFilterChange: (filter: ReceiveFilter) => void;
  onSearchChange: (value: string) => void;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onRetry: () => void;
}

function ListSkeleton() {
  return (
    <div aria-hidden="true">
      {[0, 1, 2].map((row) => (
        <div key={row} className="flex items-center gap-3 px-3 py-[13px]">
          <Skeleton className="size-[17px] rounded" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-2/3" />
            <Skeleton className="h-4 w-1/2 rounded-full" />
          </div>
          <Skeleton className="h-3 w-8" />
        </div>
      ))}
    </div>
  );
}

/** Left column: title, New, text filters, search and the links. */
export function ReceiveList({
  items,
  total,
  selectedId,
  isLoading,
  error,
  filter,
  search,
  onFilterChange,
  onSearchChange,
  onSelect,
  onCreate,
  onRetry,
}: ReceiveListProps) {
  const t = useTranslations();
  const isEmpty = !isLoading && !error && total === 0;

  return (
    <>
      <SplitListHeader
        title={t("reverseShares.pageTitle")}
        action={
          <Button onClick={onCreate}>
            <IconPlus />
            {t("reverseShares.calm.new")}
          </Button>
        }
      />

      <div
        role="group"
        aria-label={t("reverseShares.calm.filterLabel")}
        className="flex gap-5 border-b border-line px-[22px] text-[13px]"
      >
        {RECEIVE_FILTERS.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={filter === option}
            onClick={() => onFilterChange(option)}
            className={cn(
              "-mb-px border-b-2 py-2.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
              filter === option
                ? "border-ink font-semibold text-ink"
                : "border-transparent font-medium text-ink-3 hover:text-ink"
            )}
          >
            {t(`reverseShares.calm.filters.${option}`)}
          </button>
        ))}
      </div>

      <div className="relative mx-4 mb-1 mt-3">
        <IconSearch className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-icon" />
        <Input
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={t("common.search")}
          aria-label={t("reverseShares.search.placeholder")}
          className="h-9 pl-9"
        />
      </div>

      <div className="flex-1 overflow-y-auto px-2.5 pb-5 pt-1.5">
        {isLoading ? (
          <ListSkeleton />
        ) : error ? (
          <LoadError message={error} onRetry={onRetry} className="px-3" />
        ) : isEmpty ? (
          <NoReceiveLinks onCreate={onCreate} className="lg:hidden" />
        ) : items.length === 0 ? (
          <p className="px-3 py-6 text-[13px] text-ink-3">{t("reverseShares.calm.noMatches")}</p>
        ) : (
          items.map((item) => (
            <SplitListItem
              key={item.id}
              icon={<IconInbox stroke={1.8} />}
              title={item.name || t("reverseShares.card.untitled")}
              meta={<LinkTags expiration={item.expiration} isActive={item.isActive} hasPassword={item.hasPassword} />}
              aside={t("reverseShares.calm.inCount", { count: receivedCount(item) })}
              selected={item.id === selectedId}
              onSelect={() => onSelect(item.id)}
            />
          ))
        )}
      </div>
    </>
  );
}
