"use client";

import { IconAlertTriangle, IconCheck, IconClock, IconInfoCircle } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { TransferShell } from "@/components/brand/transfer-shell";
import { formatFileSize } from "@/utils/format-file-size";
import { MESSAGE_TYPES } from "../constants";
import { VesselLayoutProps } from "../types";
import { FileUploadSection } from "./file-upload-section";
import { VesselStatusMessage } from "./shared/status-message";

export function VesselLayout({
  reverseShare,
  password,
  alias,
  isMaxFilesReached,
  hasUploadedSuccessfully,
  onUploadSuccess,
  isLinkInactive,
  isLinkNotFound,
  isLinkExpired,
}: VesselLayoutProps) {
  const t = useTranslations();
  const uploadSection = () => {
    if (hasUploadedSuccessfully) {
      return (
        <VesselStatusMessage
          type={MESSAGE_TYPES.SUCCESS}
          icon={IconCheck}
          titleKey="reverseShares.upload.success.title"
          descriptionKey="reverseShares.upload.success.description"
        />
      );
    }

    if (isLinkInactive) {
      return (
        <VesselStatusMessage
          type={MESSAGE_TYPES.INACTIVE}
          icon={IconAlertTriangle}
          titleKey="reverseShares.upload.linkInactive.title"
          descriptionKey="reverseShares.upload.linkInactive.description"
          showContactOwner
        />
      );
    }

    if (isLinkExpired) {
      return (
        <VesselStatusMessage
          type={MESSAGE_TYPES.EXPIRED}
          icon={IconClock}
          titleKey="reverseShares.upload.linkExpired.title"
          descriptionKey="reverseShares.upload.linkExpired.description"
          showContactOwner
        />
      );
    }

    if (isLinkNotFound || !reverseShare) {
      return (
        <VesselStatusMessage
          type={MESSAGE_TYPES.NOT_FOUND}
          icon={IconAlertTriangle}
          titleKey="reverseShares.upload.linkNotFound.title"
          descriptionKey="reverseShares.upload.linkNotFound.description"
        />
      );
    }

    if (isMaxFilesReached) {
      return (
        <VesselStatusMessage
          type={MESSAGE_TYPES.MAX_FILES}
          icon={IconInfoCircle}
          titleKey="reverseShares.upload.maxFilesReached.title"
          descriptionKey="reverseShares.upload.maxFilesReached.description"
          showContactOwner
          reverseShare={reverseShare}
        />
      );
    }

    return (
      <FileUploadSection
        reverseShare={reverseShare}
        password={password}
        alias={alias}
        onUploadSuccess={onUploadSuccess}
      />
    );
  };

  const maxFiles = reverseShare?.maxFiles ?? 0;
  const showLimits =
    reverseShare &&
    !hasUploadedSuccessfully &&
    !isLinkInactive &&
    !isLinkNotFound &&
    !isLinkExpired &&
    !isMaxFilesReached;

  return (
    <TransferShell
      direction="upload"
      title={t("publicTransfer.uploadTitle")}
      caption={t("publicTransfer.uploadCaption")}
      label={t("reverseShares.upload.layout.defaultTitle")}
    >
      <header className="mb-6">
        <p className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
          {t("reverseShares.pageTitle")}
        </p>
        <h2 className="mt-2 break-words font-display text-3xl font-bold leading-tight tracking-tight">
          {reverseShare?.name || t("reverseShares.upload.layout.defaultTitle")}
        </h2>
        {reverseShare?.description && (
          <p className="mt-3 break-words text-sm leading-6 text-muted-foreground">{reverseShare.description}</p>
        )}
      </header>
      {uploadSection()}
      {showLimits && (
        <dl className="mt-6 flex flex-wrap justify-between gap-x-5 gap-y-3 border-t border-border/70 pt-5 text-xs">
          <div className="flex items-center gap-2">
            <dt className="text-muted-foreground">{t("reverseShares.labels.filesReceived")}</dt>
            <dd className="font-medium tabular-nums">
              {reverseShare.currentFileCount}
              {maxFiles ? ` / ${maxFiles}` : ""}
            </dd>
          </div>
          <div className="flex items-center gap-2">
            <dt className="text-muted-foreground">{t("reverseShares.labels.maxFileSize")}</dt>
            <dd className="font-medium">
              {reverseShare.maxFileSize
                ? formatFileSize(reverseShare.maxFileSize)
                : t("reverseShares.labels.noSizeLimit")}
            </dd>
          </div>
        </dl>
      )}
    </TransferShell>
  );
}
