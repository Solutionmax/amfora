"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";

import { PublicShell, type PublicStory } from "@/components/brand/public-shell";
import { Countdown, type StageFact } from "@/components/brand/stage-shell";
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
  const alias = String(useParams()?.alias ?? "");
  const {
    isLoading,
    share,
    password,
    isPasswordModalOpen,
    isPasswordError,
    reason,
    groupName,
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

  const readyTitle = `${t("public.download.title", { count: itemCount })} ${t("public.download.accent")}`;
  const story: PublicStory = share
    ? {
        // The share's own name is a title, not a person: the organisation is the one sharing.
        eyebrow: share.name || undefined,
        sender: {
          name: appName,
          action: t("public.stage.shared"),
          line: Number.isNaN(sharedAt.getTime()) ? undefined : sharedAtFormat.format(sharedAt),
        },
        headline: share.description || readyTitle,
        title: readyTitle,
        facts,
      }
    : isPasswordModalOpen
      ? { headline: t("public.state.password.title"), text: t("public.state.password.text") }
      : reason === "groupSignIn"
        ? {
            headline: t("public.state.groupSignIn.title"),
            text: t("public.state.groupSignIn.text"),
            action: (
              <Button asChild size="lg">
                <Link href={`/login?next=${encodeURIComponent(`/s/${alias}`)}`}>
                  {t("public.state.groupSignIn.action")}
                </Link>
              </Button>
            ),
          }
        : {
            headline: t(`public.state.${reason}.title`),
            text:
              reason === "groupMember"
                ? t("public.state.groupMember.text", { group: groupName })
                : t(`public.state.${reason}.text`),
            action: (
              <Button asChild size="lg" variant="secondary">
                <Link href="/">{t("public.state.backHome")}</Link>
              </Button>
            ),
          };

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
    <PublicShell story={story} card={card} footnote={t("public.stage.sharedSecurely")}>
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
    </PublicShell>
  );
}
