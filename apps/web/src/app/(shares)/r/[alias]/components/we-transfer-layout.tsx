"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { IconAlertTriangle, IconCheck, IconClock, IconInfoCircle } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { AmphoraMark } from "@/components/brand/amphora-mark";
import { GithubStar } from "@/components/brand/github-star";
import { Maxim } from "@/components/brand/maxim";
import { LanguageSwitcher } from "@/components/general/language-switcher";
import { ModeToggle } from "@/components/general/mode-toggle";
import { useAppInfo } from "@/contexts/app-info-context";
import { BACKGROUND_IMAGES, MESSAGE_TYPES } from "../constants";
import { WeTransferLayoutProps } from "../types";
import { FileUploadSection } from "./file-upload-section";
import { WeTransferStatusMessage } from "./shared/status-message";

/** Same artwork rotation as the download page, picked from the alias so a link keeps its look. */
function artworkFor(alias: string) {
  let sum = 0;
  for (const char of alias ?? "") sum += char.charCodeAt(0);
  return BACKGROUND_IMAGES[sum % BACKGROUND_IMAGES.length];
}

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
  const [artwork, setArtwork] = useState<string>(BACKGROUND_IMAGES[0]);

  useEffect(() => {
    setArtwork(artworkFor(alias));
  }, [alias]);

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
      />
    );
  };

  return (
    <div className="relative min-h-screen">
      <div className="fixed inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${artwork})` }} aria-hidden />
      <div
        className="fixed inset-0 bg-gradient-to-br from-background/80 via-background/40 to-transparent"
        aria-hidden
      />

      <div className="relative flex min-h-screen flex-col">
        <header className="flex items-center justify-between px-6 py-5">
          <Link href="/" className="flex items-center gap-2.5">
            {appLogo ? (
              <img alt="" className="h-8 w-8 rounded object-contain" src={appLogo} />
            ) : (
              <AmphoraMark className="h-8 w-8 text-primary" />
            )}
            <span className="font-display text-xl font-bold tracking-tight">{appName}</span>
          </Link>
          <div className="flex items-center gap-2">
            <GithubStar tone="light" className="hidden bg-foreground/20 backdrop-blur-sm sm:inline-flex" />
            <LanguageSwitcher />
            <ModeToggle />
          </div>
        </header>

        <main className="flex flex-1 items-center px-6 pb-16 lg:px-16">
          <div className="w-full max-w-[460px] rounded-[1.75rem] border bg-card p-7 shadow-[0_30px_80px_-40px_rgba(14,32,54,0.6)]">
            <h1 className="font-display text-2xl font-extrabold leading-tight tracking-tight">
              {reverseShare?.name || t("reverseShares.upload.layout.defaultTitle")}
            </h1>
            {reverseShare?.description && (
              <p className="mt-1 text-sm text-muted-foreground">{reverseShare.description}</p>
            )}

            <div className="mt-6">{uploadSection()}</div>
          </div>
        </main>

        <footer className="px-6 pb-8 lg:px-16">
          <Maxim seed={alias ?? "amfora"} />
        </footer>
      </div>
    </div>
  );
}
