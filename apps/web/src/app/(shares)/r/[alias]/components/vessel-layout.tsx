"use client";

import { IconAlertTriangle, IconCheck, IconClock, IconInfoCircle } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { TransferShell } from "@/components/brand/transfer-shell";
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

  if (
    reverseShare &&
    !hasUploadedSuccessfully &&
    !isLinkInactive &&
    !isLinkNotFound &&
    !isLinkExpired &&
    !isMaxFilesReached
  ) {
    return uploadSection();
  }

  return (
    <TransferShell
      direction="upload"
      title={t("publicTransfer.uploadTitle")}
      label={t("reverseShares.upload.layout.defaultTitle")}
    >
      {uploadSection()}
    </TransferShell>
  );
}
