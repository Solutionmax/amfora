"use client";

import Link from "next/link";
import { IconAlertTriangle, IconCheck, IconClock, IconInfoCircle } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { AmphoraMark } from "@/components/brand/amphora-mark";
import { LanguageSwitcher } from "@/components/general/language-switcher";
import { ModeToggle } from "@/components/general/mode-toggle";
import { DefaultFooter } from "@/components/ui/default-footer";
import { useAppInfo } from "@/contexts/app-info-context";
import type { DefaultLayoutProps } from "../types";
import { FileUploadSection } from "./file-upload-section";
import { StatusMessage } from "./shared/status-message";

export function DefaultLayout({
  reverseShare,
  password,
  alias,
  isMaxFilesReached,
  hasUploadedSuccessfully,
  onUploadSuccess,
  isLinkInactive,
  isLinkNotFound,
  isLinkExpired,
}: DefaultLayoutProps) {
  const { appName, appLogo } = useAppInfo();
  const t = useTranslations();

  const getUploadStatus = () => {
    if (hasUploadedSuccessfully) {
      return {
        component: (
          <StatusMessage
            icon={IconCheck}
            title={t("reverseShares.upload.success.title")}
            description={t("reverseShares.upload.success.description")}
            variant="success"
          />
        ),
      };
    }

    if (isLinkInactive) {
      return {
        component: (
          <StatusMessage
            icon={IconAlertTriangle}
            title={t("reverseShares.upload.linkInactive.title")}
            description={t("reverseShares.upload.linkInactive.description")}
            additionalText={t("reverseShares.upload.linkInactive.contactOwner")}
            variant="error"
          />
        ),
      };
    }

    if (isLinkNotFound || !reverseShare) {
      return {
        component: (
          <StatusMessage
            icon={IconAlertTriangle}
            title={t("reverseShares.upload.linkNotFound.title")}
            description={t("reverseShares.upload.linkNotFound.description")}
            variant="neutral"
          />
        ),
      };
    }

    if (isLinkExpired) {
      return {
        component: (
          <StatusMessage
            icon={IconClock}
            title={t("reverseShares.upload.linkExpired.title")}
            description={t("reverseShares.upload.linkExpired.description")}
            additionalText={t("reverseShares.upload.linkExpired.contactOwner")}
            variant="info"
          />
        ),
      };
    }

    if (isMaxFilesReached) {
      return {
        component: (
          <StatusMessage
            icon={IconInfoCircle}
            title={t("reverseShares.upload.maxFilesReached.title")}
            description={t("reverseShares.upload.maxFilesReached.description", {
              maxFiles: reverseShare?.maxFiles || 0,
            })}
            additionalText={t("reverseShares.upload.maxFilesReached.contactOwner")}
            variant="warning"
          />
        ),
      };
    }

    return {
      component: (
        <FileUploadSection
          reverseShare={reverseShare}
          password={password}
          alias={alias}
          onUploadSuccess={onUploadSuccess}
        />
      ),
    };
  };

  const showUploadLimits =
    !hasUploadedSuccessfully &&
    !isMaxFilesReached &&
    !isLinkInactive &&
    !isLinkNotFound &&
    !isLinkExpired &&
    reverseShare &&
    (reverseShare.maxFiles || reverseShare.maxFileSize || reverseShare.allowedFileTypes);

  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      <div
        className="pointer-events-none absolute right-0 top-0 size-[30rem] rounded-full bg-primary/[0.05] blur-3xl"
        aria-hidden="true"
      />
      <header className="relative w-full border-b bg-background/95 px-6 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4">
          <Link className="flex min-w-0 items-center gap-2" href="/">
            {appLogo ? (
              <img alt="" className="h-8 w-8 shrink-0 rounded object-contain" src={appLogo} />
            ) : (
              <AmphoraMark className="h-8 w-8 shrink-0 text-primary" />
            )}
            <p className="truncate font-display text-xl font-bold tracking-tight">{appName}</p>
          </Link>
          <div className="flex shrink-0 items-center gap-2">
            <LanguageSwitcher />
            <ModeToggle />
          </div>
        </div>
      </header>

      {/* Conteúdo principal */}
      <main className="relative container mx-auto flex-1 px-4 py-8 md:px-6 md:py-12">
        <div className="mx-auto max-w-3xl space-y-8">
          {/* Header da página */}
          <div className="space-y-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">
              {t("reverseShares.pageTitle")}
            </p>
            <h1 className="break-words font-display text-4xl font-extrabold tracking-tight md:text-5xl">
              {reverseShare?.name || t("reverseShares.upload.layout.defaultTitle")}
            </h1>
            {reverseShare?.description && (
              <p className="max-w-2xl break-words leading-7 text-muted-foreground md:text-lg">
                {reverseShare.description}
              </p>
            )}
          </div>

          {/* Seção de upload */}
          <div className="rounded-[1.75rem] border bg-card p-6 shadow-sm md:p-8 lg:p-10">
            {getUploadStatus().component}
          </div>

          {/* Informações adicionais */}
          {showUploadLimits && (
            <div className="space-y-2 rounded-2xl border bg-secondary/35 p-5">
              <h3 className="text-sm font-medium text-foreground">{t("reverseShares.upload.layout.importantInfo")}</h3>
              <div className="text-xs text-muted-foreground space-y-1">
                {reverseShare?.maxFiles && (
                  <p>• {t("reverseShares.upload.layout.maxFiles", { count: reverseShare.maxFiles })}</p>
                )}
                {reverseShare?.maxFileSize && (
                  <p>• {t("reverseShares.upload.layout.maxFileSize", { size: reverseShare.maxFileSize })}</p>
                )}
                {reverseShare?.allowedFileTypes && (
                  <p>• {t("reverseShares.upload.layout.allowedTypes", { types: reverseShare.allowedFileTypes })}</p>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <DefaultFooter />
    </div>
  );
}
