"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { IconCheck, IconFolder, IconHome, IconSearch } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { InlineError } from "@/components/files/inline-error";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { flattenFolders, type PickerFolder } from "./move-folders";

interface MoveItemsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMove: (targetFolderId: string | null) => Promise<void>;
  itemsToMove: { files: any[]; folders: any[] } | null;
  title?: string;
  description?: string;
  getAllFolders: () => Promise<any[]>;
  currentFolderId?: string | null;
}

const ROOT = "root";

export function MoveItemsModal({
  isOpen,
  onClose,
  onMove,
  itemsToMove,
  title,
  description,
  getAllFolders,
  currentFolderId = null,
}: MoveItemsModalProps) {
  const t = useTranslations();
  const [folders, setFolders] = useState<PickerFolder[]>([]);
  const [target, setTarget] = useState<string>(ROOT);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const loadFolders = useCallback(async () => {
    try {
      setIsLoading(true);
      setLoadError(false);
      const data = await getAllFolders();
      const excluded = new Set<string>(itemsToMove?.folders.map((f) => f.id) || []);
      setFolders(flattenFolders(data, excluded));
    } catch (error) {
      console.error("Error loading folders:", error);
      setLoadError(true);
    } finally {
      setIsLoading(false);
    }
  }, [getAllFolders, itemsToMove]);

  useEffect(() => {
    if (!isOpen) return;
    loadFolders();
    setTarget(currentFolderId || ROOT);
    setSearchQuery("");
    // Only when the dialog opens; getAllFolders is often an inline function.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const visible = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return folders;
    return folders.filter((f) => f.name.toLowerCase().includes(query));
  }, [folders, searchQuery]);

  const names = [...(itemsToMove?.folders || []), ...(itemsToMove?.files || [])].map((item) => item.name as string);
  const itemCount = names.length;
  const targetName = target === ROOT ? t("files.pageTitle") : folders.find((f) => f.id === target)?.name;
  const isSameFolder = (target === ROOT ? null : target) === currentFolderId;

  const handleMove = async () => {
    try {
      setIsMoving(true);
      await onMove(target === ROOT ? null : target);
      onClose();
    } catch (error) {
      console.error("Error moving items:", error);
    } finally {
      setIsMoving(false);
    }
  };

  const handleClose = () => {
    if (!isMoving) onClose();
  };

  const option = (id: string, label: string, depth: number, icon: React.ReactNode, hint?: string) => {
    const isSelected = target === id;
    return (
      <button
        key={id}
        type="button"
        role="radio"
        aria-checked={isSelected}
        onClick={() => setTarget(id)}
        className={cn(
          "flex w-full cursor-pointer items-center gap-3 border-b border-line py-2.5 pr-2 text-left outline-none transition-colors hover:bg-surface-2 focus-visible:bg-surface-2",
          isSelected && "bg-primary-soft hover:bg-primary-soft"
        )}
        style={{ paddingLeft: `${8 + depth * 20}px` }}
      >
        {icon}
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{label}</span>
          {hint && <span className="block truncate text-[12px] text-ink-3">{hint}</span>}
        </span>
        {isSelected && <IconCheck size={16} aria-hidden className="shrink-0 text-primary" />}
      </button>
    );
  };

  const folderIcon = (id: string) => (
    <IconFolder
      size={17}
      stroke={1.8}
      aria-hidden
      className={cn("shrink-0", target === id ? "text-primary" : "text-ink-icon")}
    />
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{title || t("moveItems.title", { count: itemCount })}</DialogTitle>
          <DialogDescription className="truncate">
            {description ||
              (itemCount === 1
                ? t("files.calm.moveOne", { name: names[0] })
                : t("files.calm.moveMany", { count: itemCount }))}
          </DialogDescription>
        </DialogHeader>

        <div className="grid min-w-0 gap-3">
          <div className="relative">
            <IconSearch
              size={17}
              stroke={1.8}
              aria-hidden
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-icon"
            />
            <Input
              type="search"
              aria-label={t("searchBar.placeholderFolders")}
              placeholder={t("searchBar.placeholderFolders")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <div
            role="radiogroup"
            aria-label={t("folderActions.selectDestination")}
            className="max-h-[300px] overflow-y-auto border-t border-line"
          >
            {isLoading ? (
              Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="flex items-center gap-3 border-b border-line py-3 pl-2">
                  <Skeleton className="size-4" />
                  <Skeleton className="h-3.5 w-40" />
                </div>
              ))
            ) : loadError ? (
              <InlineError message={t("files.calm.foldersLoadError")} onRetry={loadFolders} className="border-t-0" />
            ) : (
              <>
                {!searchQuery.trim() &&
                  option(
                    ROOT,
                    t("files.pageTitle"),
                    0,
                    <IconHome
                      size={17}
                      stroke={1.8}
                      aria-hidden
                      className={cn("shrink-0", target === ROOT ? "text-primary" : "text-ink-icon")}
                    />
                  )}
                {visible.map((folder) =>
                  option(
                    folder.id,
                    folder.name,
                    searchQuery.trim() ? 0 : folder.depth + 1,
                    folderIcon(folder.id),
                    searchQuery.trim() ? folder.path : undefined
                  )
                )}
                {searchQuery.trim() && visible.length === 0 && (
                  <p className="py-6 text-center text-[13px] text-ink-3">
                    {t("searchBar.noResults", { query: searchQuery.trim() })}
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        <DialogFooter className="sm:items-center">
          <span className="mr-auto hidden min-w-0 truncate text-[12.5px] text-ink-3 sm:block">
            {isSameFolder ? t("files.calm.alreadyHere") : t("files.calm.moveTo", { name: targetName ?? "" })}
          </span>
          <Button variant="ghost" onClick={handleClose} disabled={isMoving}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleMove} disabled={isLoading || isMoving || isSameFolder || itemCount === 0}>
            {isMoving ? t("files.calm.moving") : t("files.calm.moveHere")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
