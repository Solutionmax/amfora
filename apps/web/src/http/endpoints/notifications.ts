import apiInstance from "@/config/api";

export interface Notification {
  id: string;
  action: string;
  subject: string | null;
  subjectId: string | null;
  /** Depends on the action: the end date of a link, "used/limit" of the storage. */
  detail: string | null;
  amount: number | null;
  actorName: string | null;
  createdAt: string;
  isNew: boolean;
}

export const listNotifications = async (): Promise<{ notifications: Notification[]; unseen: number }> =>
  (await apiInstance.get("/api/notifications")).data;

export const countNotifications = async (): Promise<number> =>
  (await apiInstance.get<{ count: number }>("/api/notifications/count")).data.count;

/** Everything up to `upTo` (the createdAt of the newest line the panel showed) counts as seen. */
export const markNotificationsSeen = async (upTo: string): Promise<void> => {
  await apiInstance.post("/api/notifications/seen", { upTo });
};
