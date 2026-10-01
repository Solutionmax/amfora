"use client";

import { useEffect, useState, type ReactNode } from "react";
import { IconFolderOpen, IconLayoutGrid, IconList, IconSearch, IconUpload } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { InlineError } from "@/components/files/inline-error";
import { FilesGridSkeleton, FilesTableSkeleton } from "@/components/skeletons";
import { FilesGrid } from "@/components/tables/files-grid";
import { FilesTable } from "@/components/tables/files-table";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

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

interface FilesViewManagerProps {
  files: File[];
  folders?: Folder[];
  searchQuery: string;
  onSearch: (query: string) => void;
  onNavigateToFolder?: (folderId: string) => void;
  onDownload: (objectName: string, fileName: string) => void;
  breadcrumbs?: ReactNode;
  isLoading?: boolean;
  loadError?: string | null;
  onRetry?: () => void;
  /** True inside a folder: the empty state then talks about this folder. */
  isInFolder?: boolean;
  onCreateFolder?: () => void;
  onUpload?: () => void;
  onDeleteFolder?: (folder: Folder) => void;
  onImmediateUpdate?: (itemId: string, itemType: "file" | "folder", newParentId: string | null) => void;
  onRefresh?: () => Promise<void>;
  onRenameFolder?: (folder: Folder) => void;
  onMoveFolder?: (folder: Folder) => void;
  onMoveFile?: (file: File) => void;
  onShareFolder?: (folder: Folder) => void;
  onDownloadFolder?: (folderId: string, folderName: string) => Promise<void>;
  onPreview?: (file: File) => void;
  onRename?: (file: File) => void;
  onShare?: (file: File) => void;
  onDelete?: (file: File) => void;
  onBulkDelete?: (files: File[], folders: Folder[]) => void;
  onBulkShare?: (files: File[], folders: Folder[]) => void;
  onBulkDownload?: (files: File[], folders: Folder[]) => void;
  onBulkMove?: (files: File[], folders: Folder[]) => void;
  setClearSelectionCallback?: (callback: () => void) => void;
}

export type ViewMode = "table" | "grid";

const VIEW_MODE_KEY = "files-view-mode";

function readViewMode(): ViewMode {
  try {
    return localStorage.getItem(VIEW_MODE_KEY) === "grid" ? "grid" : "table";
  } catch {
    return "table";
  }
}

/** Toolbar (location, search, list/grid) plus the list itself and its loading, error and empty states. */
export function FilesViewManager({
  files,
  folders = [],
  searchQuery,
  onSearch,
  breadcrumbs,
  isLoading = false,
  loadError,
  onRetry,
  isInFolder = false,
  onUpload,
  onCreateFolder,
  ...itemProps
}: FilesViewManagerProps) {
  const t = useTranslations();
  const [viewMode, setViewMode] = useState<ViewMode>("table");

  useEffect(() => setViewMode(readViewMode()), []);

  const changeViewMode = (mode: ViewMode) => {
    setViewMode(mode);
    try {
      localStorage.setItem(VIEW_MODE_KEY, mode);
    } catch {
      // Storage can be blocked; the choice then lasts for this visit only.
    }
  };

  const hasContent = folders.length > 0 || files.length > 0;
  const listProps = { files, folders, onUpload, onCreateFolder, ...itemProps };

  const renderBody = () => {
    if (isLoading) return viewMode === "table" ? <FilesTableSkeleton /> : <FilesGridSkeleton />;
    if (loadError && !hasContent) return <InlineError message={loadError} onRetry={onRetry} />;
    if (!hasContent && searchQuery) {
      return (
        <EmptyState
          icon={<IconSearch />}
          title={t("searchBar.noResults", { query: searchQuery })}
          description={t("files.calm.noResultsHint")}
          action={
            <Button variant="outline" onClick={() => onSearch("")}>
              {t("files.calm.clearSearch")}
            </Button>
          }
        />
      );
    }
    if (!hasContent) {
      return (
        <EmptyState
          icon={<IconFolderOpen />}
          title={isInFolder ? t("files.calm.emptyFolder") : t("files.empty.title")}
          description={isInFolder ? t("files.calm.emptyFolderHint") : t("files.empty.description")}
          action={
            onUpload && (
              <Button onClick={onUpload}>
                <IconUpload />
                {t("recentFiles.upload")}
              </Button>
            )
          }
        />
      );
    }

    return (
      <>
        {loadError && <InlineError message={loadError} onRetry={onRetry} className="mb-4" />}
        {viewMode === "table" ? <FilesTable {...listProps} /> : <FilesGrid {...listProps} />}
      </>
    );
  };

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-3 pb-1">
        <div className="min-w-0 flex-1">{breadcrumbs}</div>

        <div className="flex w-full items-center gap-2 sm:w-auto">
          <div className="relative min-w-0 flex-1 sm:w-[260px] sm:flex-none">
            <IconSearch
              size={17}
              stroke={1.8}
              aria-hidden
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-icon"
            />
            <Input
              type="search"
              aria-label={t("searchBar.placeholder")}
              placeholder={t("files.calm.searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => onSearch(e.target.value)}
              className="h-9 pl-9"
            />
          </div>

          <div
            role="group"
            aria-label={t("files.viewMode.label")}
            className="flex shrink-0 items-center rounded-[var(--radius)] border border-line-2 p-0.5"
          >
            {(
              [
                ["table", IconList, t("files.calm.listView")],
                ["grid", IconLayoutGrid, t("files.viewMode.grid")],
              ] as const
            ).map(([mode, Icon, label]) => (
              <button
                key={mode}
                type="button"
                aria-label={label}
                aria-pressed={viewMode === mode}
                onClick={() => changeViewMode(mode)}
                className={cn(
                  "grid size-7 cursor-pointer place-items-center rounded-[calc(var(--radius)-3px)] text-ink-icon outline-none transition-colors hover:text-ink focus-visible:ring-[3px] focus-visible:ring-primary/35",
                  viewMode === mode && "bg-surface-2 text-ink"
                )}
              >
                <Icon size={16} stroke={1.8} />
              </button>
            ))}
          </div>
        </div>
      </div>

      {renderBody()}
    </div>
  );
}
