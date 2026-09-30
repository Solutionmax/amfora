"use client";

import type { ReactNode } from "react";
import { IconChevronLeft } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * List on the left, detail on the right. On small screens only one of the two shows:
 * the list, or the detail with a back button once something is selected.
 */
export function SplitView({
  list,
  detail,
  hasSelection,
  onBack,
  backLabel,
}: {
  list: ReactNode;
  detail: ReactNode;
  hasSelection: boolean;
  onBack: () => void;
  backLabel: string;
}) {
  return (
    <div className="grid min-h-dvh flex-1 lg:grid-cols-[360px_minmax(0,1fr)]">
      <div
        className={cn(
          "flex min-w-0 flex-col border-line lg:sticky lg:top-0 lg:h-dvh lg:border-r",
          hasSelection && "max-lg:hidden"
        )}
      >
        {list}
      </div>
      <div className={cn("min-w-0", !hasSelection && "max-lg:hidden")}>
        <div className="max-w-[760px] px-4 pb-28 pt-6 sm:px-8 lg:px-14 lg:pt-11">
          <Button variant="ghost" className="-ml-2 mb-4 lg:hidden" onClick={onBack}>
            <IconChevronLeft />
            {backLabel}
          </Button>
          {detail}
        </div>
      </div>
    </div>
  );
}

/** Header of the list column: title and a primary action. */
export function SplitListHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 px-[22px] pb-2.5 pt-[26px]">
      <h1 className="font-display text-[22px] font-bold tracking-[-0.01em]">{title}</h1>
      {action}
    </div>
  );
}

/** One row in the list column. */
export function SplitListItem({
  icon,
  title,
  meta,
  aside,
  selected,
  onSelect,
}: {
  icon: ReactNode;
  title: ReactNode;
  meta?: ReactNode;
  aside?: ReactNode;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={selected ? "true" : undefined}
      className={cn(
        "flex w-full items-center gap-3 rounded-[10px] px-3 py-[11px] text-left transition-colors duration-100",
        selected ? "bg-primary-soft [&_.split-ic]:text-primary" : "hover:bg-surface-2"
      )}
    >
      <span className="split-ic grid shrink-0 place-items-center text-ink-icon [&_svg]:size-[17px]">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13.5px] font-semibold">{title}</span>
        {meta && <span className="mt-1 flex flex-wrap items-center gap-1.5">{meta}</span>}
      </span>
      {aside && <span className="shrink-0 whitespace-nowrap text-[12.5px] text-ink-3">{aside}</span>}
    </button>
  );
}
