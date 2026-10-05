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
}

export const listTrash = async (): Promise<TrashList> => (await apiInstance.get("/api/trash")).data;

export const restoreFromTrash = (kind: TrashKind, id: string) => apiInstance.post(`/api/trash/${kind}/${id}/restore`);

export const deleteFromTrash = (kind: TrashKind, id: string) => apiInstance.delete(`/api/trash/${kind}/${id}`);

/** `failed` counts the items storage refused; they stay in the trash. */
export const emptyTrash = async (): Promise<{ removed: number; failed: number }> =>
  (await apiInstance.delete("/api/trash")).data;
