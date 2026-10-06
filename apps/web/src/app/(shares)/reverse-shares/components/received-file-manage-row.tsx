"use client";

import {
  IconDotsVertical,
  IconDownload,
  IconEye,
  IconFolderShare,
  IconNote,
  IconPencil,
  IconTrash,
} from "@tabler/icons-react";
import { useLocale, useTranslations } from "next-intl";

import { isScanBlocked, ScanLine } from "@/components/files/scan-status";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ReverseShareFile } from "@/http/endpoints/reverse-shares/types";
import { formatFileSize } from "@/utils/format-file-size";
import { formatDayTime } from "../lib/receive-format";
import { senderName } from "../lib/received-file-actions";
import { FileKindIcon } from "./file-kind-icon";

export interface EditingField {
  fileId: string;
  field: "name" | "description";
  value: string;
}

/** One file in the manage dialog: checkbox, name, who and when, and a menu with everything else. */
export function ReceivedFileManageRow({
  file,
  checked,
  onCheckedChange,
  onPreview,
  onDownload,
  onCopy,
  onRename,
  onEditDescription,
  onDelete,
}: {
  file: ReverseShareFile;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  onPreview: () => void;
  onDownload: () => void;
  onCopy: () => void;
  onRename: () => void;
  onEditDescription: () => void;
  onDelete: () => void;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const sender = senderName(file) ?? t("reverseShares.components.fileRow.anonymous");
  const fullSender = [file.uploaderName, file.uploaderEmail].filter(Boolean).join(" · ");
  const isBlocked = isScanBlocked(file);

  return (
    <div className="group flex items-center gap-3 py-3">
      <Checkbox
        checked={checked}
        onCheckedChange={(value) => onCheckedChange(value === true)}
        aria-label={t("reverseShares.modals.receivedFiles.selectFile", { fileName: file.name })}
      />
      <FileKindIcon name={file.name} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold" title={file.name}>
          {file.name}
        </p>
        <p className="truncate text-[12.5px] text-ink-3" title={fullSender || undefined}>
          {formatFileSize(Number(file.size || 0))} · {sender} · {formatDayTime(file.createdAt, locale)}
        </p>
        <ScanLine file={file} />
        {file.description && <p className="mt-0.5 truncate text-[12.5px] text-ink-2">{file.description}</p>}
      </div>
      {!isBlocked && (
        <Button
          variant="ghost"
          size="icon"
          className="max-sm:hidden sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
          onClick={onDownload}
          aria-label={t("reverseShares.components.fileActions.download")}
        >
          <IconDownload />
        </Button>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={t("reverseShares.calm.moreActionsFor", { name: file.name })}>
            <IconDotsVertical />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[210px]">
          {!isBlocked && (
            <>
              <DropdownMenuItem onClick={onPreview}>
                <IconEye />
                {t("reverseShares.components.fileActions.preview")}
              </DropdownMenuItem>
              <DropdownMenuItem className="sm:hidden" onClick={onDownload}>
                <IconDownload />
                {t("reverseShares.components.fileActions.download")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onCopy}>
                <IconFolderShare />
                {t("reverseShares.calm.copyToMyFiles")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onRename}>
                <IconPencil />
                {t("common.rename")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onEditDescription}>
                <IconNote />
                {t("reverseShares.calm.editDescription")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem variant="destructive" onClick={onDelete}>
            <IconTrash />
            {t("reverseShares.components.fileActions.delete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
