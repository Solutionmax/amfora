"use client";

import { useState } from "react";
import { IconDotsVertical, IconDownload, IconEye, IconFolderShare, IconInbox, IconTrash } from "@tabler/icons-react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";

import { isScanBlocked, ScanLine } from "@/components/files/scan-status";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LineList, LineRow } from "@/components/ui/line-list";
import { copyReverseShareFileToUserFiles, deleteReverseShareFile } from "@/http/endpoints/reverse-shares";
import type { ReverseShareFile } from "@/http/endpoints/reverse-shares/types";
import { formatFileSize } from "@/utils/format-file-size";
import { formatDayTime } from "../lib/receive-format";
import { copyErrorMessage, downloadReceivedFile, senderName } from "../lib/received-file-actions";
import { ConfirmDialog } from "./confirm-dialog";
import { FileKindIcon } from "./file-kind-icon";
import { ReverseShareFilePreviewModal } from "./reverse-share-file-preview-modal";

interface ReceivedFilesSectionProps {
  files: ReverseShareFile[];
  onFileDeleted?: () => void;
}

/** What came in through a receive link, newest first, as hairline rows. */
export function ReceivedFilesSection({ files, onFileDeleted }: ReceivedFilesSectionProps) {
  const t = useTranslations();
  const locale = useLocale();
  const [previewFile, setPreviewFile] = useState<ReverseShareFile | null>(null);
  const [fileToDelete, setFileToDelete] = useState<ReverseShareFile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDownload = async (file: ReverseShareFile) => {
    try {
      await downloadReceivedFile(file);
    } catch (error) {
      console.error("Download error:", error);
      toast.error(t("reverseShares.modals.details.downloadError"));
    }
  };

  const handleCopy = (file: ReverseShareFile) => {
    toast.promise(copyReverseShareFileToUserFiles(file.id), {
      loading: t("reverseShares.components.fileActions.copying"),
      success: t("reverseShares.modals.receivedFiles.copySuccess"),
      error: (error: unknown) => copyErrorMessage(error, t),
    });
  };

  const confirmDelete = async () => {
    if (!fileToDelete) return;
    setIsDeleting(true);
    try {
      await deleteReverseShareFile(fileToDelete.id);
      toast.success(t("reverseShares.modals.receivedFiles.deleteSuccess"));
      setFileToDelete(null);
      onFileDeleted?.();
    } catch (error) {
      console.error("Error deleting file:", error);
      toast.error(t("reverseShares.modals.receivedFiles.deleteError"));
    } finally {
      setIsDeleting(false);
    }
  };

  if (!files.length) {
    return (
      <div className="flex flex-col items-center gap-2.5 py-10 text-center text-[13px] text-ink-3">
        <IconInbox className="size-[26px] text-ink-icon" stroke={1.6} aria-hidden="true" />
        <p>{t("reverseShares.calm.nothingYet")}</p>
      </div>
    );
  }

  const sorted = [...files].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <>
      <LineList>
        {sorted.map((file) => {
          const size = formatFileSize(Number(file.size || 0));
          const sender = senderName(file) ?? t("reverseShares.components.fileRow.anonymous");
          const fullSender = [file.uploaderName, file.uploaderEmail].filter(Boolean).join(" · ");
          const isBlocked = isScanBlocked(file);
          return (
            <LineRow
              key={file.id}
              icon={<FileKindIcon name={file.name} />}
              title={<span title={file.name}>{file.name}</span>}
              sub={
                <>
                  <span className="block truncate" title={fullSender || undefined}>
                    <span className="sm:hidden">{size} · </span>
                    {sender} · {formatDayTime(file.createdAt, locale)}
                  </span>
                  <ScanLine file={file} />
                </>
              }
            >
              <span className="mr-1.5 hidden text-[13px] tabular-nums text-ink-2 sm:inline">{size}</span>
              {!isBlocked && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="max-sm:hidden"
                    onClick={() => setPreviewFile(file)}
                    aria-label={t("reverseShares.components.fileActions.preview")}
                  >
                    <IconEye />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="max-sm:hidden"
                    onClick={() => handleDownload(file)}
                    aria-label={t("reverseShares.components.fileActions.download")}
                  >
                    <IconDownload />
                  </Button>
                </>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t("reverseShares.calm.moreActionsFor", { name: file.name })}
                  >
                    <IconDotsVertical />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[210px]">
                  {!isBlocked && (
                    <>
                      <DropdownMenuItem className="sm:hidden" onClick={() => setPreviewFile(file)}>
                        <IconEye />
                        {t("reverseShares.components.fileActions.preview")}
                      </DropdownMenuItem>
                      <DropdownMenuItem className="sm:hidden" onClick={() => handleDownload(file)}>
                        <IconDownload />
                        {t("reverseShares.components.fileActions.download")}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleCopy(file)}>
                        <IconFolderShare />
                        {t("reverseShares.calm.copyToMyFiles")}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  <DropdownMenuItem variant="destructive" onClick={() => setFileToDelete(file)}>
                    <IconTrash />
                    {t("reverseShares.components.fileActions.delete")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </LineRow>
          );
        })}
      </LineList>

      <ConfirmDialog
        open={!!fileToDelete}
        title={t("reverseShares.calm.deleteFileTitle", { name: fileToDelete?.name ?? "" })}
        description={t("reverseShares.calm.deleteFileText")}
        confirmLabel={t("reverseShares.components.fileActions.delete")}
        busyLabel={t("common.deleting")}
        busy={isDeleting}
        onConfirm={confirmDelete}
        onClose={() => setFileToDelete(null)}
      />

      {previewFile && (
        <ReverseShareFilePreviewModal isOpen={!!previewFile} onClose={() => setPreviewFile(null)} file={previewFile} />
      )}
    </>
  );
}
