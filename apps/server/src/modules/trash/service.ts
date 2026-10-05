import { prisma } from "../../shared/prisma";
import { notDeleted } from "../../shared/trash";
import { generateUniqueFileName, generateUniqueFolderName, parseFileName } from "../../utils/file-name-generator";
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
  const folders = await prisma.folder.findMany({
    where: { userId, ...notDeleted },
    select: { id: true, parentId: true },
  });
  const ids = treeIds(folderId, folders);
  await prisma.$transaction([
    prisma.file.updateMany({ where: { userId, folderId: { in: ids }, ...notDeleted }, data: { deletedAt: now } }),
    prisma.folder.updateMany({ where: { userId, id: { in: ids }, ...notDeleted }, data: { deletedAt: now } }),
  ]);
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

export async function listTrash(userId: string, now: Date) {
  const retentionDays = await trashRetentionDays();
  return { ...(await trashRoots(userId, retentionDays, now)), retentionDays };
}

/** Where a restored item goes: back to its folder when that is still in the workspace, else the top. */
async function placeToRestore(userId: string, parentId: string | null): Promise<string | null> {
  if (!parentId) return null;
  const parent = await prisma.folder.findFirst({
    where: { id: parentId, userId, ...notDeleted },
    select: { id: true },
  });
  return parent?.id ?? null;
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
  const together = treeIds(id, folders).filter((member) =>
    sameMoment(folders.find((candidate) => candidate.id === member)?.deletedAt ?? null, folder.deletedAt)
  );
  await prisma.$transaction([
    prisma.file.updateMany({
      where: { userId, folderId: { in: together }, deletedAt: folder.deletedAt },
      data: { deletedAt: null },
    }),
    prisma.folder.updateMany({ where: { userId, id: { in: together } }, data: { deletedAt: null } }),
    prisma.folder.update({ where: { id }, data: { parentId, name } }),
  ]);
  return true;
}

/** Puts an item back; false when the caller has no such item in the trash. */
export function restoreItem(userId: string, kind: TrashKind, id: string): Promise<boolean> {
  return kind === "file" ? restoreFile(userId, id) : restoreFolder(userId, id);
}

/**
 * The only place where objects leave storage. An object goes first and then its row, so when
 * storage refuses, what is left is still in the trash to try again.
 */
async function purgeFile(userId: string, id: string): Promise<boolean> {
  const file = await prisma.file.findFirst({ where: { id, userId, deletedAt: { not: null } } });
  if (!file) return false;
  await removeObject(file.objectName);
  await prisma.file.delete({ where: { id } });
  return true;
}

async function purgeFolder(userId: string, id: string): Promise<boolean> {
  const folder = await prisma.folder.findFirst({ where: { id, userId, deletedAt: { not: null } } });
  if (!folder) return false;
  const folders = await prisma.folder.findMany({
    where: { userId },
    select: { id: true, objectName: true, parentId: true },
  });
  const ids = treeIds(id, folders);
  const files = await prisma.file.findMany({
    where: { userId, folderId: { in: ids } },
    select: { id: true, objectName: true },
  });
  for (const file of files) {
    await removeObject(file.objectName);
    await prisma.file.delete({ where: { id: file.id } });
  }
  const inTree = new Set(ids);
  for (const member of folders.filter((candidate) => inTree.has(candidate.id))) {
    await removeObject(member.objectName);
  }
  await prisma.folder.delete({ where: { id } });
  return true;
}

/** Deletes an item for good; false when the caller has no such item in the trash. */
export function purgeItem(userId: string, kind: TrashKind, id: string): Promise<boolean> {
  return kind === "file" ? purgeFile(userId, id) : purgeFolder(userId, id);
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
