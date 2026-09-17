"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { IconAlertTriangle, IconCheck, IconClock, IconInfoCircle } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { AmphoraMark } from "@/components/brand/amphora-mark";
import { GithubStar } from "@/components/brand/github-star";
import { Maxim } from "@/components/brand/maxim";
import { Stage } from "@/components/brand/stage";
import { Vessel } from "@/components/brand/vessel";
import { LanguageSwitcher } from "@/components/general/language-switcher";
import { ModeToggle } from "@/components/general/mode-toggle";
import { useAppInfo } from "@/contexts/app-info-context";
import { formatFileSize } from "@/utils/format-file-size";
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
  const { appName, appLogo } = useAppInfo();
  const [filled, setFilled] = useState({ count: 0, bytes: 0 });

  // Every file you add raises the level in the vessel next to the form.
  const handleFilesChange = useCallback((count: number, bytes: number) => {
    setFilled({ count, bytes });
  }, []);

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
        onFilesChange={handleFilesChange}
      />
    );
  };

  const maxFiles = reverseShare?.maxFiles ?? 0;
  const level = hasUploadedSuccessfully ? 1 : Math.min(filled.count / (maxFiles > 0 ? maxFiles : 6), 1);

  return (
    <div className="relative flex min-h-screen flex-col bg-muted/20">
      <div
        className="pointer-events-none absolute right-0 top-0 size-[30rem] rounded-full bg-primary/[0.05] blur-3xl"
        aria-hidden="true"
      />

      <header className="relative border-b bg-background/80 px-4 py-3 backdrop-blur sm:px-6 sm:py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <Link href="/" className="flex min-w-0 items-center gap-2.5">
            {appLogo ? (
              <img alt="" className="h-8 w-8 shrink-0 rounded object-contain" src={appLogo} />
            ) : (
              <AmphoraMark className="h-8 w-8 shrink-0 text-primary" />
            )}
            <span className="truncate font-display text-xl font-bold tracking-tight">{appName}</span>
          </Link>
          <div className="flex shrink-0 items-center gap-2">
            <GithubStar className="hidden sm:inline-flex" />
            <LanguageSwitcher />
            <ModeToggle />
          </div>
        </div>
      </header>

      <main className="relative mx-auto flex w-full max-w-4xl flex-1 items-start px-4 py-6 sm:py-8 lg:py-10">
        <Stage
          object={
            <Vessel
              level={level}
              strata={filled.count}
              sealed={hasUploadedSuccessfully}
              className="h-10 w-9 opacity-90"
            />
          }
          caption={hasUploadedSuccessfully ? t("share.sealed") : t("share.itemCount", { count: filled.count })}
        >
          <div className="sm:grid sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end sm:gap-8">
            <div className="min-w-0">
              <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-primary">
                <IconInfoCircle className="size-4" />
                {t("reverseShares.pageTitle")}
              </p>
              <h1 className="mt-3 break-words font-display text-3xl font-extrabold leading-[1.05] tracking-tight sm:text-4xl">
                {reverseShare?.name || t("reverseShares.upload.layout.defaultTitle")}
              </h1>
              {reverseShare?.description && (
                <p className="mt-3 max-w-2xl break-words leading-7 text-muted-foreground">{reverseShare.description}</p>
              )}
            </div>

            {!hasUploadedSuccessfully && reverseShare && (
              <dl className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-xl border bg-border font-mono text-xs sm:mt-0 sm:w-56">
                <div className="bg-background px-3 py-2.5">
                  <dt className="text-muted-foreground">{t("reverseShares.labels.filesReceived")}</dt>
                  <dd className="mt-1 text-sm text-foreground">
                    {reverseShare.currentFileCount}
                    {maxFiles ? ` / ${maxFiles}` : ""}
                  </dd>
                </div>
                <div className="bg-background px-3 py-2.5">
                  <dt className="text-muted-foreground">{t("reverseShares.labels.maxFileSize")}</dt>
                  <dd className="mt-1 text-sm text-foreground">
                    {reverseShare.maxFileSize
                      ? formatFileSize(reverseShare.maxFileSize)
                      : t("reverseShares.labels.noSizeLimit")}
                  </dd>
                </div>
              </dl>
            )}
          </div>

          <div className="mt-7">{uploadSection()}</div>
        </Stage>
      </main>

      <footer className="relative mx-auto w-full max-w-4xl px-6 pb-8">
        <Maxim seed={alias ?? "amfora"} />
      </footer>
    </div>
  );
}
