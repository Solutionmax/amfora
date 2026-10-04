"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";

import { useEventText } from "@/components/activity/use-event-text";
import type { ActivityEvent } from "@/http/endpoints/activity";
import { groupByDay } from "../lib/activity-events";
import { ActivityRow } from "./activity-row";

/** Events under a line per day: "Today · 4 events". */
export function ActivityList({ events }: { events: ActivityEvent[] }) {
  const t = useTranslations("activity");
  const text = useEventText();
  const days = useMemo(() => groupByDay(events, new Date()), [events]);

  return (
    <>
      {days.map((day) => (
        <section key={day.key} aria-labelledby={`day-${day.key}`}>
          <h2
            id={`day-${day.key}`}
            className="mono mb-1 mt-[26px] flex items-center gap-3 text-[10.5px] font-medium uppercase tracking-[0.1em] text-ink-3 after:h-px after:flex-1 after:bg-line"
          >
            <b className="font-medium text-ink">{text.day(day.date)}</b>
            {t("eventCount", { count: day.events.length })}
          </h2>
          <ul>
            {day.events.map((event) => (
              <ActivityRow key={event.id} event={event} />
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}
