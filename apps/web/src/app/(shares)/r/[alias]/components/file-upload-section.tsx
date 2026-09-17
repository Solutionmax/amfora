"use client";

import { useCallback, useEffect, useState } from "react";
import {
  IconArrowUpRight,
  IconCheck,
  IconFile,
  IconFileText,
  IconFileTypePdf,
  IconMail,
  IconUpload,
  IconUser,
  IconX,
} from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";

import { TransferShell } from "@/components/brand/transfer-shell";
import styles from "@/components/brand/transfer-shell.module.css";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { useUppyUpload, type FileUploadState } from "@/hooks/useUppyUpload";
import {
  abortMultipartUploadByAlias,
  completeMultipartUploadByAlias,
  createMultipartUploadByAlias,
  getMultipartPartUrlByAlias,
  getPresignedUrlForUploadByAlias,
  registerFileUploadByAlias,
} from "@/http/endpoints";
import { formatFileSize } from "@/utils/format-file-size";
import { UPLOAD_CONFIG } from "../constants";
import { FileUploadSectionProps } from "../types";

export function FileUploadSection({
  reverseShare,
  password,
  alias,
  onUploadSuccess,
  onFilesChange,
}: FileUploadSectionProps) {
  const [uploaderName, setUploaderName] = useState("");
  const [uploaderEmail, setUploaderEmail] = useState("");
  const [description, setDescription] = useState("");

  const t = useTranslations();

  const { addFiles, startUpload, removeFile, retryUpload, fileUploads, isUploading } = useUppyUpload({
    onValidate: async (file) => {
      // Client-side validations
      if (reverseShare.maxFileSize && file.size > reverseShare.maxFileSize) {
        const error = t("reverseShares.upload.errors.fileTooLarge", {
          maxSize: formatFileSize(reverseShare.maxFileSize),
        });
        toast.error(error);
        throw new Error(error);
      }

      if (reverseShare.allowedFileTypes) {
        const extension = file.name.split(".").pop()?.toLowerCase();
        const allowed = reverseShare.allowedFileTypes.split(",").map((t) => t.trim().toLowerCase());
        if (extension && !allowed.includes(extension)) {
          const error = t("reverseShares.upload.errors.fileTypeNotAllowed", {
            allowedTypes: reverseShare.allowedFileTypes,
          });
          toast.error(error);
          throw new Error(error);
        }
      }

      if (reverseShare.maxFiles) {
        const totalFiles = fileUploads.length + 1 + reverseShare.currentFileCount;
        if (totalFiles > reverseShare.maxFiles) {
          const error = t("reverseShares.upload.errors.maxFilesExceeded", {
            maxFiles: reverseShare.maxFiles,
          });
          toast.error(error);
          throw new Error(error);
        }
      }
    },
    onBeforeUpload: async (file) => {
      const timestamp = Date.now();
      const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      return `reverse-shares/${alias}/${timestamp}-${sanitizedFileName}`;
    },
    getPresignedUrl: async (objectName) => {
      const response = await getPresignedUrlForUploadByAlias(
        alias,
        { objectName },
        password ? { password } : undefined
      );
      return { url: response.data.url, method: "PUT" };
    },
    onAfterUpload: async (fileId, file, objectName) => {
      const fileExtension = file.name.split(".").pop() || "";

      await registerFileUploadByAlias(
        alias,
        {
          name: file.name,
          description: description || undefined,
          extension: fileExtension,
          size: file.size,
          objectName,
          uploaderEmail: uploaderEmail || undefined,
          uploaderName: uploaderName || undefined,
        },
        password ? { password } : undefined
      );
    },
    onSuccess: () => {
      const successCount = fileUploads.filter((u) => u.status === "success").length;

      if (successCount > 0) {
        toast.success(
          t("reverseShares.upload.success.countMessage", {
            count: successCount,
          })
        );

        onUploadSuccess?.();
      }
    },
    // Custom multipart functions for reverse share uploads (no auth required)
    customMultipartFunctions: {
      createMultipartUpload: async (filename: string, extension: string) => {
        const response = await createMultipartUploadByAlias(
          alias,
          { filename, extension },
          password ? { password } : undefined
        );
        return response.data;
      },
      getMultipartPartUrl: async (uploadId: string, objectName: string, partNumber: string) => {
        const response = await getMultipartPartUrlByAlias(alias, { uploadId, objectName, partNumber, password });
        return response.data;
      },
      completeMultipartUpload: async (
        uploadId: string,
        objectName: string,
        parts: Array<{ PartNumber: number; ETag: string }>
      ) => {
        const response = await completeMultipartUploadByAlias(
          alias,
          { uploadId, objectName, parts },
          password ? { password } : undefined
        );
        return response.data;
      },
      abortMultipartUpload: async (uploadId: string, objectName: string) => {
        const response = await abortMultipartUploadByAlias(
          alias,
          { uploadId, objectName },
          password ? { password } : undefined
        );
        return response.data;
      },
    },
  });

  // Lets the page draw how full the vessel is while you add files.
  useEffect(() => {
    onFilesChange?.(
      fileUploads.length,
      fileUploads.reduce((sum, item) => sum + (item.file?.size ?? 0), 0)
    );
  }, [fileUploads, onFilesChange]);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      addFiles(acceptedFiles);
    },
    [addFiles]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
    disabled: isUploading,
  });

  const validateUploadRequirements = (): boolean => {
    if (fileUploads.length === 0) {
      toast.error(t("reverseShares.upload.errors.selectAtLeastOneFile"));
      return false;
    }

    const nameRequired = reverseShare.nameFieldRequired === "REQUIRED";
    const emailRequired = reverseShare.emailFieldRequired === "REQUIRED";

    if (nameRequired && !uploaderName.trim()) {
      toast.error(t("reverseShares.upload.errors.provideNameRequired"));
      return false;
    }

    if (emailRequired && !uploaderEmail.trim()) {
      toast.error(t("reverseShares.upload.errors.provideEmailRequired"));
      return false;
    }

    return true;
  };

  const handleUpload = async () => {
    if (!validateUploadRequirements()) return;
    startUpload();
  };

  const getCanUpload = (): boolean => {
    if (fileUploads.length === 0 || isUploading) return false;

    const nameRequired = reverseShare.nameFieldRequired === "REQUIRED";
    const emailRequired = reverseShare.emailFieldRequired === "REQUIRED";
    const nameHidden = reverseShare.nameFieldRequired === "HIDDEN";
    const emailHidden = reverseShare.emailFieldRequired === "HIDDEN";

    if (nameHidden && emailHidden) return true;

    if (nameRequired && !uploaderName.trim()) return false;

    if (emailRequired && !uploaderEmail.trim()) return false;

    return true;
  };

  const canUpload = getCanUpload();
  const allFilesProcessed = fileUploads.every((file) => file.status === "success" || file.status === "error");
  const hasSuccessfulUploads = fileUploads.some((file) => file.status === "success");

  const renderFileRestrictions = () => {
    const calculateRemainingFiles = (): number => {
      if (!reverseShare.maxFiles) return 0;
      const currentTotal = reverseShare.currentFileCount + fileUploads.length;
      const remaining = reverseShare.maxFiles - currentTotal;
      return Math.max(0, remaining);
    };

    const remainingFiles = calculateRemainingFiles();

    return (
      <p className="text-xs leading-5 text-white/85">
        {reverseShare.allowedFileTypes && (
          <>
            {t("reverseShares.upload.fileDropzone.acceptedTypes", { types: reverseShare.allowedFileTypes })}
            <br />
          </>
        )}
        {reverseShare.maxFileSize && (
          <>
            {t("reverseShares.upload.fileDropzone.maxFileSize", { size: formatFileSize(reverseShare.maxFileSize) })}
            <br />
          </>
        )}
        {reverseShare.maxFiles && (
          <>
            {t("reverseShares.upload.fileDropzone.remainingFiles", {
              remaining: remainingFiles,
              max: reverseShare.maxFiles,
            })}
          </>
        )}
      </p>
    );
  };

  const renderFileStatusBadge = (fileStatus: string) => {
    if (fileStatus === "success") {
      return (
        <Badge variant="default" className="gap-1 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
          <IconCheck className="size-3" />
          {t("reverseShares.upload.fileList.statusUploaded")}
        </Badge>
      );
    }

    if (fileStatus === "error") {
      return <Badge variant="destructive">{t("reverseShares.upload.fileList.statusError")}</Badge>;
    }

    return null;
  };

  const getFileIcon = (fileName: string) => {
    if (fileName.toLowerCase().endsWith(".pdf")) return IconFileTypePdf;
    if (fileName.includes(".")) return IconFileText;
    return IconFile;
  };

  const renderFileItem = (upload: FileUploadState) => {
    const FileIcon = getFileIcon(upload.file.name);

    return (
      <div
        key={upload.id}
        className="group min-w-0 rounded-xl border border-border/80 bg-background/80 p-3 transition-colors hover:border-primary/35"
      >
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <FileIcon className="size-4" />
          </span>
          <div className="min-w-0 flex-1 pt-0.5">
            <p className="truncate text-sm font-semibold">{upload.file.name}</p>
            <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">{formatFileSize(upload.file.size)}</p>
            {upload.status === "uploading" && (
              <Progress aria-label={upload.file.name} value={upload.progress} className="mt-2 h-1.5" />
            )}
            {upload.status === "error" && upload.error && (
              <p className="mt-1 break-words text-xs text-destructive">{upload.error}</p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {renderFileStatusBadge(upload.status)}
            {upload.status === "pending" && (
              <Button
                size="sm"
                variant="ghost"
                type="button"
                onClick={() => removeFile(upload.id)}
                disabled={isUploading}
                aria-label={t("reverseShares.card.delete")}
                title={t("reverseShares.card.delete")}
              >
                <IconX className="size-4" />
              </Button>
            )}
            {upload.status === "error" && (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  type="button"
                  onClick={() => retryUpload(upload.id)}
                  disabled={isUploading}
                  aria-label={t("reverseShares.upload.fileList.retry")}
                  title={t("reverseShares.upload.errors.retry")}
                >
                  <IconUpload className="size-4" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => removeFile(upload.id)}
                  disabled={isUploading}
                  aria-label={t("reverseShares.card.delete")}
                  title={t("reverseShares.card.delete")}
                >
                  <IconX className="size-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <TransferShell
      direction="upload"
      title={t("publicTransfer.uploadTitle")}
      label={t("reverseShares.upload.layout.defaultTitle")}
      aside={
        <div className="space-y-6">
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2">
              {reverseShare.nameFieldRequired !== "HIDDEN" && (
                <div className="space-y-1.5">
                  <Label className="text-xs" htmlFor="name">
                    <IconUser className="mr-1 inline size-3.5 text-primary" />
                    {reverseShare.nameFieldRequired === "OPTIONAL"
                      ? t("reverseShares.upload.form.nameLabelOptional")
                      : t("reverseShares.upload.form.nameLabel")}
                    {reverseShare.nameFieldRequired === "REQUIRED" && <span className="ml-1 text-destructive">*</span>}
                  </Label>
                  <Input
                    id="name"
                    placeholder={t("reverseShares.upload.form.namePlaceholder")}
                    value={uploaderName}
                    onChange={(e) => setUploaderName(e.target.value)}
                    disabled={isUploading}
                    required={reverseShare.nameFieldRequired === "REQUIRED"}
                  />
                </div>
              )}
              {reverseShare.emailFieldRequired !== "HIDDEN" && (
                <div className="space-y-1.5">
                  <Label className="text-xs" htmlFor="email">
                    <IconMail className="mr-1 inline size-3.5 text-primary" />
                    {reverseShare.emailFieldRequired === "OPTIONAL"
                      ? t("reverseShares.upload.form.emailLabelOptional")
                      : t("reverseShares.upload.form.emailLabel")}
                    {reverseShare.emailFieldRequired === "REQUIRED" && <span className="ml-1 text-destructive">*</span>}
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder={t("reverseShares.upload.form.emailPlaceholder")}
                    value={uploaderEmail}
                    onChange={(e) => setUploaderEmail(e.target.value)}
                    disabled={isUploading}
                    required={reverseShare.emailFieldRequired === "REQUIRED"}
                  />
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs" htmlFor="description">
                {t("reverseShares.upload.form.descriptionLabel")}
              </Label>
              <Textarea
                id="description"
                placeholder={t("reverseShares.upload.form.descriptionPlaceholder")}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isUploading}
                rows={UPLOAD_CONFIG.TEXTAREA_ROWS}
                className="min-h-0 resize-y"
              />
            </div>
          </div>
          <Button
            type="button"
            onClick={handleUpload}
            disabled={!canUpload}
            className="h-13 w-full justify-between rounded-lg px-4 shadow-lg shadow-primary/15"
            size="lg"
            variant="default"
          >
            <span>
              {isUploading
                ? t("reverseShares.upload.form.uploading")
                : fileUploads.length
                  ? t("reverseShares.upload.form.uploadButton", { count: fileUploads.length })
                  : t("reverseShares.upload.layout.defaultTitle")}
            </span>
            <IconArrowUpRight className="size-5" />
          </Button>
        </div>
      }
    >
      <header className="mb-6">
        <h2 className="break-words font-display text-2xl font-bold leading-tight tracking-tight">
          {reverseShare.name || t("reverseShares.upload.layout.defaultTitle")}
        </h2>
        {reverseShare.description && (
          <p className="mt-2 break-words text-sm leading-6 text-white/85">{reverseShare.description}</p>
        )}
      </header>
      <div className="space-y-5">
        <div
          {...getRootProps()}
          className={styles.postalDropzone}
          data-drag-active={isDragActive}
          data-disabled={isUploading}
          role="button"
          aria-label={t("reverseShares.upload.fileDropzone.dragInactive")}
          aria-disabled={isUploading}
        >
          <input {...getInputProps()} />
          <div className="pointer-events-none mx-auto flex max-w-xs flex-col items-center">
            <IconUpload className="mb-4 size-8" strokeWidth={1.4} aria-hidden="true" />
            <h3 className="text-base font-semibold leading-6">
              {isDragActive
                ? t("reverseShares.upload.fileDropzone.dragActive")
                : t("reverseShares.upload.fileDropzone.dragInactive")}
            </h3>
            <div className="mt-2">{renderFileRestrictions()}</div>
          </div>
        </div>

        {fileUploads.length > 0 && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-3">
              <h4 className="font-display text-sm font-bold">{t("reverseShares.upload.fileList.title")}</h4>
              <span className="font-mono text-xs text-white/85">{fileUploads.length}</span>
            </div>
            <div className="space-y-2 text-foreground">{fileUploads.map(renderFileItem)}</div>
          </div>
        )}

        {allFilesProcessed && hasSuccessfulUploads && (
          <div className="flex items-start gap-3 rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3.5 text-left">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
              <IconCheck className="size-4" />
            </span>
            <div>
              <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                {t("reverseShares.upload.success.title")}
              </p>
              <p className="mt-0.5 text-xs leading-5 text-emerald-700/80 dark:text-emerald-300/80">
                {t("reverseShares.upload.success.description")}
              </p>
            </div>
          </div>
        )}
      </div>
    </TransferShell>
  );
}
