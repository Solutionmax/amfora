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
