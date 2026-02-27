"use client";

import { useParams } from "next/navigation";

import { LoadingScreen } from "@/components/layout/loading-screen";
import { DefaultLayout, PasswordModal, WeTransferLayout } from "./components";
import { useReverseShareUpload } from "./hooks/use-reverse-share-upload";

export default function ReverseShareUploadPage() {
  const params = useParams();
  const shareAlias = params?.alias as string;

  const {
    reverseShare,
    currentPassword,
    isLoading,
    isPasswordModalOpen,
    hasUploadedSuccessfully,
    isMaxFilesReached,
    isWeTransferLayout,
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
      <PasswordModal isOpen={isPasswordModalOpen} onSubmit={handlePasswordSubmit} onClose={handlePasswordModalClose} />
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

  if (isWeTransferLayout) {
    return (
      <WeTransferLayout
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
