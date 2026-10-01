"use client";

import { useMemo } from "react";
import { IconDownload, IconShare } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { FileTypeIcon, FolderIcon } from "@/components/files/file-type-icon";
import { fileMenuEntries, folderMenuEntries, ItemMenu } from "@/components/files/item-menu";
import { SelectionBar } from "@/components/files/selection-bar";
import { useAddedLabel } from "@/components/files/use-added-label";
import { useItemSelection } from "@/components/files/use-item-selection";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDragDrop } from "@/hooks/use-drag-drop";
import { cn } from "@/lib/utils";
import { formatFileSize } from "@/utils/format-file-size";

interface File {
  id: string;
  name: string;
  description?: string;
  extension: string;
  size: number;
  objectName: string;
  downloads?: number;
  userId: string;
  folderId?: string;
  createdAt: string;
  updatedAt: string;
}

interface Folder {
  id: string;
  name: string;
  description?: string;
  objectName: string;
  parentId?: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  totalSize?: string;
  _count?: {
    files: number;
    children: number;
  };
}

interface FilesTableProps {
  files: File[];
  folders?: Folder[];
  onPreview?: (file: File) => void;
  onRename?: (file: File) => void;
  /** Kept for callers; names and descriptions are edited in the edit dialog. */
  onUpdateName?: (fileId: string, newName: string) => void;
  onUpdateDescription?: (fileId: string, newDescription: string) => void;
  onDownload: (objectName: string, fileName: string) => void;
  onShare?: (file: File) => void;
  onDelete?: (file: File) => void;
  onBulkDelete?: (files: File[], folders: Folder[]) => void;
  onBulkShare?: (files: File[], folders: Folder[]) => void;
  onBulkDownload?: (files: File[], folders: Folder[]) => void;
  onBulkMove?: (files: File[], folders: Folder[]) => void;
  setClearSelectionCallback?: (callback: () => void) => void;
  onNavigateToFolder?: (folderId: string) => void;
  onRenameFolder?: (folder: Folder) => void;
  onDeleteFolder?: (folder: Folder) => void;
  onShareFolder?: (folder: Folder) => void;
  onDownloadFolder?: (folderId: string, folderName: string) => Promise<void>;
  onMoveFolder?: (folder: Folder) => void;
  onMoveFile?: (file: File) => void;
  onUpdateFolderName?: (folderId: string, newName: string) => void;
  onUpdateFolderDescription?: (folderId: string, newDescription: string) => void;
  /** Enables dragging rows onto folder rows. */
  onImmediateUpdate?: (itemId: string, itemType: "file" | "folder", newParentId: string | null) => void;
  onRefresh?: () => Promise<void>;
  showBulkActions?: boolean;
  isShareMode?: boolean;
}

/** Row actions: hidden until hover or focus on desktop, always there on touch. */
const ROW_ACTIONS =
  "flex items-center justify-end gap-0.5 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 sm:has-[[aria-expanded=true]]:opacity-100";

const NAME_BUTTON =
  "block max-w-full cursor-pointer truncate text-left font-semibold outline-none hover:text-primary focus-visible:text-primary";

function isFromControl(target: EventTarget) {
  return !!(target as HTMLElement).closest("button, a, input, [role='checkbox'], [role='menuitem']");
}

/** Hairline file table: checkbox, grey type icon, name with muted meta, size, added, downloads, row actions. */
export function FilesTable({
  files,
  folders = [],
  onPreview,
  onRename,
  onDownload,
  onShare,
  onDelete,
  onBulkDelete,
  onBulkShare,
  onBulkDownload,
  onBulkMove,
  setClearSelectionCallback,
  onNavigateToFolder,
  onRenameFolder,
  onDeleteFolder,
  onShareFolder,
  onDownloadFolder,
  onMoveFolder,
  onMoveFile,
  onImmediateUpdate,
  onRefresh,
  showBulkActions = true,
  isShareMode = false,
}: FilesTableProps) {
  const t = useTranslations();
  const added = useAddedLabel();
  const selection = useItemSelection(files, folders, setClearSelectionCallback);
  const canDrag = !isShareMode && !!onImmediateUpdate;

  const dnd = useDragDrop({
    onRefresh,
    onImmediateUpdate,
    selectedFiles: selection.selectedFiles,
    selectedFolders: selection.selectedFolders,
    files,
    folders,
  });
  const draggedIds = useMemo(() => new Set(dnd.draggedItems.map((item) => item.id)), [dnd.draggedItems]);

  const fileHandlers = isShareMode
    ? { onDownload }
    : { onPreview, onRename, onMoveFile, onDownload, onShare, onDelete };
  const folderHandlers = isShareMode
    ? { onNavigateToFolder, onDownloadFolder }
    : { onNavigateToFolder, onRenameFolder, onMoveFolder, onDownloadFolder, onShareFolder, onDeleteFolder };

  const bulk = (action?: (files: File[], folders: Folder[]) => void) =>
    action ? () => action(selection.selected.files, selection.selected.folders) : undefined;

  const itemsMeta = (folder: Folder) =>
    t("files.calm.folderItems", { count: (folder._count?.files ?? 0) + (folder._count?.children ?? 0) });

  return (
    <>
      <Table aria-label={t("filesTable.ariaLabel")} className="table-fixed">
        <TableHeader className="max-sm:hidden">
          <TableRow className="hover:bg-transparent">
            {showBulkActions && (
              <TableHead className="w-10 pl-3 pr-0">
                <Checkbox
                  checked={selection.isAllSelected}
                  onCheckedChange={(checked) => selection.selectAll(checked === true)}
                  aria-label={t("filesTable.selectAll")}
                />
              </TableHead>
            )}
            <TableHead>{t("files.calm.columns.name")}</TableHead>
            <TableHead className="w-[100px]">{t("files.calm.columns.size")}</TableHead>
            <TableHead className="hidden w-[130px] md:table-cell">{t("files.calm.columns.added")}</TableHead>
            <TableHead className="hidden w-[120px] lg:table-cell">{t("files.calm.columns.downloads")}</TableHead>
            <TableHead className="w-[112px]">
              <span className="sr-only">{t("filesTable.columns.actions")}</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {folders.map((folder) => {
            const isSelected = selection.selectedFolders.has(folder.id);
            const target = { id: folder.id, type: "folder" as const, name: folder.name };
            const isDropTarget = dnd.dragOverTarget?.id === folder.id && !draggedIds.has(folder.id);
            const size = folder.totalSize ? formatFileSize(Number(folder.totalSize)) : "—";

            return (
              <TableRow
                key={folder.id}
                data-state={isSelected ? "selected" : undefined}
                className={cn(
                  "group cursor-pointer",
                  isDropTarget && "bg-primary-soft",
                  draggedIds.has(folder.id) && "opacity-50"
                )}
                onClick={(e) => !isFromControl(e.target) && onNavigateToFolder?.(folder.id)}
                draggable={canDrag}
                onDragStart={canDrag ? (e) => dnd.handleDragStart(e, target) : undefined}
                onDragEnd={canDrag ? dnd.handleDragEnd : undefined}
                onDragOver={canDrag ? (e) => dnd.handleDragOver(e, target) : undefined}
                onDragLeave={canDrag ? dnd.handleDragLeave : undefined}
                onDrop={canDrag ? (e) => dnd.handleDrop(e, target) : undefined}
              >
                {showBulkActions && (
                  <TableCell className="pl-3 pr-0 max-sm:hidden">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(checked) => selection.toggleFolder(folder.id, checked === true)}
                      aria-label={t("files.calm.selectItem", { name: folder.name })}
                    />
                  </TableCell>
                )}
                <TableCell className="max-sm:pl-1">
                  <div className="flex min-w-0 items-center gap-3.5">
                    <FolderIcon />
                    <div className="min-w-0">
                      <button
                        type="button"
                        className={NAME_BUTTON}
                        onClick={() => onNavigateToFolder?.(folder.id)}
                        title={folder.name}
                      >
                        {folder.name}
                      </button>
                      <p className="truncate text-[12.5px] text-ink-3 max-sm:hidden">
                        {folder.description || itemsMeta(folder)}
                      </p>
                      <p className="truncate text-[12.5px] text-ink-3 sm:hidden">
                        {itemsMeta(folder)} · {size}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-[13px] text-ink-2 max-sm:hidden">{size}</TableCell>
                <TableCell className="hidden text-[13px] text-ink-3 md:table-cell">{added(folder.createdAt)}</TableCell>
                <TableCell className="hidden text-[13px] text-ink-3 lg:table-cell">—</TableCell>
                <TableCell className="w-[112px] pr-2 max-sm:w-12 max-sm:px-0">
                  <div className={ROW_ACTIONS}>
                    <ItemMenu
                      entries={folderMenuEntries(folder, folderHandlers, t)}
                      label={t("files.calm.moreActions", { name: folder.name })}
                    />
                  </div>
                </TableCell>
              </TableRow>
            );
          })}

          {files.map((file) => {
            const isSelected = selection.selectedFiles.has(file.id);
            const item = { id: file.id, type: "file" as const, name: file.name };
            const size = formatFileSize(Number(file.size));

            return (
              <TableRow
                key={file.id}
                data-state={isSelected ? "selected" : undefined}
                className={cn("group", onPreview && "cursor-pointer", draggedIds.has(file.id) && "opacity-50")}
                onClick={(e) => !isFromControl(e.target) && onPreview?.(file)}
                draggable={canDrag}
                onDragStart={canDrag ? (e) => dnd.handleDragStart(e, item) : undefined}
                onDragEnd={canDrag ? dnd.handleDragEnd : undefined}
              >
                {showBulkActions && (
                  <TableCell className="pl-3 pr-0 max-sm:hidden">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(checked) => selection.toggleFile(file.id, checked === true)}
                      aria-label={t("filesTable.selectFile", { fileName: file.name })}
                    />
                  </TableCell>
                )}
                <TableCell className="max-sm:pl-1">
                  <div className="flex min-w-0 items-center gap-3.5">
                    <FileTypeIcon name={file.name} />
                    <div className="min-w-0">
                      {onPreview ? (
                        <button type="button" className={NAME_BUTTON} onClick={() => onPreview(file)} title={file.name}>
                          {file.name}
                        </button>
                      ) : (
                        <p className="truncate font-semibold" title={file.name}>
                          {file.name}
                        </p>
                      )}
                      {file.description && (
                        <p className="truncate text-[12.5px] text-ink-3 max-sm:hidden" title={file.description}>
                          {file.description}
                        </p>
                      )}
                      <p className="truncate text-[12.5px] text-ink-3 sm:hidden">
                        {size} · {added(file.createdAt)}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-[13px] text-ink-2 max-sm:hidden">{size}</TableCell>
                <TableCell className="hidden text-[13px] text-ink-3 md:table-cell">{added(file.createdAt)}</TableCell>
                <TableCell className="hidden text-[13px] text-ink-3 lg:table-cell">
                  {file.downloads ? t("files.calm.downloadsCount", { count: file.downloads }) : "—"}
                </TableCell>
                <TableCell className="w-[112px] pr-2 max-sm:w-12 max-sm:px-0">
                  <div className={ROW_ACTIONS}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="max-sm:hidden"
                      aria-label={t("files.calm.downloadItem", { name: file.name })}
                      onClick={() => onDownload(file.objectName, file.name)}
                    >
                      <IconDownload />
                    </Button>
                    {!isShareMode && onShare && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="max-sm:hidden"
                        aria-label={t("files.calm.shareItem", { name: file.name })}
                        onClick={() => onShare(file)}
                      >
                        <IconShare />
                      </Button>
                    )}
                    <ItemMenu
                      entries={fileMenuEntries(file, fileHandlers, t)}
                      label={t("files.calm.moreActions", { name: file.name })}
                    />
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {showBulkActions && (
        <SelectionBar
          count={selection.count}
          onShare={isShareMode ? undefined : bulk(onBulkShare)}
          onDownload={bulk(onBulkDownload)}
          onMove={isShareMode ? undefined : bulk(onBulkMove)}
          onDelete={isShareMode ? undefined : bulk(onBulkDelete)}
          onClear={selection.clear}
        />
      )}
    </>
  );
}
