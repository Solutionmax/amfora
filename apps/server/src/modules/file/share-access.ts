export type FolderParent = { id: string; parentId: string | null };

/**
 * Returns a folder and all of its ancestors, stopping safely on missing or
 * cyclic metadata. The caller must provide an owner-scoped folder list.
 */
export function folderAndAncestorIds(folderId: string | null, folders: FolderParent[]): string[] {
  if (!folderId) return [];

  const parentById = new Map(folders.map((folder) => [folder.id, folder.parentId]));
  const ids: string[] = [];
  const visited = new Set<string>();
  let current: string | null = folderId;

  while (current && !visited.has(current)) {
    visited.add(current);
    if (!parentById.has(current)) break;
    ids.push(current);
    current = parentById.get(current) ?? null;
  }

  return ids;
}
