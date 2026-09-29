"use client";

import { useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";

import { Countdown, StageShell, StageStory, type StageFact } from "@/components/brand/stage-shell";
import { LoadingScreen } from "@/components/layout/loading-screen";
import { FilePreviewModal } from "@/components/modals/file-preview-modal";
import { Button } from "@/components/ui/button";
import { useAppInfo } from "@/contexts/app-info-context";
import { formatFileSize } from "@/utils/format-file-size";
import { PasswordModal } from "./components/password-modal";
import { ShareStage } from "./components/share-stage";
import { usePublicShare } from "./hooks/use-public-share";

export default function PublicSharePage() {
  const { appName } = useAppInfo();
  const t = useTranslations();
  const locale = useLocale();
  const {
    isLoading,
    share,
    password,
    isPasswordModalOpen,
    isPasswordError,
    reason,
    setPassword,
    handlePasswordSubmit,
    handleDownload,
    handleBulkDownload,
    folders,
    files,
  } = usePublicShare();
  const [previewFile, setPreviewFile] = useState<{
    name: string;
    objectName: string;
    type?: string;
    id?: string;
  } | null>(null);

  if (isLoading) {
    return <LoadingScreen />;
  }

  const itemCount = files.length + folders.length;
  const totalBytes = files.reduce((sum, file) => sum + Number(file.size || 0), 0);
  const senderName = share?.name || appName;

  const sharedAt = new Date(share?.createdAt ?? "");
  const sharedAtFormat = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
  const facts: StageFact[] = share
    ? [
        ...(share.expiration
          ? [{ label: t("public.stage.availableFor"), value: <Countdown until={share.expiration} />, wide: true }]
          : []),
        { label: t("public.stage.total"), value: formatFileSize(totalBytes) },
        { label: t("public.stage.files"), value: itemCount },
      ]
    : [];

  const story = share ? (
    <StageStory
      sender={{
        name: senderName,
        line: Number.isNaN(sharedAt.getTime())
          ? ""
          : t("public.stage.shared", { date: sharedAtFormat.format(sharedAt) }),
      }}
      headline={
        share.description || `${t("public.download.title", { count: itemCount })} ${t("public.download.accent")}`
      }
      facts={facts}
    />
  ) : isPasswordModalOpen ? (
    <StageStory headline={t("public.state.password.title")} text={t("public.state.password.text")} />
  ) : (
    <StageStory headline={t(`public.state.${reason}.title`)} text={t(`public.state.${reason}.text`)}>
      <Button asChild size="lg" variant="secondary">
        <Link href="/">{t("public.state.backHome")}</Link>
      </Button>
    </StageStory>
  );

  const card = share ? (
    <ShareStage
      files={files}
      folders={folders}
      hasPassword={share.security?.hasPassword}
      onDownload={handleDownload}
      onDownloadFolder={(folderId, folderName) => handleDownload(`folder:${folderId}`, folderName)}
      onBulkDownload={handleBulkDownload}
      onPreview={setPreviewFile}
    />
  ) : undefined;

  return (
    <StageShell story={story} card={card}>
      {previewFile && (
        <FilePreviewModal
          isOpen={!!previewFile}
          onClose={() => setPreviewFile(null)}
          file={previewFile}
          sharePassword={password || undefined}
        />
      )}
      <PasswordModal
        isError={isPasswordError}
        isOpen={isPasswordModalOpen}
        password={password}
        onPasswordChange={setPassword}
        onSubmit={handlePasswordSubmit}
      />
    </StageShell>
  );
}
