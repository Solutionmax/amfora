"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { EventChip } from "@/components/activity/event-chip";
import { useEventText } from "@/components/activity/use-event-text";
import { Button } from "@/components/ui/button";
import { LineList, LineRow, SubHeading } from "@/components/ui/line-list";
import { Skeleton } from "@/components/ui/skeleton";
import { listActivity, type ActivityEvent } from "@/http/endpoints/activity";

/** How many events the share shows before sending the reader to the full list. */
const RECENT_COUNT = 5;

/** The last few things that happened to one share. */
export function ShareActivity({ shareId }: { shareId: string }) {
  const t = useTranslations("shares.calm.activity");
  const text = useEventText();
  const [events, setEvents] = useState<ActivityEvent[] | null>(null);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    setLoadError(false);
    try {
      const list = await listActivity({ subjectId: shareId });
      setEvents(list.events.slice(0, RECENT_COUNT));
    } catch (error) {
      setLoadError(true);
      console.error("Failed to load share activity:", error);
    }
  }, [shareId]);

  useEffect(() => {
    setEvents(null);
    void load();
  }, [load]);

  const when = (event: ActivityEvent) =>
    `${text.day(new Date(event.createdAt), "short")}, ${text.time(event.createdAt)}`;

  return (
    <section className="mb-[26px]" data-testid="share-activity">
      <div className="flex items-center justify-between gap-3">
        <SubHeading>{t("title")}</SubHeading>
        <Link
          href="/activity"
          className="rounded-md text-[13px] font-semibold text-primary outline-none hover:text-[color-mix(in_oklab,var(--primary)_75%,var(--ink))] focus-visible:ring-[3px] focus-visible:ring-primary/35"
        >
          {t("all")}
        </Link>
      </div>
      {loadError ? (
        <div className="flex flex-wrap items-center justify-between gap-3 py-3 text-[13px]">
          <span className="text-bad">{t("loadError")}</span>
          <Button variant="outline" size="sm" onClick={() => void load()}>
            {t("retry")}
          </Button>
        </div>
      ) : events === null ? (
        <div aria-hidden="true">
          {[0, 1].map((row) => (
            <div key={row} className="flex items-center gap-3.5 py-2.5">
              <Skeleton className="size-8 rounded-[10px]" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3.5 w-2/5" />
                <Skeleton className="h-3 w-1/4" />
              </div>
            </div>
          ))}
        </div>
      ) : events.length === 0 ? (
        <p className="py-3 text-[13px] text-ink-3">{t("none")}</p>
      ) : (
        <LineList>
          {events.map((event) => {
            const detail = text.detail(event);
            return (
              <LineRow
                key={event.id}
                className="min-h-0 py-2.5"
                icon={<EventChip action={event.action} />}
                title={detail ? `${text.title(event)} ${detail}` : text.title(event)}
                sub={`${text.who(event)} · ${text.place(event)}`}
              >
                <time dateTime={event.createdAt} className="whitespace-nowrap text-[13px] tabular-nums text-ink-2">
                  {when(event)}
                </time>
              </LineRow>
            );
          })}
        </LineList>
      )}
    </section>
  );
}
