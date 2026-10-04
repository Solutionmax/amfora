import type { ActivityEvent, ActivityKind, WeekCount } from "@/http/endpoints/activity";

export const ACTIVITY_FILTERS = ["all", "share", "receive", "secret", "account"] as const;
export type ActivityFilter = (typeof ACTIVITY_FILTERS)[number];

export const kindOf = (filter: ActivityFilter): ActivityKind | undefined => (filter === "all" ? undefined : filter);

/** Colour of the icon chip: what kind of news an event is. */
export type EventTone = "ok" | "warn" | "bad" | "accent" | "plain";

const TONES: Record<string, EventTone> = {
  "share.downloaded": "ok",
  "receive.files_received": "ok",
  "secret.opened": "ok",
  "share.password_failed": "warn",
  "account.sign_in_failed": "bad",
  "secret.destroyed": "bad",
  "share.created": "accent",
  "secret.created": "accent",
};

export const eventTone = (action: string): EventTone => TONES[action] ?? "plain";

/** Message key of an action: `share.password_failed` becomes `sharePasswordFailed`. */
export const actionKey = (action: string): string =>
  action.replace(/[._]([a-z])/g, (_match, letter: string) => letter.toUpperCase());

/** "1/3" in the detail of an opened secret: opening 1 of 3. */
export function parseOpening(detail: string | null): { opening: number; max: number } | null {
  const match = /^(\d+)\/(\d+)$/.exec(detail ?? "");
  return match ? { opening: Number(match[1]), max: Number(match[2]) } : null;
}

const PAGES: Partial<Record<string, string>> = { share: "/shares", receive: "/reverse-shares", secret: "/secrets" };
/** After these the thing is gone, so there is nothing to link to. */
const GONE_ACTIONS: readonly string[] = ["share.deleted", "secret.deleted", "secret.destroyed"];

/** The page of the share, receive link or secret an event is about, if it can still exist. */
export function eventLink(event: Pick<ActivityEvent, "kind" | "action" | "subjectId">): string | null {
  const page = PAGES[event.kind];
  if (!page || !event.subjectId || GONE_ACTIONS.includes(event.action)) return null;
  return `${page}?id=${encodeURIComponent(event.subjectId)}`;
}

export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((word) => word[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export type DayLabel = "today" | "yesterday" | "date";

export interface DayGroup<T> {
  /** Local calendar day, `2026-10-04`. */
  key: string;
  label: DayLabel;
  date: Date;
  events: T[];
}

const pad = (value: number) => String(value).padStart(2, "0");
const dayKey = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

/** Whether a moment falls on the reader's today, yesterday or an earlier day. */
export function dayLabel(date: Date, now: Date): DayLabel {
  const key = dayKey(date);
  if (key === dayKey(now)) return "today";
  return key === dayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)) ? "yesterday" : "date";
}

/** Splits a newest-first list into the calendar days of the reader, keeping the order. */
export function groupByDay<T extends { createdAt: string }>(events: readonly T[], now: Date): DayGroup<T>[] {
  const groups: DayGroup<T>[] = [];

  for (const event of events) {
    const date = new Date(event.createdAt);
    const key = dayKey(date);
    const last = groups[groups.length - 1];
    if (last?.key === key) {
      last.events.push(event);
      continue;
    }
    groups.push({ key, label: dayLabel(date, now), date, events: [event] });
  }

  return groups;
}

export interface WeekChange {
  direction: "up" | "down" | "same";
  /** "+4", "-2", or an empty string when nothing changed. */
  text: string;
}

/** How this week compares with the week before. */
export function weekChange({ thisWeek, lastWeek }: WeekCount): WeekChange {
  const difference = thisWeek - lastWeek;
  if (difference === 0) return { direction: "same", text: "" };
  return difference > 0 ? { direction: "up", text: `+${difference}` } : { direction: "down", text: String(difference) };
}
