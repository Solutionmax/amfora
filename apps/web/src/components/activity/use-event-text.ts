"use client";

import { useFormatter, useTranslations } from "next-intl";

import { actionKey, dayLabel, parseOpening } from "@/app/activity/lib/activity-events";
import type { ActivityEvent } from "@/http/endpoints/activity";
import { formatFileSize } from "@/utils/format-file-size";

/** The server's own word for an address inside the house. */
const LOCAL_NETWORK = "Local network";

/** Words for an event: what happened, to what, by whom, where and when. */
export function useEventText() {
  const t = useTranslations("activity");
  const format = useFormatter();

  const title = (event: ActivityEvent): string => {
    const key = `actions.${actionKey(event.action)}`;
    return t.has(key) ? t(key, { count: event.amount ?? 1 }) : t("actions.other");
  };

  /** The lighter words after the title. The server's own sentences are never shown as they are. */
  const detail = (event: ActivityEvent): string | null => {
    switch (event.action) {
      case "share.downloaded":
        return event.detail;
      case "receive.files_received": {
        const bytes = Number(event.detail);
        return event.detail && Number.isFinite(bytes) ? formatFileSize(bytes) : null;
      }
      case "secret.opened": {
        const opening = parseOpening(event.detail);
        return opening ? t("details.opening", opening) : null;
      }
      case "secret.destroyed":
        return t("details.destroyed");
      case "account.signed_in":
        return event.detail === "passkey" ? t("details.viaPasskey") : null;
      case "account.sign_in_failed":
        return event.detail === "passkey" ? t("details.passkeyFailed") : t("details.signInFailed");
      default:
        return t.has(`actions.${actionKey(event.action)}`) ? null : event.action;
    }
  };

  const subject = (event: ActivityEvent): string => {
    if (event.subject) return event.subject;
    const key = `untitled.${event.kind}`;
    return t.has(key) ? t(key) : t("untitled.other");
  };

  const place = (event: ActivityEvent): string => {
    if (!event.place) return t("unknownPlace");
    return event.place === LOCAL_NETWORK ? t("localNetwork") : event.place;
  };

  const who = (event: ActivityEvent): string => event.actorName ?? t("visitor");

  const time = (value: string): string => format.dateTime(new Date(value), { hour: "2-digit", minute: "2-digit" });

  /** "Today", "Yesterday", or the date; the year only when it is not this one. */
  const day = (date: Date, month: "long" | "short" = "long", now = new Date()): string => {
    const label = dayLabel(date, now);
    if (label !== "date") return t(`days.${label}`);
    const sameYear = date.getFullYear() === now.getFullYear();
    return format.dateTime(date, { day: "numeric", month, ...(sameYear ? {} : { year: "numeric" }) });
  };

  return { title, detail, subject, place, who, time, day };
}
