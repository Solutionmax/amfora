"use client";

import { IconActivity, IconDownload, IconSearch } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { ProtectedRoute } from "@/components/auth/protected-route";
import { InlineError } from "@/components/files/inline-error";
import { FileManagerLayout } from "@/components/layout/file-manager-layout";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { useSecureConfigValue } from "@/hooks/use-secure-configs";
import { activityExportUrl } from "@/http/endpoints/activity";
import { cn } from "@/lib/utils";
import { ActivityFacts } from "./components/activity-facts";
import { ActivityList } from "./components/activity-list";
import { ActivityRowsSkeleton } from "./components/activity-row";
import { useActivity } from "./hooks/use-activity";
import { ACTIVITY_FILTERS, kindOf } from "./lib/activity-events";

/** The license of this place database asks for a visible credit. */
const CREDITED_SOURCE_PREFIX = "DBIP";
const CREDIT_URL = "https://db-ip.com";

function ActivityView() {
  const t = useTranslations("activity");
  const activity = useActivity();
  const { value: retentionDays } = useSecureConfigValue("activityRetentionDays");
  const { overview, events, filter, query } = activity;
  const days = Number(retentionDays);

  const renderList = () => {
    if (activity.isLoading && events.length === 0) return <ActivityRowsSkeleton />;
    if (activity.loadError) {
      return <InlineError className="mt-4" message={t("loadError")} onRetry={() => void activity.load()} />;
    }
    if (events.length === 0) {
      const isFiltered = filter !== "all" || query !== "";
      return (
        <EmptyState
          icon={<IconActivity stroke={1.8} />}
          title={isFiltered ? t("noResults") : t("emptyTitle")}
          description={isFiltered ? undefined : t("emptyText")}
        />
      );
    }

    return (
      <div className={cn("transition-opacity duration-150", activity.isLoading && "opacity-60")} aria-live="polite">
        <ActivityList events={events} />
        {activity.moreError && (
          <InlineError className="mt-4" message={t("loadError")} onRetry={() => void activity.loadMore()} />
        )}
        {activity.hasMore && !activity.moreError && (
          <div className="mt-5 flex justify-center">
            <Button variant="outline" onClick={() => void activity.loadMore()} disabled={activity.isLoadingMore}>
              {activity.isLoadingMore ? t("loadingMore") : t("loadMore")}
            </Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <FileManagerLayout
      title={t("pageTitle")}
      subline={
        <>
          {t("subline")}
          {Number.isInteger(days) && days > 0 && <> {t("kept", { days })}</>}
        </>
      }
      actions={
        <Button variant="outline" asChild>
          <a href={activityExportUrl({ kind: kindOf(filter), q: query })} download="activity.csv">
            <IconDownload />
            {t("exportCsv")}
          </a>
        </Button>
      }
    >
      <ActivityFacts summary={overview?.summary ?? null} />

      <div>
        <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-2">
          <div
            role="group"
            aria-label={t("filterLabel")}
            className="flex min-w-0 flex-wrap gap-x-4 gap-y-1 text-[13px]"
          >
            {ACTIVITY_FILTERS.map((key) => (
              <button
                key={key}
                type="button"
                aria-pressed={filter === key}
                onClick={() => activity.setFilter(key)}
                className={cn(
                  "border-b-2 py-1.5 transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/35",
                  filter === key
                    ? "border-ink font-semibold text-ink"
                    : "border-transparent font-medium text-ink-3 hover:text-ink"
                )}
              >
                {t(`filters.${key}`)}
                {overview && (
                  <span className="mono ml-1.5 text-[11px] font-medium tabular-nums text-ink-3">
                    {overview.counts[key] ?? 0}
                  </span>
                )}
              </button>
            ))}
          </div>
          <label className="relative block w-full sm:ml-auto sm:w-[260px]">
            <IconSearch className="pointer-events-none absolute left-[11px] top-1/2 size-4 -translate-y-1/2 text-ink-icon" />
            <Input
              type="search"
              className="h-9 pl-[34px]"
              placeholder={t("search")}
              aria-label={t("search")}
              value={activity.search}
              onChange={(event) => activity.setSearch(event.target.value)}
            />
          </label>
        </div>

        {renderList()}

        <p className="mt-[22px] text-[12.5px] text-ink-3">
          {t("hint")}
          {overview?.placeSource?.startsWith(CREDITED_SOURCE_PREFIX) && (
            <>
              {" "}
              <a
                href={CREDIT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-sm underline underline-offset-2 outline-none hover:text-ink focus-visible:ring-[3px] focus-visible:ring-primary/35"
              >
                {t("credit")}
              </a>
            </>
          )}
        </p>
      </div>
    </FileManagerLayout>
  );
}

export default function ActivityPage() {
  return (
    <ProtectedRoute>
      <ActivityView />
    </ProtectedRoute>
  );
}
