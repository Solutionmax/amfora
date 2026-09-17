"use client";

import { useTranslations } from "next-intl";

import { TransferShell } from "@/components/brand/transfer-shell";
import { LoadingScreen } from "@/components/layout/loading-screen";
import { useAppInfo } from "@/contexts/app-info-context";
import { PasswordModal } from "./components/password-modal";
import { ShareNotFound } from "./components/share-not-found";
import { ShareStage } from "./components/share-stage";
import { usePublicShare } from "./hooks/use-public-share";

export default function PublicSharePage() {
  const { appName } = useAppInfo();
  const t = useTranslations();
  const {
    isLoading,
    share,
    password,
    isPasswordModalOpen,
    isPasswordError,
    setPassword,
    handlePasswordSubmit,
    handleDownload,
    handleBulkDownload,
    folders,
    files,
  } = usePublicShare();

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <TransferShell
      direction="download"
      title={t("publicTransfer.downloadTitle")}
      caption={t("publicTransfer.downloadCaption")}
      label={t("share.download")}
    >
      {!isPasswordModalOpen && !share && <ShareNotFound />}
      {share && (
        <ShareStage
          name={share.name || appName}
          description={share.description}
          expiration={share.expiration}
          views={share.views}
          maxViews={share.security?.maxViews}
          files={files}
          folders={folders}
          onDownload={handleDownload}
          onDownloadFolder={(folderId, folderName) => handleDownload(`folder:${folderId}`, folderName)}
          onBulkDownload={handleBulkDownload}
        />
      )}
      <PasswordModal
        isError={isPasswordError}
        isOpen={isPasswordModalOpen}
        password={password}
        onPasswordChange={setPassword}
        onSubmit={handlePasswordSubmit}
      />
    </TransferShell>
  );
}
