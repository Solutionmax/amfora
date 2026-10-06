"use client";

import { useCallback, useEffect, useState } from "react";
import { IconExternalLink, IconUsersGroup } from "@tabler/icons-react";
import { useFormatter, useTranslations } from "next-intl";

import { LoadError } from "@/app/settings/components/load-error";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { LineList, LineRow } from "@/components/ui/line-list";
import { Skeleton } from "@/components/ui/skeleton";
import { SplitListHeader } from "@/components/ui/split-view";
import { listSharedWithMe, type SharedWithMe } from "@/http/endpoints";
import { ShareViewTabs, type ShareView } from "./share-view-tabs";

/** Read only: shares of other people that are limited to a group the user is in. */
export function SharedWithMeView({ onViewChange }: { onViewChange: (view: ShareView) => void }) {
  const t = useTranslations();
  const format = useFormatter();
  const [shares, setShares] = useState<SharedWithMe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    setLoadError(false);
    try {
      const { data } = await listSharedWithMe();
      setShares(data.shares);
    } catch (error) {
      console.error("Error loading shared with me:", error);
      setLoadError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const body = isLoading ? (
    <div aria-busy="true" className="grid gap-3 px-4 py-4 sm:px-8 lg:px-14">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
    </div>
  ) : loadError ? (
    <div className="px-4 py-4 sm:px-8 lg:px-14">
      <LoadError message={t("groups.sharedWithMe.loadFailed")} onRetry={load} />
    </div>
  ) : shares.length === 0 ? (
    <EmptyState
      icon={<IconUsersGroup />}
      title={t("groups.sharedWithMe.empty.title")}
      description={t("groups.sharedWithMe.empty.text")}
    />
  ) : (
    <LineList className="max-w-[820px] px-4 sm:px-8 lg:px-14">
      {shares.map((share) => {
        const owner = share.owner ? `${share.owner.firstName} ${share.owner.lastName}`.trim() : "";
        const ends = share.expiration
          ? t("groups.sharedWithMe.ends", {
              date: format.dateTime(new Date(share.expiration), { dateStyle: "medium" }),
            })
          : t("groups.sharedWithMe.neverEnds");
        return (
          <LineRow
            key={share.id}
            icon={<IconUsersGroup aria-hidden="true" />}
            title={share.name || t("shares.calm.untitled")}
            sub={[owner && t("groups.sharedWithMe.from", { name: owner }), share.group.name, ends]
              .filter(Boolean)
              .join(" · ")}
          >
            <Button asChild variant="outline" size="sm">
              <a href={`/s/${encodeURIComponent(share.alias)}`}>
                <IconExternalLink aria-hidden="true" />
                {t("groups.sharedWithMe.open")}
                <span className="sr-only"> {share.name ?? ""}</span>
              </a>
            </Button>
          </LineRow>
        );
      })}
    </LineList>
  );

  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      <SplitListHeader title={t("shares.pageTitle")} />
      <ShareViewTabs view="shared" onChange={onViewChange} />
      <p className="px-[22px] pb-1 pt-3 text-[13px] text-ink-3">{t("groups.sharedWithMe.intro")}</p>
      {body}
    </div>
  );
}
