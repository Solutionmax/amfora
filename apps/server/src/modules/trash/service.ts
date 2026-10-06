import { prisma } from "../../shared/prisma";
import { chunked, liveFolderOf, notDeleted } from "../../shared/trash";
import { generateUniqueFileName, generateUniqueFolderName, parseFileName } from "../../utils/file-name-generator";
import { noteStorageUsage } from "../activity/notifications";
import { FileService } from "../file/service";
import { MS_PER_DAY, trashRetentionDays } from "./settings";

export type TrashKind = "file" | "folder";

type FolderNode = { id: string; name: string; parentId: string | null; deletedAt: Date | null };

const sameMoment = (a: Date | null, b: Date | null) => a !== null && b !== null && a.getTime() === b.getTime();

/** The ids of a folder and everything below it, from the flat list of folders. */
function treeIds(rootId: string, folders: ReadonlyArray<{ id: string; parentId: string | null }>): string[] {
  const children = new Map<string, string[]>();
  for (const folder of folders) {
    if (folder.parentId) children.set(folder.parentId, [...(children.get(folder.parentId) ?? []), folder.id]);
  }
  const ids: string[] = [];
  const queue = [rootId];
  for (let id = queue.shift(); id !== undefined; id = queue.shift()) {
    ids.push(id);
    queue.push(...(children.get(id) ?? []));
  }
  return ids;
}

const TRANSACTION_MS = 30_000;

const removeObject = (objectName: string) => new FileService().deleteObject(objectName);

/** Deleting in the workspace: the file stays where storage keeps it, marked with the moment. */
export async function moveFileToTrash(fileId: string, now: Date): Promise<void> {
  await prisma.file.update({ where: { id: fileId }, data: { deletedAt: now } });
}

/**
 * The folder and what is in it that is not in the trash yet get the same moment. What was
 * trashed on its own earlier keeps its own, which is how a restore tells them apart.
 */
export async function moveFolderToTrash(folderId: string, userId: string, now: Date): Promise<void> {
  // One transaction: what is created under the folder meanwhile cannot stay live under it.
  await prisma.$transaction(
    async (tx) => {
      const folders = await tx.folder.findMany({
        where: { userId, ...notDeleted },
        select: { id: true, parentId: true },
      });
      for (const ids of chunked(treeIds(folderId, folders))) {
        await tx.file.updateMany({ where: { userId, folderId: { in: ids }, ...notDeleted }, data: { deletedAt: now } });
        await tx.folder.updateMany({ where: { userId, id: { in: ids }, ...notDeleted }, data: { deletedAt: now } });
      }
    },
    { timeout: TRANSACTION_MS }
  );
}

export interface TrashItem {
  kind: TrashKind;
  id: string;
  name: string;
  size: number;
  fileCount: number;
  place: string | null;
  deletedAt: Date;
  daysLeft: number;
}

/** What the trash shows: the items that were deleted themselves, not their contents. */
async function trashRoots(userId: string, retentionDays: number, now: Date) {
  const [files, folders] = await Promise.all([
    prisma.file.findMany({
      where: { userId, deletedAt: { not: null } },
      select: { id: true, name: true, size: true, folderId: true, deletedAt: true },
    }),
    prisma.folder.findMany({ where: { userId }, select: { id: true, name: true, parentId: true, deletedAt: true } }),
  ]);
  const byId = new Map<string, FolderNode>(folders.map((folder) => [folder.id, folder]));
  const filesIn = new Map<string, typeof files>();
  for (const file of files) {
    if (file.folderId) filesIn.set(file.folderId, [...(filesIn.get(file.folderId) ?? []), file]);
  }

  const placeOf = (parentId: string | null) => {
    const names: string[] = [];
    for (let id = parentId, steps = 0; id && steps < folders.length; steps++) {
      const folder = byId.get(id);
      if (!folder) break;
      names.unshift(folder.name);
      id = folder.parentId;
    }
    return names.length > 0 ? names.join("/") : null;
  };
  const daysLeft = (deletedAt: Date) =>
    Math.max(0, Math.ceil((deletedAt.getTime() + retentionDays * MS_PER_DAY - now.getTime()) / MS_PER_DAY));
  const isRoot = (deletedAt: Date | null, parentId: string | null) =>
    !parentId || !sameMoment(byId.get(parentId)?.deletedAt ?? null, deletedAt);

  const items: TrashItem[] = [];
  for (const file of files) {
    if (!file.deletedAt || !isRoot(file.deletedAt, file.folderId)) continue;
    items.push({
      kind: "file",
      id: file.id,
      name: file.name,
      size: Number(file.size),
      fileCount: 1,
      place: placeOf(file.folderId),
      deletedAt: file.deletedAt,
      daysLeft: daysLeft(file.deletedAt),
    });
  }
  for (const folder of folders) {
    if (!folder.deletedAt || !isRoot(folder.deletedAt, folder.parentId)) continue;
    // What went with the folder: the files trashed on their own earlier are lines of their own.
    const inside = treeIds(folder.id, folders)
      .flatMap((id) => filesIn.get(id) ?? [])
      .filter((file) => sameMoment(file.deletedAt, folder.deletedAt));
    items.push({
      kind: "folder",
      id: folder.id,
      name: folder.name,
      size: inside.reduce((sum, file) => sum + Number(file.size), 0),
      fileCount: inside.length,
      place: placeOf(folder.parentId),
      deletedAt: folder.deletedAt,
      daysLeft: daysLeft(folder.deletedAt),
    });
  }
  items.sort((a, b) => b.deletedAt.getTime() - a.deletedAt.getTime());
  const totalBytes = files.reduce((sum, file) => sum + Number(file.size), 0);
  return { items, totalBytes };
}

/** Per user: the run that is going on, and what the last one did. Only one run per user at a time. */
const emptyRuns = new Map<string, { running: boolean; removed: number; failed: number }>();

export function emptyingState(userId: string) {
  return emptyRuns.get(userId) ?? { running: false, removed: 0, failed: 0 };
}

export async function listTrash(userId: string, now: Date) {
  const retentionDays = await trashRetentionDays();
  return { ...(await trashRoots(userId, retentionDays, now)), retentionDays, emptying: emptyingState(userId) };
}

/** Where a restored item goes: back to its folder when that is still in the workspace, else the top. */
async function placeToRestore(userId: string, parentId: string | null): Promise<string | null> {
  if (!parentId) return null;
  return (await liveFolderOf(userId, parentId))?.id ?? null;
}

async function restoreFile(userId: string, id: string): Promise<boolean> {
  const file = await prisma.file.findFirst({ where: { id, userId, deletedAt: { not: null } } });
  if (!file) return false;
  const folderId = await placeToRestore(userId, file.folderId);
  const { baseName, extension } = parseFileName(file.name);
  const name = await generateUniqueFileName(baseName, extension, userId, folderId);
  await prisma.file.update({ where: { id }, data: { deletedAt: null, folderId, name } });
  return true;
}

async function restoreFolder(userId: string, id: string): Promise<boolean> {
  const folder = await prisma.folder.findFirst({ where: { id, userId, deletedAt: { not: null } } });
  if (!folder) return false;
  const parentId = await placeToRestore(userId, folder.parentId);
  const name = await generateUniqueFolderName(folder.name, userId, parentId);
  const folders = await prisma.folder.findMany({
    where: { userId },
    select: { id: true, parentId: true, deletedAt: true },
  });
  const deletedAtOf = new Map(folders.map((candidate) => [candidate.id, candidate.deletedAt]));
  const together = treeIds(id, folders).filter((member) =>
    sameMoment(deletedAtOf.get(member) ?? null, folder.deletedAt)
  );
  await prisma.$transaction([
    ...chunked(together).flatMap((ids) => [
      prisma.file.updateMany({
        where: { userId, folderId: { in: ids }, deletedAt: folder.deletedAt },
        data: { deletedAt: null },
      }),
      prisma.folder.updateMany({ where: { userId, id: { in: ids } }, data: { deletedAt: null } }),
    ]),
    prisma.folder.update({ where: { id }, data: { parentId, name } }),
  ]);
  return true;
}

/** Puts an item back; false when the caller has no such item in the trash. */
export function restoreItem(userId: string, kind: TrashKind, id: string): Promise<boolean> {
  return kind === "file" ? restoreFile(userId, id) : restoreFolder(userId, id);
}

type PurgeFile = { id: string; userId: string };

/** Whether another row, a file or a folder, still points to the object. */
async function isObjectInUse(objectName: string, exceptFileId: string | null, exceptFolderIds: string[]) {
  const [files, folders] = await Promise.all([
    prisma.file.count({ where: { objectName, ...(exceptFileId ? { id: { not: exceptFileId } } : {}) } }),
    prisma.folder.count({ where: { objectName, id: { notIn: exceptFolderIds } } }),
  ]);
  return files + folders > 0;
}

/** Puts a claimed row back as it was, shares included; at the top level when its folder is gone. */
async function restoreClaimedRow(row: FileWithShares, storageError: unknown): Promise<never> {
  const { shares, ...data } = row;
  const connect = shares.map((share) => ({ id: share.id }));
  try {
    await prisma.file.create({ data: { ...data, shares: { connect } } });
  } catch {
    try {
      await prisma.file.create({ data: { ...data, folderId: null, shares: { connect } } });
    } catch (error) {
      console.error(`Could not put back ${row.id} (${row.objectName}) after storage refused:`, error, row);
    }
  }
  throw storageError;
}

type FileWithShares = NonNullable<Awaited<ReturnType<typeof findTrashedRow>>>;

const findTrashedRow = (file: PurgeFile) =>
  prisma.file.findFirst({
    where: { id: file.id, userId: file.userId, deletedAt: { not: null } },
    include: { shares: { select: { id: true } } },
  });

/**
 * Removes one file that is in the trash. The row goes first, with one conditional delete: only
 * when it removed the row is the file still in the trash, so a restore that came in between can
 * never lose its object. When storage refuses, the row is put back as it was (still in the
 * trash, in its shares), so what is left can be tried again. A crash between the two leaves an
 * unused object and no lost file. An object that another row still uses stays.
 */
async function purgeFileRow(file: PurgeFile): Promise<boolean> {
  const row = await findTrashedRow(file);
  if (!row) return false;
  const claimed = await prisma.file.deleteMany({ where: { id: row.id, userId: row.userId, deletedAt: { not: null } } });
  if (claimed.count === 0) return false;
  try {
    if (!(await isObjectInUse(row.objectName, null, []))) await removeObject(row.objectName);
  } catch (error) {
    return restoreClaimedRow(row, error);
  }
  return true;
}

const purgeFile = (userId: string, id: string) => purgeFileRow({ id, userId });

type FolderRow = { id: string; objectName: string; parentId: string | null; deletedAt: Date | null };

/** The folders that die with the root: trashed ones reached through trashed ones; a live one stops the walk. */
function doomedFolders(rootId: string, folders: ReadonlyArray<FolderRow>) {
  const children = new Map<string, FolderRow[]>();
  for (const folder of folders) {
    if (folder.parentId) children.set(folder.parentId, [...(children.get(folder.parentId) ?? []), folder]);
  }
  const doomed: string[] = [];
  const rescued: string[] = [];
  const queue = [rootId];
  for (let id = queue.shift(); id !== undefined; id = queue.shift()) {
    doomed.push(id);
    for (const child of children.get(id) ?? []) (child.deletedAt ? queue : rescued).push(child.id);
  }
  return { doomed, rescued };
}

async function trashedFilesIn(userId: string, folderIds: string[]): Promise<PurgeFile[]> {
  const found: PurgeFile[] = [];
  for (const ids of chunked(folderIds)) {
    found.push(
      ...(await prisma.file.findMany({
        where: { userId, folderId: { in: ids }, deletedAt: { not: null } },
        select: { id: true, userId: true },
      }))
    );
  }
  return found;
}

const PURGE_ROUNDS = 3;

/** Files were still arriving in the folder after the rounds: nothing was removed, try again later. */
export class PurgeIncompleteError extends Error {
  constructor() {
    super("Some files in this folder could not be removed yet.");
  }
}

/**
 * Removes a trashed folder with what is trashed under it. Whatever is live under it (it can get
 * there through a restore from another tab) is moved to the top level and kept, and a folder that
 * is restored meanwhile is not removed at all. Folders have no object in storage, so only the
 * files' objects are removed. False when the folder is no longer in the trash; throws when files
 * are left after the rounds.
 */
async function purgeFolder(userId: string, id: string): Promise<boolean> {
  const root = await prisma.folder.findFirst({ where: { id, userId, deletedAt: { not: null } } });
  if (!root) return false;
  const tree = () =>
    prisma.folder.findMany({
      where: { userId },
      select: { id: true, objectName: true, parentId: true, deletedAt: true },
    });

  for (let round = 0; round < PURGE_ROUNDS; round++) {
    const files = await trashedFilesIn(userId, doomedFolders(id, await tree()).doomed);
    if (files.length === 0) break;
    for (const file of files) await purgeFileRow(file);
  }

  const gone = await prisma.$transaction(
    async (tx) => {
      const folders = await tx.folder.findMany({
        where: { userId },
        select: { id: true, objectName: true, parentId: true, deletedAt: true },
      });
      if (!folders.find((folder) => folder.id === id)?.deletedAt) return null;
      const { doomed, rescued } = doomedFolders(id, folders);
      for (const ids of chunked(doomed)) {
        if ((await tx.file.count({ where: { userId, folderId: { in: ids }, deletedAt: { not: null } } })) > 0)
          return "left" as const;
      }
      for (const ids of chunked(doomed)) {
        await tx.file.updateMany({ where: { userId, folderId: { in: ids } }, data: { folderId: null } });
      }
      for (const ids of chunked(rescued))
        await tx.folder.updateMany({ where: { id: { in: ids } }, data: { parentId: null } });
      for (const ids of chunked(doomed))
        await tx.folder.deleteMany({ where: { id: { in: ids }, deletedAt: { not: null } } });
      return "gone" as const;
    },
    { timeout: TRANSACTION_MS }
  );
  if (gone === "left") throw new PurgeIncompleteError();
  return gone !== null;
}

/** Deletes an item for good; false when the caller has no such item in the trash. */
export async function purgeItem(userId: string, kind: TrashKind, id: string): Promise<boolean> {
  const gone = await (kind === "file" ? purgeFile(userId, id) : purgeFolder(userId, id));
  if (gone) await noteStorageUsage(userId); // room freed: a storage alert under 90 percent is cleared
  return gone;
}

/** Deletes the given items for good. One that fails does not stop the others. */
export async function purgeItems(
  userId: string,
  items: ReadonlyArray<{ kind: TrashKind; id: string }>
): Promise<{ removed: number; failed: number }> {
  let removed = 0;
  let failed = 0;
  for (const item of items) {
    try {
      if (await purgeItem(userId, item.kind, item.id)) removed += 1;
    } catch (error) {
      failed += 1;
      console.error(`Could not delete ${item.kind} ${item.id} for good:`, error);
    }
  }
  return { removed, failed };
}

export async function emptyTrash(userId: string, now: Date) {
  const { items } = await trashRoots(userId, await trashRetentionDays(), now);
  return purgeItems(userId, items);
}

/** Starts emptying in the background, so the request does not wait for storage. */
export function startEmptyTrash(userId: string, now: Date): "started" | "running" {
  if (emptyingState(userId).running) return "running";
  emptyRuns.set(userId, { running: true, removed: 0, failed: 0 });
  emptyTrash(userId, now)
    .then((result) => emptyRuns.set(userId, { running: false, ...result }))
    .catch((error) => {
      console.error("Emptying the trash failed:", error);
      emptyRuns.set(userId, { running: false, removed: 0, failed: 0 });
    });
  return "started";
}

/** The items of every user that have been in the trash longer than the setting. */
export async function purgeExpiredTrash(now: Date): Promise<{ removed: number; failed: number }> {
  const retentionDays = await trashRetentionDays();
  const cutoff = now.getTime() - retentionDays * MS_PER_DAY;
  const [files, folders] = await Promise.all([
    prisma.file.findMany({ where: { deletedAt: { not: null } }, select: { userId: true }, distinct: ["userId"] }),
    prisma.folder.findMany({ where: { deletedAt: { not: null } }, select: { userId: true }, distinct: ["userId"] }),
  ]);
  const total = { removed: 0, failed: 0 };
  for (const userId of new Set([...files, ...folders].map((row) => row.userId))) {
    const { items } = await trashRoots(userId, retentionDays, now);
    const expired = items.filter((item) => item.deletedAt.getTime() < cutoff);
    const result = await purgeItems(userId, expired);
    total.removed += result.removed;
    total.failed += result.failed;
  }
  return total;
}
