"use client";

import { IconPlus, IconShare, IconShareOff } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";

/** Same shape as the detail: title, tags, link row, buttons, facts, lines. */
export function ShareDetailSkeleton() {
  return (
    <div aria-hidden>
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="mt-3 h-4 w-1/2" />
      <Skeleton className="mb-3 mt-[26px] h-[46px] w-full rounded-xl" />
      <div className="flex gap-2">
        <Skeleton className="h-9 w-20" />
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-24" />
      </div>
      <div className="mb-[34px] mt-[30px] grid grid-cols-3 border-y border-line">
        {[0, 1, 2].map((cell) => (
          <div key={cell} className="space-y-2 py-[18px] pr-5">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-6 w-16" />
          </div>
        ))}
      </div>
      {[0, 1, 2].map((row) => (
        <div key={row} className="flex items-center gap-3.5 border-t border-line py-4 first:border-t-0">
          <Skeleton className="size-[17px] rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-2/5" />
            <Skeleton className="h-3 w-1/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function NoSharesYet({ onCreate }: { onCreate: () => void }) {
  const t = useTranslations();
  return (
    <EmptyState
      className="pt-[18vh]"
      icon={<IconShare />}
      title={t("shares.calm.emptyTitle")}
      description={t("shares.calm.emptyDescription")}
      action={
        <Button onClick={onCreate}>
          <IconPlus />
          {t("shares.calm.newShare")}
        </Button>
      }
    />
  );
}

export function ShareNotFound({ onShowAll }: { onShowAll: () => void }) {
  const t = useTranslations();
  return (
    <EmptyState
      className="pt-[18vh]"
      icon={<IconShareOff />}
      title={t("shares.calm.notFoundTitle")}
      description={t("shares.calm.notFoundDescription")}
      action={
        <Button variant="outline" onClick={onShowAll}>
          {t("shares.calm.showAll")}
        </Button>
      }
    />
  );
}
