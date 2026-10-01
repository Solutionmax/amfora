"use client";

import { IconAlertCircle, IconInbox, IconPlus, IconRefresh, IconSearch } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** No receive links at all: one sentence and the primary action. */
export function NoReceiveLinks({ onCreate, className }: { onCreate: () => void; className?: string }) {
  const t = useTranslations();
  return (
    <EmptyState
      className={className}
      icon={<IconInbox stroke={1.6} />}
      title={t("reverseShares.calm.emptyTitle")}
      description={t("reverseShares.calm.emptyText")}
      action={
        <Button onClick={onCreate}>
          <IconPlus />
          {t("reverseShares.calm.new")}
        </Button>
      }
    />
  );
}

/** Inline fetch error with a way to try again. */
export function LoadError({
  message,
  onRetry,
  className,
}: {
  message: string;
  onRetry: () => void;
  className?: string;
}) {
  const t = useTranslations();
  return (
    <div role="alert" className={cn("flex flex-wrap items-center gap-x-3 gap-y-2 py-4 text-[13px]", className)}>
      <span className="flex min-w-0 flex-1 items-center gap-2 text-bad">
        <IconAlertCircle className="size-4 shrink-0" />
        {message}
      </span>
      <Button variant="outline" size="sm" onClick={onRetry}>
        <IconRefresh />
        {t("reverseShares.calm.retry")}
      </Button>
    </div>
  );
}

/** The ?id= in the address points at nothing we know. */
export function ReceiveNotFound({ onBack }: { onBack: () => void }) {
  const t = useTranslations();
  return (
    <EmptyState
      icon={<IconSearch stroke={1.6} />}
      title={t("reverseShares.calm.notFoundTitle")}
      description={t("reverseShares.calm.notFoundText")}
      action={
        <Button variant="outline" onClick={onBack}>
          {t("reverseShares.calm.backToList")}
        </Button>
      }
    />
  );
}

/** Detail placeholder shaped like the real thing. */
export function DetailSkeleton() {
  return (
    <div aria-hidden="true">
      <Skeleton className="h-8 w-2/3 max-w-[340px]" />
      <div className="mt-3 flex gap-2">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-24" />
      </div>
      <Skeleton className="mb-3 mt-[26px] h-11 w-full rounded-xl" />
      <div className="flex gap-2">
        <Skeleton className="h-9 w-20" />
        <Skeleton className="h-9 w-24" />
      </div>
      <div className="mb-[34px] mt-[30px] grid grid-cols-3 gap-5 border-y border-line py-[18px]">
        {[0, 1, 2].map((cell) => (
          <div key={cell} className="space-y-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-7 w-20" />
          </div>
        ))}
      </div>
      <Skeleton className="h-3 w-28" />
      {[0, 1, 2].map((row) => (
        <div key={row} className="flex items-center gap-3.5 border-b border-line py-4">
          <Skeleton className="size-[17px] rounded" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <Skeleton className="h-3 w-12" />
        </div>
      ))}
    </div>
  );
}
