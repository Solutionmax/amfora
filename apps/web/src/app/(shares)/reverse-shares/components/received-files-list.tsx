"use client";

import { useState } from "react";
import { IconDownload, IconEye, IconTrash } from "@tabler/icons-react";
import { format } from "date-fns";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { kindFromName } from "@/components/brand/file-kind";
import { FileManifest, type ManifestItem } from "@/components/brand/file-manifest";
import { Button } from "@/components/ui/button";
import { deleteReverseShareFile, downloadReverseShareFile } from "@/http/endpoints/reverse-shares";
import type { ReverseShareFile } from "@/http/endpoints/reverse-shares/types";
import { formatFileSize } from "@/utils/format-file-size";
import { ReverseShareFilePreviewModal } from "./reverse-share-file-preview-modal";

const SHOWN = 5;

/** What came in through a receive link, newest first, inline under the link. */
export function ReceivedFilesList({
  files,
  onShowAll,
  onFileDeleted,
}: {
  files: ReverseShareFile[];
  onShowAll: () => void;
  onFileDeleted?: () => void;
}) {
  const t = useTranslations();
  const [previewFile, setPreviewFile] = useState<ReverseShareFile | null>(null);

  const sender = (file: ReverseShareFile) =>
    file.uploaderName || file.uploaderEmail || t("reverseShares.components.fileRow.anonymous");

  const download = async (file: ReverseShareFile) => {
    try {
      const response = await downloadReverseShareFile(file.id);
      const link = document.createElement("a");
      link.href = response.data.url;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Download error:", error);
      toast.error(t("reverseShares.modals.details.downloadError"));
    }
  };

  const remove = async (file: ReverseShareFile) => {
    try {
      await deleteReverseShareFile(file.id);
      toast.success(t("fileManager.deleteSuccess"));
      onFileDeleted?.();
    } catch (error) {
      console.error("Error deleting file:", error);
      toast.error(t("fileManager.deleteError"));
    }
  };

  if (!files.length) {
    return <p className="text-[13px] text-ink-3">{t("reverseShares.v2.noFiles")}</p>;
  }

  const sorted = [...files].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const items: ManifestItem[] = sorted.slice(0, SHOWN).map((file) => ({
    id: file.id,
    name: file.name,
    size: Number(file.size || 0),
    kind: kindFromName(file.name),
    subline: t("reverseShares.v2.receivedBy", {
      sender: sender(file),
      date: format(new Date(file.createdAt), "d MMM, HH:mm"),
    }),
    trailing: (
      <span className="flex items-center gap-1">
        <span className="mono mr-1 text-[13px] text-ink-2">{formatFileSize(Number(file.size || 0))}</span>
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={() => setPreviewFile(file)}
          aria-label={t("reverseShares.actions.viewDetails")}
        >
          <IconEye className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={() => download(file)}
          aria-label={t("common.download")}
        >
          <IconDownload className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 text-bad hover:text-bad"
          onClick={() => remove(file)}
          aria-label={t("common.delete")}
        >
          <IconTrash className="size-4" />
        </Button>
      </span>
    ),
  }));

  return (
    <>
      <FileManifest compact items={items} />
      {files.length > SHOWN && (
        <Button variant="ghost" size="sm" className="mt-1 text-primary" onClick={onShowAll}>
          {t("reverseShares.v2.showAll", { count: files.length })}
        </Button>
      )}
      {previewFile && (
        <ReverseShareFilePreviewModal isOpen={!!previewFile} onClose={() => setPreviewFile(null)} file={previewFile} />
      )}
    </>
  );
}
