"use client";

import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";

import { TransferShell } from "@/components/brand/transfer-shell";
import { LoadingScreen } from "@/components/layout/loading-screen";
import { DefaultLayout, PasswordModal, VesselLayout } from "./components";
import { useReverseShareUpload } from "./hooks/use-reverse-share-upload";

export default function ReverseShareUploadPage() {
  const params = useParams();
  const t = useTranslations();
  const shareAlias = params?.alias as string;

  const {
    reverseShare,
    currentPassword,
    isLoading,
    isPasswordModalOpen,
    hasUploadedSuccessfully,
    isMaxFilesReached,
    isVesselLayout,
    hasError,
    isLinkInactive,
    isLinkNotFound,
    isLinkExpired,
    handlePasswordSubmit,
    handlePasswordModalClose,
    handleUploadSuccess,
  } = useReverseShareUpload({ alias: shareAlias });

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (isPasswordModalOpen) {
    return (
      <TransferShell
        direction="upload"
        title={t("publicTransfer.uploadTitle")}
        caption={t("publicTransfer.uploadCaption")}
        label={t("reverseShares.upload.layout.defaultTitle")}
      >
        <h2 className="font-display text-2xl font-bold">{t("reverseShares.upload.password.title")}</h2>
        <p className="mt-3 text-sm text-muted-foreground">{t("reverseShares.upload.password.description")}</p>
        <PasswordModal
          isOpen={isPasswordModalOpen}
          onSubmit={handlePasswordSubmit}
          onClose={handlePasswordModalClose}
        />
      </TransferShell>
    );
  }

  if (hasError) {
    return (
      <DefaultLayout
        reverseShare={reverseShare}
        password={currentPassword}
        alias={shareAlias}
        isMaxFilesReached={false}
        hasUploadedSuccessfully={false}
        onUploadSuccess={handleUploadSuccess}
        isLinkInactive={isLinkInactive}
        isLinkNotFound={isLinkNotFound}
        isLinkExpired={isLinkExpired}
      />
    );
  }

  if (isVesselLayout) {
    return (
      <VesselLayout
        reverseShare={reverseShare}
        password={currentPassword}
        alias={shareAlias}
        isMaxFilesReached={isMaxFilesReached}
        hasUploadedSuccessfully={hasUploadedSuccessfully}
        onUploadSuccess={handleUploadSuccess}
        isLinkInactive={false}
        isLinkNotFound={false}
        isLinkExpired={false}
      />
    );
  }

  return (
    <DefaultLayout
      reverseShare={reverseShare}
      password={currentPassword}
      alias={shareAlias}
      isMaxFilesReached={isMaxFilesReached}
      hasUploadedSuccessfully={hasUploadedSuccessfully}
      onUploadSuccess={handleUploadSuccess}
      isLinkInactive={false}
      isLinkNotFound={false}
      isLinkExpired={false}
    />
  );
}
