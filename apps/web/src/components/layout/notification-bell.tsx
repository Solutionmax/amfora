"use client";

import { useState } from "react";
import Link from "next/link";
import { IconBell } from "@tabler/icons-react";
import { useFormatter, useTranslations } from "next-intl";

import { actionKey, notificationLink } from "@/app/activity/lib/activity-events";
import { EventChip } from "@/components/activity/event-chip";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/ui/empty-state";
import { useNotificationCount, useNotificationStore } from "@/hooks/use-notifications";
import { listNotifications, markNotificationsSeen, type Notification } from "@/http/endpoints/notifications";
import { cn } from "@/lib/utils";

const MAX_SHOWN_COUNT = 99;

type Panel = { state: "loading" } | { state: "error" } | { state: "ready"; items: Notification[] };

/** One sentence for a notification. The server's own words are never shown. */
function useSentence() {
  const t = useTranslations("notificationBell");
  const untitled = useTranslations("activity.untitled");
  const format = useFormatter();

  return (item: Notification): string => {
    const key = `items.${actionKey(item.action)}`;
    if (!t.has(key)) return t("items.other");
    const kind = item.action.split(".")[0];
    return t(key, {
      subject: item.subject ?? (untitled.has(kind) ? untitled(kind) : untitled("other")),
      count: item.amount ?? 1,
      percent: item.amount ?? 90,
      when: item.detail && !Number.isNaN(Date.parse(item.detail)) ? format.relativeTime(new Date(item.detail)) : "",
    });
  };
}

const ITEM_CLASS = "items-start gap-2.5 rounded-lg px-2 py-2";

function NotificationLine({ item, text, when }: { item: Notification; text: string; when: string }) {
  const t = useTranslations("notificationBell");
  const href = notificationLink({ kind: item.action.split(".")[0], action: item.action, subjectId: item.subjectId });
  const body = (
    <>
      <EventChip action={item.action} />
      <span className="min-w-0 flex-1 leading-snug">
        <span className="block break-words text-[13px] text-ink">{text}</span>
        <span className="mono block text-[11px] text-ink-3">{when}</span>
      </span>
      {item.isNew && (
        <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" role="img" aria-label={t("new")} />
      )}
    </>
  );

  return href ? (
    <DropdownMenuItem asChild className={ITEM_CLASS}>
      <Link href={href}>{body}</Link>
    </DropdownMenuItem>
  ) : (
    <DropdownMenuItem className={ITEM_CLASS} onSelect={(event) => event.preventDefault()}>
      {body}
    </DropdownMenuItem>
  );
}

/** A grey bell that opens the latest notifications. Quiet: a small count only when something is new. */
export function NotificationBell({ className }: { className?: string }) {
  const t = useTranslations("notificationBell");
  const format = useFormatter();
  const sentence = useSentence();
  const count = useNotificationCount();
  const clear = useNotificationStore((store) => store.clear);
  const [panel, setPanel] = useState<Panel>({ state: "loading" });

  const open = () => {
    setPanel({ state: "loading" });
    listNotifications()
      .then(({ notifications }) => {
        setPanel({ state: "ready", items: notifications });
        // Opening is looking: everything up to now counts as seen, the new ones stay marked in this panel.
        return markNotificationsSeen().then(clear);
      })
      .catch(() => setPanel((current) => (current.state === "ready" ? current : { state: "error" })));
  };

  return (
    <DropdownMenu onOpenChange={(isOpen) => isOpen && open()}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          data-testid="notification-bell"
          aria-label={count > 0 ? t("openWithCount", { count }) : t("open")}
          className={cn("relative", className)}
        >
          <IconBell className="size-[17px]" strokeWidth={1.8} aria-hidden="true" />
          {count > 0 && (
            <span
              data-testid="notification-count"
              className="mono absolute -right-0.5 -top-0.5 grid h-[15px] min-w-[15px] place-items-center rounded-full bg-primary px-1 text-[9.5px] font-semibold leading-none text-primary-foreground"
            >
              {count > MAX_SHOWN_COUNT ? `${MAX_SHOWN_COUNT}+` : count}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        side="top"
        data-testid="notification-panel"
        className="max-h-[min(440px,var(--radix-dropdown-menu-content-available-height))] w-[min(340px,calc(100vw-24px))] p-0"
      >
        <p className="border-b border-line px-3.5 py-2.5 text-[13px] font-semibold">{t("title")}</p>
        {panel.state === "loading" && <p className="px-3.5 py-6 text-center text-[13px] text-ink-3">{t("loading")}</p>}
        {panel.state === "error" && <p className="px-3.5 py-6 text-center text-[13px] text-bad">{t("error")}</p>}
        {panel.state === "ready" && panel.items.length === 0 && (
          <EmptyState
            icon={<IconBell strokeWidth={1.6} aria-hidden="true" />}
            title={t("empty")}
            description={t("emptyHint")}
            className="py-9"
          />
        )}
        {panel.state === "ready" && panel.items.length > 0 && (
          <ul className="p-1.5">
            {panel.items.map((item) => (
              <li key={item.id}>
                <NotificationLine
                  item={item}
                  text={sentence(item)}
                  when={format.relativeTime(new Date(item.createdAt))}
                />
              </li>
            ))}
          </ul>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
