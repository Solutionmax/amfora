"use client";

import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";

import { PublicShell } from "@/components/brand/public-shell";
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
      <PublicShell
        story={{ headline: t("public.state.password.title"), text: t("public.state.password.text") }}
        card={
          <div className="px-6 py-8">
            <p className="text-sm text-ink-3">{t("reverseShares.upload.password.description")}</p>
          </div>
        }
      >
        <PasswordModal
          isOpen={isPasswordModalOpen}
          onSubmit={handlePasswordSubmit}
          onClose={handlePasswordModalClose}
        />
      </PublicShell>
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
