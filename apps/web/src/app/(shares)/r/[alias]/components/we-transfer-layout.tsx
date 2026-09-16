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
import { MESSAGE_TYPES } from "../constants";
import { WeTransferLayoutProps } from "../types";
import { FileUploadSection } from "./file-upload-section";
import { WeTransferStatusMessage } from "./shared/status-message";

export function WeTransferLayout({
  reverseShare,
  password,
  alias,
  isMaxFilesReached,
  hasUploadedSuccessfully,
  onUploadSuccess,
  isLinkInactive,
  isLinkNotFound,
  isLinkExpired,
}: WeTransferLayoutProps) {
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
        <WeTransferStatusMessage
          type={MESSAGE_TYPES.SUCCESS}
          icon={IconCheck}
          titleKey="reverseShares.upload.success.title"
          descriptionKey="reverseShares.upload.success.description"
        />
      );
    }

    if (isLinkInactive) {
      return (
        <WeTransferStatusMessage
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
        <WeTransferStatusMessage
          type={MESSAGE_TYPES.NOT_FOUND}
          icon={IconAlertTriangle}
          titleKey="reverseShares.upload.linkNotFound.title"
          descriptionKey="reverseShares.upload.linkNotFound.description"
        />
      );
    }

    if (isLinkExpired) {
      return (
        <WeTransferStatusMessage
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
        <WeTransferStatusMessage
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
    <div className="relative flex min-h-screen flex-col bg-background">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[70vh] bg-[radial-gradient(60%_60%_at_50%_0%,var(--secondary)_0%,transparent_70%)]"
        aria-hidden="true"
      />

      <header className="relative flex items-center justify-between px-6 py-5">
        <Link href="/" className="flex items-center gap-2.5">
          {appLogo ? (
            <img alt="" className="h-8 w-8 rounded object-contain" src={appLogo} />
          ) : (
            <AmphoraMark className="h-8 w-8 text-primary" />
          )}
          <span className="font-display text-xl font-bold tracking-tight">{appName}</span>
        </Link>
        <div className="flex items-center gap-2">
          <GithubStar className="hidden sm:inline-flex" />
          <LanguageSwitcher />
          <ModeToggle />
        </div>
      </header>

      <main className="relative flex-1 px-4 pb-6 lg:px-6">
        <Stage
          object={<Vessel level={level} strata={filled.count} sealed={hasUploadedSuccessfully} className="w-full" />}
          caption={hasUploadedSuccessfully ? t("share.sealed") : t("share.itemCount", { count: filled.count })}
        >
          <h1 className="font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl">
            {reverseShare?.name || t("reverseShares.upload.layout.defaultTitle")}
          </h1>
          {reverseShare?.description && (
            <p className="mt-3 max-w-md text-muted-foreground">{reverseShare.description}</p>
          )}

          <div className="mt-8">{uploadSection()}</div>
        </Stage>
      </main>

      <footer className="relative px-6 pb-8 lg:px-16">
        <Maxim seed={alias ?? "amfora"} />
      </footer>
    </div>
  );
}
