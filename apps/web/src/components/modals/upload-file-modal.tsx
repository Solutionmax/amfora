"use client";

import { useEffect, useRef, useState } from "react";
import { IconRefresh, IconUpload, IconX } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { FileTypeIcon } from "@/components/files/file-type-icon";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useUppyUpload } from "@/hooks/useUppyUpload";
import { checkFile, getFilePresignedUrl, registerFile } from "@/http/endpoints";
import { cn } from "@/lib/utils";
import { generateSafeFileName } from "@/utils/file-utils";
import { formatFileSize } from "@/utils/format-file-size";
import getErrorData from "@/utils/getErrorData";

interface UploadFileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  currentFolderId?: string;
  /** Name of the folder the files go to; My Files when left out. */
  destinationName?: string;
}

interface ConfirmationModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  uploadsInProgress: number;
}

function ConfirmationModal({ isOpen, onConfirm, onCancel, uploadsInProgress }: ConfirmationModalProps) {
  const t = useTranslations();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-[440px]" showCloseButton={false}>
        <DialogHeader className="pr-0">
          <DialogTitle>{t("uploadFile.confirmCancel.title")}</DialogTitle>
          <DialogDescription>
            {uploadsInProgress > 1
              ? t("uploadFile.confirmCancel.messageMultiple", { count: uploadsInProgress })
              : t("uploadFile.confirmCancel.messageSingle")}{" "}
            {t("uploadFile.confirmCancel.warning")}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={onCancel}>
            {t("uploadFile.confirmCancel.continue")}
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            {t("uploadFile.confirmCancel.cancel")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function UploadFileModal({
  isOpen,
  onClose,
  onSuccess,
  currentFolderId,
  destinationName,
}: UploadFileModalProps) {
  const t = useTranslations();
  const [isDragOver, setIsDragOver] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const hasShownSuccessToastRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { addFiles, startUpload, cancelUpload, retryUpload, removeFile, clearAll, fileUploads, isUploading } =
    useUppyUpload({
      onValidate: async (file) => {
        const fileName = file.name;
        const extension = fileName.split(".").pop() || "";
        const safeObjectName = generateSafeFileName(fileName);

        try {
          await checkFile({
            name: fileName,
            objectName: safeObjectName,
            size: file.size,
            extension: extension,
            folderId: currentFolderId,
          });
        } catch (error) {
          console.error("File check failed:", error);
          const errorData = getErrorData(error);
          let errorMessage = t("uploadFile.error");

          if (errorData.code === "fileSizeExceeded") {
            errorMessage = t(`uploadFile.${errorData.code}`, { maxsizemb: errorData.details || "0" });
          } else if (errorData.code === "insufficientStorage") {
            errorMessage = t(`uploadFile.${errorData.code}`, { availablespace: errorData.details || "0" });
          } else if (errorData.code) {
            errorMessage = t(`uploadFile.${errorData.code}`);
          }

          toast.error(errorMessage);
          throw new Error(errorMessage);
        }
      },
      onBeforeUpload: async (file) => {
        const safeObjectName = generateSafeFileName(file.name);
        return safeObjectName;
      },
      getPresignedUrl: async (objectName, extension) => {
        // Extract filename without extension (backend will add it)
        const filenameWithoutExt = objectName.replace(`.${extension}`, "");

        const response = await getFilePresignedUrl({
          filename: filenameWithoutExt,
          extension,
        });

        // IMPORTANT: Use the objectName returned by backend, not the one we generated!
        // The backend generates: userId/timestamp-random-filename.extension
        const actualObjectName = response.data.objectName;

        return { url: response.data.url, method: "PUT", actualObjectName };
      },
      onAfterUpload: async (fileId, file, objectName) => {
        const fileName = file.name;
        const extension = fileName.split(".").pop() || "";

        await registerFile({
          name: fileName,
          objectName,
          size: file.size,
          extension,
          folderId: currentFolderId,
        });
      },
    });

  // Monitor upload completion and call onSuccess when all done
  useEffect(() => {
    // Only process if we have uploads and they're not currently uploading
    if (fileUploads.length === 0 || isUploading || hasShownSuccessToastRef.current) {
      return;
    }

    const successCount = fileUploads.filter((u) => u.status === "success").length;
    const errorCount = fileUploads.filter((u) => u.status === "error").length;
    const pendingCount = fileUploads.filter((u) => u.status === "pending" || u.status === "uploading").length;

    // All uploads are done (no pending/uploading)
    if (pendingCount === 0 && (successCount > 0 || errorCount > 0)) {
      hasShownSuccessToastRef.current = true;

      if (successCount > 0) {
        if (errorCount > 0) {
          toast.error(t("uploadFile.partialSuccess", { success: successCount, error: errorCount }));
        } else {
          toast.success(t("uploadFile.allSuccess", { count: successCount }));
        }

        // Call parent's onSuccess to refresh the file list
        // Add delay to ensure backend has processed everything
        setTimeout(() => {
          onSuccess?.();
        }, 300);
      }
    }
  }, [fileUploads, isUploading, onSuccess, t]);

  // Reset toast flag and clear uploads when modal closes
  useEffect(() => {
    if (!isOpen) {
      hasShownSuccessToastRef.current = false;
      clearAll();
    }
  }, [isOpen, clearAll]);

  // Handle file input change
  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      addFiles(Array.from(event.target.files));
      hasShownSuccessToastRef.current = false; // Reset when adding new files
      event.target.value = ""; // Reset input
    }
  };

  // Handle drag and drop
  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
    event.stopPropagation();

    const files = event.dataTransfer.files;
    if (files.length > 0) {
      addFiles(Array.from(files));
      hasShownSuccessToastRef.current = false; // Reset when adding new files
    }
  };

  const handleConfirmClose = () => {
    // Cancel all uploads
    fileUploads.forEach((upload) => {
      if (upload.status === "uploading") {
        cancelUpload(upload.id);
      }
      // Revoke preview URLs
      if (upload.previewUrl) {
        URL.revokeObjectURL(upload.previewUrl);
      }
    });

    setShowConfirmation(false);
    onClose();
  };

  // Prevent closing while uploading
  const handleClose = () => {
    if (isUploading) {
      setShowConfirmation(true);
    } else {
      handleConfirmClose();
    }
  };

  const handleContinueUploads = () => {
    setShowConfirmation(false);
  };

  const allUploadsComplete =
    fileUploads.length > 0 &&
    fileUploads.every((u) => u.status === "success" || u.status === "error" || u.status === "cancelled");

  const hasPendingUploads = fileUploads.some((u) => u.status === "pending");

  const statusText = (upload: (typeof fileUploads)[number]) => {
    if (upload.status === "uploading") return `${upload.progress}%`;
    if (upload.status === "success") return t("files.calm.uploaded");
    if (upload.status === "error") return t("files.calm.uploadFailed");
    if (upload.status === "cancelled") return t("files.calm.uploadCancelled");
    return formatFileSize(upload.file.size);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent
          className="flex max-h-[calc(100dvh-2rem)] flex-col overflow-hidden sm:max-w-[560px]"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => {
            if (isUploading) {
              e.preventDefault();
              setShowConfirmation(true);
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>{t("uploadFile.multipleTitle")}</DialogTitle>
            <DialogDescription>
              {t.rich("files.calm.uploadTo", {
                folder: destinationName || t("files.pageTitle"),
                b: (chunks) => <b className="font-semibold text-ink">{chunks}</b>,
              })}
            </DialogDescription>
          </DialogHeader>

          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
            <input ref={fileInputRef} className="hidden" type="file" multiple onChange={handleFileInputChange} />

            <button
              type="button"
              className={cn(
                "grid w-full shrink-0 cursor-pointer justify-items-center gap-1.5 rounded-xl border-[1.5px] border-dashed border-line-2 px-4 py-8 text-center text-ink-3 outline-none transition-colors hover:border-primary hover:bg-primary-soft focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/20",
                isDragOver && "border-primary bg-primary-soft"
              )}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <IconUpload size={26} stroke={1.8} aria-hidden className="mb-1 text-ink-icon" />
              <b className="font-semibold text-ink">{t("files.calm.dropTitle")}</b>
              <span className="text-[12.5px]">{t("files.calm.dropHint")}</span>
            </button>

            {fileUploads.length > 0 && (
              <ul className="flex flex-col [&>li+li]:border-t [&>li+li]:border-line">
                {fileUploads.map((upload) => (
                  <li key={upload.id} className="flex items-center gap-3.5 py-3">
                    {upload.previewUrl ? (
                      <img src={upload.previewUrl} alt="" className="size-[17px] shrink-0 rounded-[3px] object-cover" />
                    ) : (
                      <FileTypeIcon name={upload.file.name} />
                    )}

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] font-semibold">{upload.file.name}</p>
                      {upload.status === "uploading" ? (
                        <div
                          className="mt-2 h-[3px] overflow-hidden rounded-full bg-line"
                          role="progressbar"
                          aria-valuenow={upload.progress}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label={upload.file.name}
                        >
                          <div
                            className="h-full rounded-full bg-primary transition-[width] duration-300"
                            style={{ width: `${upload.progress}%` }}
                          />
                        </div>
                      ) : upload.status === "error" && upload.error ? (
                        <p className="truncate text-[12.5px] text-bad">{upload.error}</p>
                      ) : (
                        <p className="text-[12.5px] text-ink-3">{formatFileSize(upload.file.size)}</p>
                      )}
                    </div>

                    <span
                      className={cn(
                        "shrink-0 text-[12.5px] tabular-nums",
                        upload.status === "success" ? "text-ok" : upload.status === "error" ? "text-bad" : "text-ink-3"
                      )}
                    >
                      {upload.status === "pending" ? "" : statusText(upload)}
                    </span>

                    <div className="flex shrink-0 items-center">
                      {upload.status === "uploading" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={t("common.cancel")}
                          onClick={() => cancelUpload(upload.id)}
                        >
                          <IconX />
                        </Button>
                      )}
                      {upload.status === "error" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={t("uploadFile.retry")}
                          title={t("uploadFile.retry")}
                          onClick={() => retryUpload(upload.id)}
                        >
                          <IconRefresh />
                        </Button>
                      )}
                      {(upload.status === "pending" || upload.status === "error" || upload.status === "cancelled") && (
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={t("files.calm.removeFromList", { name: upload.file.name })}
                          onClick={() => removeFile(upload.id)}
                        >
                          <IconX />
                        </Button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <DialogFooter>
            {!allUploadsComplete && (
              <Button variant="ghost" onClick={handleClose}>
                {t("common.cancel")}
              </Button>
            )}
            {allUploadsComplete ? (
              <Button onClick={handleConfirmClose}>{t("files.calm.done")}</Button>
            ) : (
              <Button disabled={fileUploads.length === 0 || isUploading || !hasPendingUploads} onClick={startUpload}>
                <IconUpload />
                {isUploading
                  ? t("files.calm.uploading")
                  : t("files.calm.uploadCount", { count: fileUploads.filter((u) => u.status === "pending").length })}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmationModal
        isOpen={showConfirmation}
        onConfirm={handleConfirmClose}
        onCancel={handleContinueUploads}
        uploadsInProgress={fileUploads.filter((u) => u.status === "uploading").length}
      />
    </>
  );
}
