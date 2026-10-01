export interface PickerFolder {
  id: string;
  name: string;
  parentId: string | null;
  depth: number;
  path: string;
}

/** Folders in tree order with their depth, leaving out the moved folders and everything below them. */
export function flattenFolders(
  folders: { id: string; name: string; parentId?: string | null }[],
  excluded: Set<string>
): PickerFolder[] {
  const byParent = new Map<string | null, typeof folders>();
  folders.forEach((folder) => {
    const key = folder.parentId || null;
    byParent.set(key, [...(byParent.get(key) || []), folder]);
  });

  const out: PickerFolder[] = [];
  const walk = (parentId: string | null, depth: number, path: string) => {
    const children = [...(byParent.get(parentId) || [])].sort((a, b) => a.name.localeCompare(b.name));
    children.forEach((folder) => {
      if (excluded.has(folder.id)) return;
      const folderPath = path ? `${path} / ${folder.name}` : folder.name;
      out.push({ id: folder.id, name: folder.name, parentId, depth, path: folderPath });
      walk(folder.id, depth + 1, folderPath);
    });
  };
  walk(null, 0, "");
  return out;
}
