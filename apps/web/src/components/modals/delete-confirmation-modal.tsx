"use client";

import { IconFolder } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getFileIcon } from "@/utils/file-icons";

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  files?: string[];
  folders?: string[];
  itemType?: "files" | "shares" | "mixed";
}

export function DeleteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  files = [],
  folders = [],
  itemType,
}: DeleteConfirmationModalProps) {
  const t = useTranslations();

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  const listLabel =
    itemType === "shares"
      ? t("deleteConfirmation.sharesToDelete")
      : folders.length > 0 && files.length > 0
        ? t("deleteConfirmation.itemsToDelete")
        : folders.length > 0
          ? t("deleteConfirmation.foldersToDelete")
          : t("deleteConfirmation.filesToDelete");

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {(files.length > 0 || folders.length > 0) && (
          <div className="min-w-0">
            <p className="text-[12.5px] font-semibold text-ink-3">{listLabel}</p>
            <ul className="mt-1 max-h-48 overflow-y-auto border-y border-line [&>li+li]:border-t [&>li+li]:border-line">
              {folders.map((folderName, index) => (
                <li key={`folder-${index}`} className="flex min-w-0 items-center gap-3 py-2.5 text-[13.5px]">
                  <IconFolder stroke={1.8} className="size-[17px] shrink-0 text-ink-icon" />
                  <span className="truncate" title={folderName}>
                    {folderName}
                  </span>
                </li>
              ))}
              {files.map((fileName, index) => {
                const { icon: FileIcon } = getFileIcon(fileName);
                return (
                  <li key={`file-${index}`} className="flex min-w-0 items-center gap-3 py-2.5 text-[13.5px]">
                    <FileIcon stroke={1.8} className="size-[17px] shrink-0 text-ink-icon" />
                    <span className="truncate" title={fileName}>
                      {fileName}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button variant="destructive" onClick={handleConfirm}>
            {t("common.delete")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
