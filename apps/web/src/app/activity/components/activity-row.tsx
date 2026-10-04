"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { IconEye } from "@tabler/icons-react";

import { EventChip } from "@/components/activity/event-chip";
import { useEventText } from "@/components/activity/use-event-text";
import { Skeleton } from "@/components/ui/skeleton";
import type { ActivityEvent } from "@/http/endpoints/activity";
import { cn } from "@/lib/utils";
import { eventLink, initials } from "../lib/activity-events";

/** Icon, text, who, where, when. Who and where leave on narrow screens. */
const ROW_GRID =
  "grid grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-3.5 rounded-xl px-1 py-2.5 sm:px-3 md:grid-cols-[32px_minmax(0,1fr)_150px_120px_56px] lg:grid-cols-[32px_minmax(0,1fr)_170px_130px_64px]";

function Who({ name, isVisitor }: { name: string; isVisitor: boolean }) {
  return (
    <span data-testid="activity-who" className="hidden min-w-0 items-center gap-2 text-[13px] text-ink-2 md:flex">
      <span
        aria-hidden="true"
        className={cn(
          "grid size-[22px] shrink-0 place-items-center rounded-full font-display text-[9px] font-bold",
          isVisitor ? "bg-line text-ink-2" : "bg-primary text-primary-foreground"
        )}
      >
        {isVisitor ? <IconEye className="size-[11px]" stroke={2} /> : initials(name)}
      </span>
      <span className="truncate">{name}</span>
    </span>
  );
}

/** One event. The whole row leads to the share, receive link or secret when there is one. */
export function ActivityRow({ event }: { event: ActivityEvent }) {
  const text = useEventText();
  const detail = text.detail(event);
  const href = eventLink(event);

  const cells: ReactNode = (
    <>
      <EventChip action={event.action} />
      <span className="min-w-0">
        <b className="block break-words font-semibold [overflow-wrap:anywhere]">
          {text.title(event)}
          {detail && <span className="font-medium text-ink-2"> {detail}</span>}
        </b>
        <small className="block truncate text-[12.5px] text-ink-3">{text.subject(event)}</small>
      </span>
      <Who name={text.who(event)} isVisitor={event.actorName === null} />
      <span className="hidden truncate text-[13px] text-ink-3 md:block">{text.place(event)}</span>
      <time dateTime={event.createdAt} className="mono text-right text-xs tabular-nums text-ink-3">
        {text.time(event.createdAt)}
      </time>
    </>
  );

  return (
    <li data-testid="activity-event" data-action={event.action}>
      {href ? (
        <Link
          href={href}
          className={cn(
            ROW_GRID,
            "outline-none transition-colors duration-100 hover:bg-surface-2 focus-visible:ring-[3px] focus-visible:ring-primary/35"
          )}
        >
          {cells}
        </Link>
      ) : (
        <div className={cn(ROW_GRID, "transition-colors duration-100 hover:bg-surface-2")}>{cells}</div>
      )}
    </li>
  );
}

/** Rows in the shape of the list, while it loads. */
export function ActivityRowsSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div aria-hidden="true" className="pt-[26px]">
      <Skeleton className="mb-3 h-3 w-24" />
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className={ROW_GRID}>
          <Skeleton className="size-8 rounded-[10px]" />
          <span className="space-y-2">
            <Skeleton className="h-3.5 w-3/5" />
            <Skeleton className="h-3 w-2/5" />
          </span>
          <Skeleton className="hidden h-3 w-24 md:block" />
          <Skeleton className="hidden h-3 w-20 md:block" />
          <Skeleton className="ml-auto h-3 w-9" />
        </div>
      ))}
    </div>
  );
}
