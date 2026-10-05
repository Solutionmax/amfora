"use client";

import { useCallback, useEffect, useState } from "react";
import { IconDots, IconListCheck, IconPlus, IconSearch, IconShare } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { LinkTags } from "@/components/general/share-tags";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { SplitListHeader, SplitListItem } from "@/components/ui/split-view";
import type { Share } from "@/http/endpoints/shares/types";
import { cn } from "@/lib/utils";
import { selectionState, SHARE_FILTERS, toggleAll, type ShareFilter } from "../lib/share-list";

interface SharesListProps {
  shares: Share[];
  visibleShares: Share[];
  isLoading: boolean;
  loadError: boolean;
  onRetry: () => void;
  activeId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  filter: ShareFilter;
  onFilterChange: (filter: ShareFilter) => void;
  query: string;
  onQueryChange: (query: string) => void;
  onBulkDownload: (shares: Share[]) => void;
  onBulkDelete: (shares: Share[]) => void;
  /** Lets the share manager leave select mode after a bulk action finishes. */
  onRegisterClear?: (clear: () => void) => void;
}

function SelectableRow({
  share,
  checked,
  onCheckedChange,
}: {
  share: Share;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  const t = useTranslations();
  return (
    <label
      className={cn(
        "flex w-full cursor-pointer items-center gap-3 rounded-[10px] px-3 py-[11px] transition-colors duration-100",
        checked ? "bg-primary-soft" : "hover:bg-surface-2"
      )}
    >
      <Checkbox
        checked={checked}
        onCheckedChange={(value) => onCheckedChange(value === true)}
        aria-label={t("sharesTable.selectShare", { shareName: share.name ?? "" })}
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13.5px] font-semibold">{share.name || t("shares.calm.untitled")}</span>
        <span className="mt-1 flex flex-wrap items-center gap-1.5">
          <LinkTags expiration={share.expiration} hasPassword={share.security?.hasPassword ?? false} />
        </span>
      </span>
      <span className="shrink-0 whitespace-nowrap text-[12.5px] text-ink-3">
        {t("shares.calm.fileCount", { count: share.files?.length ?? 0 })}
      </span>
    </label>
  );
}

function ListSkeleton() {
  return (
    <div aria-hidden className="flex flex-col">
      {[0, 1, 2, 3].map((row) => (
        <div key={row} className="flex items-center gap-3 px-3 py-[13px]">
          <Skeleton className="size-[17px] rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-3/5" />
            <Skeleton className="h-3 w-2/5" />
          </div>
          <Skeleton className="h-3 w-10" />
        </div>
      ))}
    </div>
  );
}

/** Left column: title, New, text filters, search and the share rows. */
export function SharesList(props: SharesListProps) {
  const t = useTranslations();
  const [isSelecting, setIsSelecting] = useState(false);
  const [picked, setPicked] = useState<ReadonlySet<string>>(new Set());
  const { shares, visibleShares, isLoading, loadError } = props;

  const stopSelecting = useCallback(() => {
    setIsSelecting(false);
    setPicked(new Set());
  }, []);
  const { onRegisterClear } = props;
  useEffect(() => {
    onRegisterClear?.(stopSelecting);
  }, [onRegisterClear, stopSelecting]);
  const toggle = (id: string, on: boolean) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  const pickedShares = shares.filter((share) => picked.has(share.id));
  const listedIds = visibleShares.map((share) => share.id);
  const pickedState = selectionState(listedIds, picked);

  const header = (
    <SplitListHeader
      title={t("shares.pageTitle")}
      action={
        <div className="flex items-center gap-1">
          {shares.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label={t("shares.calm.moreActions")}>
                  <IconDots />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsSelecting(true)}>
                  <IconListCheck />
                  {t("shares.calm.selectShares")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <Button onClick={props.onCreate}>
            <IconPlus />
            {t("shares.calm.new")}
          </Button>
        </div>
      }
    />
  );

  return (
    <>
      {header}
      <div
        role="group"
        aria-label={t("shares.calm.filterLabel")}
        className="flex gap-5 border-b border-line px-[22px] text-[13px]"
      >
        {SHARE_FILTERS.map((key) => (
          <button
            key={key}
            type="button"
            aria-pressed={props.filter === key}
            onClick={() => props.onFilterChange(key)}
            className={cn(
              "-mb-px border-b-2 py-2.5 transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/35",
              props.filter === key
                ? "border-ink font-semibold text-ink"
                : "border-transparent font-medium text-ink-3 hover:text-ink"
            )}
          >
            {t(`shares.calm.filters.${key}`)}
          </button>
        ))}
      </div>

      <label className="relative mx-4 mb-1 mt-3 block">
        <IconSearch className="pointer-events-none absolute left-[11px] top-1/2 size-4 -translate-y-1/2 text-ink-icon" />
        <Input
          type="search"
          className="h-9 pl-[34px]"
          placeholder={t("shares.calm.search")}
          aria-label={t("shares.calm.search")}
          value={props.query}
          onChange={(event) => props.onQueryChange(event.target.value)}
        />
      </label>

      {isSelecting && (
        <div className="mx-4 mt-2 flex flex-wrap items-center gap-x-1 gap-y-1 border-b border-line pb-2 text-[13px]">
          <label className="mr-auto flex cursor-pointer items-center gap-3 pl-1.5 text-ink-3">
            <Checkbox
              checked={pickedState === "some" ? "indeterminate" : pickedState === "all"}
              onCheckedChange={() => setPicked(toggleAll(listedIds, picked))}
              aria-label={t("shares.calm.selectAll")}
            />
            {picked.size === 0 ? t("shares.calm.selectAll") : t("shares.calm.selectedCount", { count: picked.size })}
          </label>
          <Button
            variant="ghost"
            size="sm"
            disabled={picked.size === 0}
            onClick={() => props.onBulkDownload(pickedShares)}
          >
            {t("shares.calm.downloadSelected")}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-bad hover:text-bad"
            disabled={picked.size === 0}
            onClick={() => props.onBulkDelete(pickedShares)}
          >
            {t("shares.calm.deleteSelected")}
          </Button>
          <Button variant="ghost" size="sm" onClick={stopSelecting}>
            {t("shares.calm.doneSelecting")}
          </Button>
        </div>
      )}

      <div className="flex-1 overflow-auto px-2.5 pb-5 pt-1.5">
        {isLoading ? (
          <ListSkeleton />
        ) : loadError ? (
          <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-4 text-[13px]">
            <span className="text-bad">{t("shares.calm.loadError")}</span>
            <Button variant="outline" size="sm" onClick={props.onRetry}>
              {t("shares.calm.retry")}
            </Button>
          </div>
        ) : shares.length === 0 ? (
          <EmptyState
            className="lg:hidden"
            icon={<IconShare />}
            title={t("shares.calm.emptyTitle")}
            description={t("shares.calm.emptyDescription")}
            action={
              <Button onClick={props.onCreate}>
                <IconPlus />
                {t("shares.calm.newShare")}
              </Button>
            }
          />
        ) : visibleShares.length === 0 ? (
          <EmptyState
            className="py-10"
            title={t("shares.calm.noResultsTitle")}
            description={t("shares.calm.noResultsDescription")}
            action={
              props.query ? (
                <Button variant="outline" size="sm" onClick={() => props.onQueryChange("")}>
                  {t("shares.calm.clearSearch")}
                </Button>
              ) : undefined
            }
          />
        ) : (
          visibleShares.map((share) =>
            isSelecting ? (
              <SelectableRow
                key={share.id}
                share={share}
                checked={picked.has(share.id)}
                onCheckedChange={(on) => toggle(share.id, on)}
              />
            ) : (
              <SplitListItem
                key={share.id}
                icon={<IconShare stroke={1.8} />}
                title={share.name || t("shares.calm.untitled")}
                meta={<LinkTags expiration={share.expiration} hasPassword={share.security?.hasPassword ?? false} />}
                aside={t("shares.calm.fileCount", { count: share.files?.length ?? 0 })}
                selected={share.id === props.activeId}
                onSelect={() => props.onSelect(share.id)}
              />
            )
          )
        )}
      </div>
    </>
  );
}
