"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

interface WithId {
  id: string;
}

/** Checkbox selection over the files and folders currently on screen. */
export function useItemSelection<F extends WithId, D extends WithId>(
  files: F[],
  folders: D[],
  setClearSelectionCallback?: (callback: () => void) => void
) {
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [selectedFolders, setSelectedFolders] = useState<Set<string>>(new Set());

  const fileIds = files.map((f) => f.id).join(",");
  const folderIds = folders.map((f) => f.id).join(",");

  useEffect(() => setSelectedFiles(new Set()), [fileIds]);
  useEffect(() => setSelectedFolders(new Set()), [folderIds]);

  const clear = useCallback(() => {
    setSelectedFiles(new Set());
    setSelectedFolders(new Set());
  }, []);

  useEffect(() => {
    setClearSelectionCallback?.(clear);
  }, [setClearSelectionCallback, clear]);

  const toggle = (setter: typeof setSelectedFiles) => (id: string, checked: boolean) =>
    setter((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });

  const total = files.length + folders.length;
  const count = selectedFiles.size + selectedFolders.size;

  const selectAll = (checked: boolean) => {
    setSelectedFiles(checked ? new Set(files.map((f) => f.id)) : new Set());
    setSelectedFolders(checked ? new Set(folders.map((f) => f.id)) : new Set());
  };

  const selected = useMemo(
    () => ({
      files: files.filter((f) => selectedFiles.has(f.id)),
      folders: folders.filter((f) => selectedFolders.has(f.id)),
    }),
    [files, folders, selectedFiles, selectedFolders]
  );

  return {
    selectedFiles,
    selectedFolders,
    toggleFile: toggle(setSelectedFiles),
    toggleFolder: toggle(setSelectedFolders),
    selectAll,
    clear,
    count,
    isAllSelected: total > 0 && count === total,
    isSomeSelected: count > 0 && count < total,
    selected,
  };
}
