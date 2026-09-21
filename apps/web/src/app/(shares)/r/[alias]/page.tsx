"use client";

import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";

import { Statement } from "@/components/brand/statement";
import { TransferShell } from "@/components/brand/transfer-shell";
import { LoadingScreen } from "@/components/layout/loading-screen";
import { DefaultLayout, PasswordModal } from "./components";
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
        statement={<Statement title={t("public.state.password.title")} quote={t("public.state.password.text")} />}
      >
        <div className="px-6 py-8">
          <h2 className="font-display text-xl font-semibold">{t("reverseShares.upload.password.title")}</h2>
          <p className="mt-2 text-sm text-ink-3">{t("reverseShares.upload.password.description")}</p>
        </div>
        <PasswordModal
          isOpen={isPasswordModalOpen}
          onSubmit={handlePasswordSubmit}
          onClose={handlePasswordModalClose}
        />
      </TransferShell>
    );
  }

  return (
    <DefaultLayout
      reverseShare={reverseShare}
      password={currentPassword}
      alias={shareAlias}
      isMaxFilesReached={hasError ? false : isMaxFilesReached}
      hasUploadedSuccessfully={hasError ? false : hasUploadedSuccessfully}
      onUploadSuccess={handleUploadSuccess}
      isLinkInactive={hasError && isLinkInactive}
      isLinkNotFound={hasError && isLinkNotFound}
      isLinkExpired={hasError && isLinkExpired}
    />
  );
}
