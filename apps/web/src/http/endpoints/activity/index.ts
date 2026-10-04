import apiInstance from "@/config/api";

export type ActivityKind = "share" | "receive" | "secret" | "account";

export interface ActivityEvent {
  id: string;
  kind: string;
  action: string;
  subject: string | null;
  subjectId: string | null;
  detail: string | null;
  amount: number | null;
  /** Null for a visitor. */
  actorName: string | null;
  place: string | null;
  createdAt: string;
}

export interface WeekCount {
  thisWeek: number;
  lastWeek: number;
}

export interface ActivityList {
  events: ActivityEvent[];
  hasMore: boolean;
  counts: Record<"all" | ActivityKind, number>;
  summary: { downloads: WeekCount; opened: WeekCount; filesReceived: WeekCount; failedSignIns: WeekCount };
  /** Name of the place database in use, for the credit its license asks for. */
  placeSource: string | null;
}

export interface ActivityQuery {
  kind?: ActivityKind;
  q?: string;
  subjectId?: string;
  /** Older than this moment: the `createdAt` of the last event already shown. */
  /** Id of the last event already shown; the answer continues after it. */
  cursor?: string;
}

const clean = (query: ActivityQuery) =>
  Object.fromEntries(Object.entries(query).filter(([, value]) => value !== undefined && value !== ""));

export const listActivity = async (query: ActivityQuery = {}): Promise<ActivityList> =>
  (await apiInstance.get("/api/activity", { params: clean(query) })).data;

/** Address of the CSV file for the same filter; the browser downloads it with the session cookie. */
export function activityExportUrl(query: Pick<ActivityQuery, "kind" | "q">): string {
  const params = new URLSearchParams(clean(query) as Record<string, string>).toString();
  return `/api/activity/export${params ? `?${params}` : ""}`;
}

export interface ShareNotifications {
  notifyOnDownload: boolean;
  remindBeforeExpiry: boolean;
}

export const updateShareNotifications = async (
  shareId: string,
  changes: Partial<ShareNotifications>
): Promise<ShareNotifications> =>
  (await apiInstance.patch(`/api/shares/${encodeURIComponent(shareId)}/notifications`, changes)).data;

export const updateReverseShareNotifications = async (
  reverseShareId: string,
  changes: { remindBeforeExpiry: boolean }
): Promise<{ remindBeforeExpiry: boolean }> =>
  (await apiInstance.patch(`/api/reverse-shares/${encodeURIComponent(reverseShareId)}/notifications`, changes)).data;

export interface StorageUsage {
  /** Null: no limit. */
  limitBytes: number | null;
  /** What counts towards the limit. */
  usedBytes: number;
  /** The part of `usedBytes` that sits in at least one share. */
  sharedBytes: number;
  /** Sent by others; does not count towards the limit. */
  receivedBytes: number;
}

export const getStorageUsage = async (): Promise<StorageUsage> => (await apiInstance.get("/api/storage/usage")).data;
