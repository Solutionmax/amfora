"use client";

import { IconDownload } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { EmbedCodeDisplay } from "@/components/files/embed-code-display";
import { MediaEmbedLink } from "@/components/files/media-embed-link";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useFilePreview } from "@/hooks/use-file-preview";
import { getFileType } from "@/utils/file-types";
import { FilePreviewRenderer } from "./previews";

interface FilePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: {
    name: string;
    objectName: string;
    type?: string;
    id?: string;
    description?: string;
  };
  isReverseShare?: boolean;
  sharePassword?: string;
}

export function FilePreviewModal({
  isOpen,
  onClose,
  file,
  isReverseShare = false,
  sharePassword,
}: FilePreviewModalProps) {
  const t = useTranslations();
  const previewState = useFilePreview({ file, isOpen, isReverseShare, sharePassword });
  const fileType = getFileType(file.name);
  const isImage = fileType === "image";
  const isVideo = fileType === "video";
  const isAudio = fileType === "audio";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[90dvh] flex-col overflow-hidden sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="truncate" title={file.name}>
            {file.name}
          </DialogTitle>
          <DialogDescription className={file.description ? "line-clamp-2" : "sr-only"}>
            {file.description || t("filePreview.description")}
          </DialogDescription>
        </DialogHeader>
        <div className="-mx-6 min-h-0 flex-1 overflow-auto px-6">
          <FilePreviewRenderer
            fileType={previewState.fileType}
            fileName={file.name}
            previewUrl={previewState.previewUrl}
            videoBlob={previewState.videoBlob}
            textContent={previewState.textContent}
            isLoading={previewState.isLoading}
            pdfAsBlob={previewState.pdfAsBlob}
            pdfLoadFailed={previewState.pdfLoadFailed}
            onPdfLoadError={previewState.handlePdfLoadError}
            description={file.description}
            onDownload={previewState.handleDownload}
          />
          {!isReverseShare && isImage && previewState.previewUrl && !previewState.isLoading && file.id && (
            <EmbedCodeDisplay imageUrl={previewState.previewUrl} fileName={file.name} fileId={file.id} />
          )}
          {!isReverseShare && (isVideo || isAudio) && !previewState.isLoading && file.id && (
            <MediaEmbedLink fileId={file.id} />
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            {t("common.close")}
          </Button>
          <Button onClick={previewState.handleDownload}>
            <IconDownload />
            {t("common.download")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
