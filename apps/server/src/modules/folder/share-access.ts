export function isFolderIncludedInShare(
  folderId: string,
  sharedRootIds: Set<string>,
  parents: Map<string, string | null>
): boolean {
  const visited = new Set<string>();
  let currentId: string | null = folderId;

  while (currentId && !visited.has(currentId)) {
    if (sharedRootIds.has(currentId)) return true;
    visited.add(currentId);
    currentId = parents.get(currentId) ?? null;
  }

  return false;
}
