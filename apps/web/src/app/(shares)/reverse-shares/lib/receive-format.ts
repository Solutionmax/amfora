import { linkStatus } from "@/components/general/share-status";

export type ReceiveFilter = "all" | "active" | "inactive";

export const RECEIVE_FILTERS: ReceiveFilter[] = ["all", "active", "inactive"];

interface ReceiveLinkLike {
  name: string | null;
  isActive: boolean;
  expiration: string | null;
  maxFiles: number | null;
  files?: unknown[] | null;
}

/** Active = accepting files now; inactive = paused or past its end date. */
export function matchesFilter(link: ReceiveLinkLike, filter: ReceiveFilter): boolean {
  if (filter === "all") return true;
  const status = linkStatus({ expiration: link.expiration, isActive: link.isActive });
  const isOpen = status === "active" || status === "neverExpires";
  return filter === "active" ? isOpen : !isOpen;
}

export function matchesSearch(link: ReceiveLinkLike, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return (link.name ?? "").toLowerCase().includes(needle);
}

/** "3/20" when there is a file limit, otherwise just the count. */
export function receivedCount(link: ReceiveLinkLike): string {
  const count = link.files?.length ?? 0;
  return link.maxFiles ? `${count}/${link.maxFiles}` : String(count);
}

function toDate(value: string | Date): Date | null {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** "31 Oct" in the active locale; the year is added when it is not the current one. */
export function formatDay(value: string | Date, locale: string, now: Date = new Date()): string {
  const date = toDate(value);
  if (!date) return "";
  const sameYear = date.getFullYear() === now.getFullYear();
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    ...(sameYear ? {} : { year: "numeric" }),
  }).format(date);
}

/** "31 Oct, 14:12" in the active locale; the year is added when it is not the current one. */
export function formatDayTime(value: string | Date, locale: string, now: Date = new Date()): string {
  const date = toDate(value);
  if (!date) return "";
  const sameYear = date.getFullYear() === now.getFullYear();
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    ...(sameYear ? {} : { year: "numeric" }),
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

/** Value for an <input type="datetime-local"> in local time. */
export function toDateTimeLocal(value: string | null | undefined): string {
  if (!value) return "";
  const date = toDate(value);
  if (!date) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Comma separated extensions to a clean list: lower case, no dots, no duplicates. */
export function parseFileTypes(value: string | null | undefined): string[] {
  if (!value) return [];
  const parts = value
    .split(/[\s,|]+/)
    .map((part) => part.trim().replace(/^\.+/, "").toLowerCase())
    .filter(Boolean);
  return Array.from(new Set(parts));
}

/** Positive whole number or null (no limit). */
export function positiveIntOrNull(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : null;
}
