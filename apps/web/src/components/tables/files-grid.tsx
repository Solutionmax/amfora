"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { IconCloudUpload, IconFolderPlus } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { FileTypeIcon, FolderIcon } from "@/components/files/file-type-icon";
import {
  fileMenuEntries,
  folderMenuEntries,
  ItemContextMenuContent,
  ItemMenu,
  type MenuEntry,
} from "@/components/files/item-menu";
import { SelectionBar } from "@/components/files/selection-bar";
import { useAddedLabel } from "@/components/files/use-added-label";
import { useItemSelection } from "@/components/files/use-item-selection";
import { Checkbox } from "@/components/ui/checkbox";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu";
import { useDragDrop } from "@/hooks/use-drag-drop";
import { getCachedDownloadUrl } from "@/lib/download-url-cache";
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

interface FilesGridProps {
  files: File[];
  folders?: Folder[];
  onPreview?: (file: File) => void;
  onRename?: (file: File) => void;
  onCreateFolder?: () => void;
  onUpload?: () => void;
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
  onRefresh?: () => Promise<void>;
  onImmediateUpdate?: (itemId: string, itemType: "file" | "folder", newParentId: string | null) => void;
  showBulkActions?: boolean;
  isShareMode?: boolean;
}

const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
const isImageFile = (fileName: string) => IMAGE_EXTENSIONS.some((ext) => fileName.toLowerCase().endsWith(ext));

/** Loads thumbnail URLs for image files, once per file. */
function useImageThumbnails(files: File[]) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const requested = useRef<Set<string>>(new Set());

  useEffect(() => {
    let isMounted = true;
    const pending = files.filter((file) => isImageFile(file.name) && !requested.current.has(file.id));

    pending.forEach((file) => {
      requested.current.add(file.id);
      getCachedDownloadUrl(file.objectName)
        .then((url) => {
          if (isMounted) setUrls((prev) => ({ ...prev, [file.id]: url }));
        })
        .catch((error) => {
          requested.current.delete(file.id);
          console.error(`Failed to load preview for ${file.name}:`, error);
        });
    });

    return () => {
      isMounted = false;
    };
  }, [files]);

  return urls;
}

const CARD =
  "group relative flex cursor-pointer flex-col gap-3 rounded-xl border border-line bg-surface p-3 outline-none transition-colors hover:border-line-2 hover:bg-surface-2 focus-visible:ring-[3px] focus-visible:ring-primary/35";

/** Quiet grid: thin borders, grey icons, image thumbnails on a neutral ground. */
export function FilesGrid({
  files,
  folders = [],
  onPreview,
  onRename,
  onCreateFolder,
  onUpload,
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
  onRefresh,
  onImmediateUpdate,
  showBulkActions = true,
  isShareMode = false,
}: FilesGridProps) {
  const t = useTranslations();
  const added = useAddedLabel();
  const selection = useItemSelection(files, folders, setClearSelectionCallback);
  const thumbnails = useImageThumbnails(files);

  const dnd = useDragDrop({
    onRefresh,
    onImmediateUpdate,
    selectedFiles: selection.selectedFiles,
    selectedFolders: selection.selectedFolders,
    files,
    folders,
  });
  const draggedIds = useMemo(() => new Set(dnd.draggedItems.map((item) => item.id)), [dnd.draggedItems]);
  const canDrag = !isShareMode;

  const fileHandlers = isShareMode
    ? { onDownload }
    : { onPreview, onRename, onMoveFile, onDownload, onShare, onDelete };
  const folderHandlers = isShareMode
    ? { onNavigateToFolder, onDownloadFolder }
    : { onNavigateToFolder, onRenameFolder, onMoveFolder, onDownloadFolder, onShareFolder, onDeleteFolder };

  const bulk = (action?: (files: File[], folders: Folder[]) => void) =>
    action ? () => action(selection.selected.files, selection.selected.folders) : undefined;

  const onKeyOpen = (action: () => void) => (e: React.KeyboardEvent) => {
    if (e.target !== e.currentTarget) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      action();
    }
  };

  const renderCard = ({
    key,
    entries,
    label,
    isSelected,
    onSelectChange,
    children,
    ...rest
  }: {
    key: string;
    entries: MenuEntry[];
    label: string;
    isSelected: boolean;
    onSelectChange: (checked: boolean) => void;
    children: React.ReactNode;
  } & React.HTMLAttributes<HTMLDivElement>) => (
    <ContextMenu key={key} modal={false}>
      <ContextMenuTrigger asChild>
        <div
          role="button"
          tabIndex={0}
          aria-label={label}
          {...rest}
          className={cn(CARD, isSelected && "border-primary/40 bg-primary-soft hover:bg-primary-soft", rest.className)}
          onContextMenu={(e) => e.stopPropagation()}
        >
          {showBulkActions && (
            <div
              className={cn(
                "absolute left-2.5 top-2.5 z-10 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100",
                isSelected && "sm:opacity-100"
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <Checkbox
                checked={isSelected}
                onCheckedChange={(checked) => onSelectChange(checked === true)}
                aria-label={t("files.calm.selectItem", { name: label })}
              />
            </div>
          )}
          <div className="absolute right-1.5 top-1.5 z-10 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 sm:has-[[aria-expanded=true]]:opacity-100">
            <ItemMenu entries={entries} label={t("files.calm.moreActions", { name: label })} />
          </div>
          {children}
        </div>
      </ContextMenuTrigger>
      <ItemContextMenuContent entries={entries} />
    </ContextMenu>
  );

  return (
    <>
      {showBulkActions && (
        <label className="mb-3 flex w-fit cursor-pointer items-center gap-2.5 px-0.5 text-[13px] text-ink-3">
          <Checkbox
            checked={selection.isAllSelected}
            onCheckedChange={(checked) => selection.selectAll(checked === true)}
          />
          {t("filesTable.selectAll")}
        </label>
      )}

      <ContextMenu modal={false}>
        <ContextMenuTrigger asChild>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {folders.map((folder) => {
              const target = { id: folder.id, type: "folder" as const, name: folder.name };
              const isDropTarget = dnd.dragOverTarget?.id === folder.id && !draggedIds.has(folder.id);
              const count = (folder._count?.files ?? 0) + (folder._count?.children ?? 0);
              const open = () => onNavigateToFolder?.(folder.id);

              return renderCard({
                key: `folder-${folder.id}`,
                entries: folderMenuEntries(folder, folderHandlers, t),
                label: folder.name,
                isSelected: selection.selectedFolders.has(folder.id),
                onSelectChange: (checked) => selection.toggleFolder(folder.id, checked),
                className: cn(
                  isDropTarget && "border-primary bg-primary-soft",
                  draggedIds.has(folder.id) && "opacity-50"
                ),
                onClick: open,
                onKeyDown: onKeyOpen(open),
                draggable: canDrag,
                onDragStart: canDrag ? (e) => dnd.handleDragStart(e, target) : undefined,
                onDragEnd: canDrag ? dnd.handleDragEnd : undefined,
                onDragOver: canDrag ? (e) => dnd.handleDragOver(e, target) : undefined,
                onDragLeave: canDrag ? dnd.handleDragLeave : undefined,
                onDrop: canDrag ? (e) => dnd.handleDrop(e, target) : undefined,
                children: (
                  <>
                    <div className="grid aspect-[4/3] place-items-center rounded-lg bg-surface-2">
                      <FolderIcon size={30} />
                    </div>
                    <div className="min-w-0 px-0.5">
                      <p className="truncate text-[13.5px] font-semibold" title={folder.name}>
                        {folder.name}
                      </p>
                      <p className="truncate text-[12.5px] text-ink-3">
                        {t("files.calm.folderItems", { count })}
                        {folder.totalSize ? ` · ${formatFileSize(Number(folder.totalSize))}` : ""}
                      </p>
                    </div>
                  </>
                ),
              });
            })}

            {files.map((file) => {
              const thumbnail = thumbnails[file.id];
              const open = () => onPreview?.(file);

              return renderCard({
                key: file.id,
                entries: fileMenuEntries(file, fileHandlers, t),
                label: file.name,
                isSelected: selection.selectedFiles.has(file.id),
                onSelectChange: (checked) => selection.toggleFile(file.id, checked),
                className: cn(draggedIds.has(file.id) && "opacity-50"),
                onClick: open,
                onKeyDown: onKeyOpen(open),
                draggable: canDrag,
                onDragStart: canDrag
                  ? (e) => dnd.handleDragStart(e, { id: file.id, type: "file", name: file.name })
                  : undefined,
                onDragEnd: canDrag ? dnd.handleDragEnd : undefined,
                children: (
                  <>
                    <div className="grid aspect-[4/3] place-items-center overflow-hidden rounded-lg bg-surface-2">
                      {thumbnail ? (
                        <img src={thumbnail} alt="" className="size-full object-cover" draggable={false} />
                      ) : (
                        <FileTypeIcon name={file.name} size={30} />
                      )}
                    </div>
                    <div className="min-w-0 px-0.5">
                      <p className="truncate text-[13.5px] font-semibold" title={file.name}>
                        {file.name}
                      </p>
                      <p className="truncate text-[12.5px] text-ink-3">
                        {formatFileSize(Number(file.size))} · {added(file.createdAt)}
                      </p>
                    </div>
                  </>
                ),
              });
            })}
          </div>
        </ContextMenuTrigger>
        {!isShareMode && (onCreateFolder || onUpload) && (
          <ContextMenuContent className="w-[200px]">
            {onCreateFolder && (
              <ContextMenuItem onClick={onCreateFolder}>
                <IconFolderPlus />
                {t("contextMenu.newFolder")}
              </ContextMenuItem>
            )}
            {onUpload && (
              <ContextMenuItem onClick={onUpload}>
                <IconCloudUpload />
                {t("contextMenu.uploadFile")}
              </ContextMenuItem>
            )}
          </ContextMenuContent>
        )}
      </ContextMenu>

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
