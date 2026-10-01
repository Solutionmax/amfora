import { linkStatus } from "../../../../components/general/share-status";

export type ShareFilter = "all" | "active" | "expired";

export const SHARE_FILTERS: readonly ShareFilter[] = ["all", "active", "expired"];

interface Named {
  id: string;
  name: string | null;
  expiration: string | null;
}

interface FolderLike {
  id: string;
  parentId: string | null;
}

interface FileLike {
  id: string;
  folderId: string | null;
}

/** Active = never expires or not expired yet. Expired = end date in the past. */
export function matchesFilter(share: Pick<Named, "expiration">, filter: ShareFilter): boolean {
  if (filter === "all") return true;
  const status = linkStatus({ expiration: share.expiration });
  return filter === "expired" ? status === "expired" : status === "active" || status === "neverExpires";
}

export function filterShares<T extends Named>(shares: readonly T[], filter: ShareFilter, query: string): T[] {
  const needle = query.trim().toLowerCase();
  return shares.filter(
    (share) => matchesFilter(share, filter) && (!needle || (share.name ?? "").toLowerCase().includes(needle))
  );
}

export function shareUrl(origin: string, alias: string): string {
  return `${origin}/s/${alias}`;
}

/** Folders whose parent is not shared too, and files that are not inside a shared folder. */
export function topLevelItems<F extends FolderLike, L extends FileLike>(share: { folders: F[]; files: L[] }) {
  const folderIds = new Set(share.folders.map((folder) => folder.id));
  return {
    folders: share.folders.filter((folder) => !folder.parentId || !folderIds.has(folder.parentId)),
    files: share.files.filter((file) => !file.folderId || !folderIds.has(file.folderId)),
  };
}

/** A shared folder with every shared folder and file below it, so removing it leaves nothing behind. */
export function folderWithContents(share: { folders: FolderLike[]; files: FileLike[] }, folderId: string) {
  const folders = new Set([folderId]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const folder of share.folders) {
      if (folder.parentId && folders.has(folder.parentId) && !folders.has(folder.id)) {
        folders.add(folder.id);
        grew = true;
      }
    }
  }
  const files = share.files.filter((file) => file.folderId && folders.has(file.folderId)).map((file) => file.id);
  return { folders: [...folders], files };
}

/** Number of shared files inside a folder, at any depth. */
export function filesInFolder(share: { folders: FolderLike[]; files: FileLike[] }, folderId: string): number {
  return folderWithContents(share, folderId).files.length;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Value for an <input type="datetime-local"> in the viewer's own time zone. */
export function toLocalInputValue(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Parses the view-limit field: empty = no limit, otherwise a whole number of 1 or more. */
export function parseViewLimit(raw: string): { ok: true; value: number | null } | { ok: false } {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: true, value: null };
  if (!/^\d+$/.test(trimmed)) return { ok: false };
  const value = Number(trimmed);
  return value >= 1 ? { ok: true, value } : { ok: false };
}
