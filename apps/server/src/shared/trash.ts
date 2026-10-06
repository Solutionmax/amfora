import { prisma } from "./prisma";

/**
 * The filter for everything that is not in the trash. Every query that shows, serves, counts for a
 * name or adds up files or folders of the workspace uses it; only the trash itself and the figures
 * for the storage limit look at deleted items too.
 */
export const notDeleted = { deletedAt: null } as const;

/** The counts a folder shows for what is in it: the workspace only, never the trash. */
export const liveFolderCounts = {
  select: { files: { where: notDeleted }, children: { where: notDeleted } },
} as const;

/** `in:` lists stay well under SQLite's limit on parameters per query, also next to a `not` filter. */
export const IN_CHUNK = 500;
export function chunked<T>(list: ReadonlyArray<T>, size = IN_CHUNK): T[][] {
  const parts: T[][] = [];
  for (let index = 0; index < list.length; index += size) parts.push(list.slice(index, index + size));
  return parts;
}

const MAX_DEPTH = 10000;

/**
 * A folder the user may put things into: it is theirs and neither it nor ANY folder above it is
 * in the trash. Null otherwise.
 */
export async function liveFolderOf(userId: string, folderId: string): Promise<{ id: string } | null> {
  let current: string | null = folderId;
  for (let steps = 0; current && steps < MAX_DEPTH; steps++) {
    const folder: { id: string; parentId: string | null; deletedAt: Date | null } | null =
      await prisma.folder.findFirst({
        where: { id: current, userId },
        select: { id: true, parentId: true, deletedAt: true },
      });
    if (!folder || folder.deletedAt) return null;
    current = folder.parentId;
  }
  return current ? null : { id: folderId };
}
