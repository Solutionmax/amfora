"use client";

import { IconLock } from "@tabler/icons-react";
import { format } from "date-fns";
import { useTranslations } from "next-intl";

import { Chip, Statement } from "@/components/brand/statement";
import { TransferShell } from "@/components/brand/transfer-shell";
import { LoadingScreen } from "@/components/layout/loading-screen";
import { useAppInfo } from "@/contexts/app-info-context";
import { formatFileSize } from "@/utils/format-file-size";
import { PasswordModal } from "./components/password-modal";
import { ShareNotFound } from "./components/share-not-found";
import { ShareStage } from "./components/share-stage";
import { usePublicShare } from "./hooks/use-public-share";

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

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

  const itemCount = files.length + folders.length;
  const totalBytes = files.reduce((sum, file) => sum + Number(file.size || 0), 0);
  const senderName = share?.name || appName;

  const statement = share ? (
    <Statement
      title={t("public.download.title", { count: itemCount })}
      accentLine={t("public.download.accent")}
      quote={share.description || undefined}
      chips={
        <>
          {share.security?.hasPassword && <Chip icon={<IconLock />}>{t("public.download.passwordVerified")}</Chip>}
          {share.expiration && (
            <Chip>{t("public.download.expires", { date: format(new Date(share.expiration), "d MMM") })}</Chip>
          )}
          <Chip>{formatFileSize(totalBytes)}</Chip>
        </>
      }
    >
      <div className="order-first flex items-center gap-3">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-surface font-display text-base font-semibold text-primary shadow-[0_1px_0_var(--line),0_8px_20px_-10px_rgba(12,22,38,.35)]">
          {initials(senderName) || "A"}
        </span>
        <span className="min-w-0">
          <b className="block truncate text-[15px] font-semibold">{senderName}</b>
          <span className="block text-[13px] text-ink-3">{t("public.download.via", { app: appName })}</span>
        </span>
      </div>
    </Statement>
  ) : isPasswordModalOpen ? (
    <Statement title={t("public.state.password.title")} quote={t("public.state.password.text")} />
  ) : (
    <Statement title={t("public.state.missing.title")} quote={t("public.state.missing.text")} />
  );

  return (
    <TransferShell statement={statement}>
      {!isPasswordModalOpen && !share && <ShareNotFound />}
      {share && (
        <ShareStage
          files={files}
          folders={folders}
          views={share.views}
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
