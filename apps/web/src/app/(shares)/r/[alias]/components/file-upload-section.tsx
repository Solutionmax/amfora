"use client";

import { useCallback, useEffect, useState } from "react";
import { IconArrowUpRight, IconCheck, IconUpload, IconX } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";

import { kindFromName } from "@/components/brand/file-kind";
import { FileManifest, type ManifestItem } from "@/components/brand/file-manifest";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
    onBeforeUpload: async (file) => file.name,
    getPresignedUrl: async (_objectName, extension, file) => {
      const response = await getPresignedUrlForUploadByAlias(
        alias,
        { filename: file.name, extension, size: file.size },
        password ? { password } : undefined
      );
      return { url: response.data.url, method: "PUT", actualObjectName: response.data.objectName };
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
      createMultipartUpload: async (filename: string, extension: string, size: number) => {
        const response = await createMultipartUploadByAlias(
          alias,
          { filename, extension, size },
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

  const remainingFiles = reverseShare.maxFiles
    ? Math.max(0, reverseShare.maxFiles - reverseShare.currentFileCount - fileUploads.length)
    : null;

  const totalBytes = fileUploads.reduce((sum, upload) => sum + upload.file.size, 0);
  const overallProgress = fileUploads.length
    ? Math.round(fileUploads.reduce((sum, upload) => sum + upload.progress, 0) / fileUploads.length)
    : 0;
  const RING = 113;

  const rowActions = (upload: FileUploadState) => (
    <span className="flex items-center gap-0.5">
      {upload.status === "error" && (
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={() => retryUpload(upload.id)}
          aria-label={t("reverseShares.upload.fileList.retry")}
          title={t("reverseShares.upload.errors.retry")}
        >
          <IconUpload className="size-4" />
        </Button>
      )}
      {upload.status !== "uploading" && (
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={() => removeFile(upload.id)}
          aria-label={t("reverseShares.card.delete")}
          title={t("reverseShares.card.delete")}
        >
          <IconX className="size-4" />
        </Button>
      )}
    </span>
  );

  const items: ManifestItem[] = fileUploads.map((upload) => ({
    id: upload.id,
    name: upload.file.name,
    size: upload.file.size,
    kind: kindFromName(upload.file.name),
    progress: upload.status === "uploading" ? upload.progress : undefined,
    subline:
      upload.status === "success" ? (
        <span className="text-ok">{t("reverseShares.upload.fileList.statusUploaded")}</span>
      ) : upload.status === "error" ? (
        <span className="text-bad">{upload.error || t("reverseShares.upload.fileList.statusError")}</span>
      ) : upload.status === "uploading" ? (
        t("public.receive.uploading", { percent: upload.progress })
      ) : (
        formatFileSize(upload.file.size)
      ),
    trailing: (
      <span className="flex items-center gap-2">
        <span className="mono text-[13px] text-ink-2">{formatFileSize(upload.file.size)}</span>
        {rowActions(upload)}
      </span>
    ),
  }));

  return (
    <div className="px-5 pb-6 pt-5 md:px-6">
      <div
        {...getRootProps()}
        className="relative cursor-pointer rounded-[calc(var(--radius)+6px)] border-[1.5px] border-dashed border-[color-mix(in_oklab,var(--primary)_45%,var(--line-2))] bg-[linear-gradient(180deg,color-mix(in_oklab,var(--primary)_6%,var(--surface)),var(--surface))] px-6 pb-6 pt-7 text-center transition-colors duration-150 hover:border-primary hover:bg-primary-soft data-[drag-active=true]:border-primary data-[drag-active=true]:bg-primary-soft data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-60"
        data-drag-active={isDragActive}
        data-disabled={isUploading}
        role="button"
        aria-label={t("reverseShares.upload.fileDropzone.dragInactive")}
        aria-disabled={isUploading}
      >
        <input {...getInputProps()} />
        <div className="pointer-events-none">
          <span className="relative mx-auto mb-3.5 block h-[72px] w-24" aria-hidden="true">
            <i className="absolute left-1/2 top-1/2 h-16 w-[52px] -translate-x-1/2 -translate-y-1/2 -rotate-[14deg] rounded-lg border border-[color-mix(in_oklab,var(--primary)_30%,var(--line-2))] bg-primary-soft shadow-[0_8px_18px_-10px_rgba(12,22,38,.4)] [transform-origin:50%_90%]" />
            <i className="absolute left-1/2 top-1/2 h-16 w-[52px] -translate-x-1/2 -translate-y-1/2 rotate-6 rounded-lg border border-line-2 bg-surface shadow-[0_8px_18px_-10px_rgba(12,22,38,.4)] [transform-origin:50%_90%]" />
            <i className="absolute left-1/2 top-1/2 flex h-16 w-[52px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-lg border border-line-2 bg-surface text-primary shadow-[0_8px_18px_-10px_rgba(12,22,38,.4)]">
              <IconUpload className="size-[22px]" strokeWidth={1.75} />
            </i>
          </span>
          <b className="block font-display text-base font-semibold">
            {isDragActive
              ? t("reverseShares.upload.fileDropzone.dragActive")
              : t("reverseShares.upload.fileDropzone.dragInactive")}
          </b>
          <p className="mt-1 text-[13px] text-ink-3">
            {t("public.receive.drop.text")}
            {reverseShare.allowedFileTypes && (
              <> {t("reverseShares.upload.fileDropzone.acceptedTypes", { types: reverseShare.allowedFileTypes })}</>
            )}
            {remainingFiles !== null && (
              <>
                {" "}
                {t("reverseShares.upload.fileDropzone.remainingFiles", {
                  remaining: remainingFiles,
                  max: reverseShare.maxFiles ?? 0,
                })}
              </>
            )}
          </p>
          <span className="mt-3.5 inline-flex h-8 items-center rounded-[var(--radius)] border border-line-2 bg-surface px-3 text-[13px] font-semibold">
            {t("public.receive.drop.choose")}
          </span>
        </div>
      </div>

      {fileUploads.length > 0 && (
        <>
          <FileManifest items={items} className="mt-4" />
          <div className="mt-3.5 grid grid-cols-[auto_1fr] items-center gap-3.5 rounded-[var(--radius)] bg-surface-2 px-4 py-3.5">
            <svg viewBox="0 0 40 40" className="size-11 -rotate-90" aria-hidden="true">
              <circle cx="20" cy="20" r="18" fill="none" strokeWidth="4" className="stroke-line" />
              <circle
                cx="20"
                cy="20"
                r="18"
                fill="none"
                strokeWidth="4"
                strokeLinecap="round"
                className="stroke-primary transition-[stroke-dashoffset]"
                strokeDasharray={RING}
                strokeDashoffset={RING - (RING * overallProgress) / 100}
              />
            </svg>
            <div>
              <b className="block text-sm">
                <span className="mono font-medium">{overallProgress}%</span> ·{" "}
                {t("share.itemCount", { count: fileUploads.length })} · {formatFileSize(totalBytes)}
              </b>
              <span className="text-xs text-ink-3">
                {isUploading ? t("public.receive.progress.keepOpen") : t("public.receive.progress.ready")}
              </span>
            </div>
          </div>
        </>
      )}

      {allFilesProcessed && hasSuccessfulUploads && (
        <div className="mt-3.5 flex items-start gap-3 rounded-[var(--radius)] bg-ok-soft p-3.5 text-ok">
          <IconCheck className="mt-0.5 size-4 shrink-0" />
          <div>
            <p className="text-sm font-semibold">{t("reverseShares.upload.success.title")}</p>
            <p className="mt-0.5 text-xs leading-5 opacity-90">{t("reverseShares.upload.success.description")}</p>
          </div>
        </div>
      )}

      <div className="mt-[18px] grid gap-3 sm:grid-cols-2">
        {reverseShare.nameFieldRequired !== "HIDDEN" && (
          <div className="space-y-1.5">
            <Label htmlFor="name">
              {reverseShare.nameFieldRequired === "OPTIONAL"
                ? t("reverseShares.upload.form.nameLabelOptional")
                : t("reverseShares.upload.form.nameLabel")}
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
            <Label htmlFor="email">
              {reverseShare.emailFieldRequired === "OPTIONAL"
                ? t("reverseShares.upload.form.emailLabelOptional")
                : t("reverseShares.upload.form.emailLabel")}
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
      <div className="mt-3 space-y-1.5">
        <Label htmlFor="description">{t("reverseShares.upload.form.descriptionLabel")}</Label>
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
      <Button
        type="button"
        onClick={handleUpload}
        disabled={!canUpload}
        className="mt-[18px] w-full shadow-[0_10px_24px_-12px_color-mix(in_oklab,var(--primary)_70%,transparent)]"
        size="lg"
      >
        <IconUpload className="size-5" />
        {isUploading
          ? t("reverseShares.upload.form.uploading")
          : t("public.receive.send", { count: fileUploads.length })}
        <IconArrowUpRight className="size-5" />
      </Button>
    </div>
  );
}
