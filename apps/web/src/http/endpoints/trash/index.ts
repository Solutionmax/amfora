import apiInstance from "@/config/api";

export type TrashKind = "file" | "folder";

export interface TrashItem {
  kind: TrashKind;
  id: string;
  name: string;
  size: number;
  /** Files inside; 1 for a file. */
  fileCount: number;
  /** The folder it was in, as a path. Null for the top level. */
  place: string | null;
  deletedAt: string;
  daysLeft: number;
}

export interface TrashList {
  items: TrashItem[];
  totalBytes: number;
  retentionDays: number;
  /** Emptying runs on the server; `failed` of the last run stays in the trash. */
  emptying: { running: boolean; removed: number; failed: number };
}

export const listTrash = async (): Promise<TrashList> => (await apiInstance.get("/api/trash")).data;

export const restoreFromTrash = (kind: TrashKind, id: string) => apiInstance.post(`/api/trash/${kind}/${id}/restore`);

export const deleteFromTrash = (kind: TrashKind, id: string) => apiInstance.delete(`/api/trash/${kind}/${id}`);

/** Starts emptying and answers at once; follow it through `emptying` of the list. */
export const emptyTrash = async (): Promise<{ status: "started" | "running" }> =>
  (await apiInstance.delete("/api/trash")).data;
