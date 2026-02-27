"use client";

import { useEffect, useState } from "react";
import { IconAlertTriangle, IconCheck, IconClock, IconInfoCircle } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { LanguageSwitcher } from "@/components/general/language-switcher";
import { ModeToggle } from "@/components/general/mode-toggle";
import { BACKGROUND_IMAGES, MESSAGE_TYPES } from "../constants";
import { WeTransferLayoutProps } from "../types";
import { FileUploadSection } from "./file-upload-section";
import { WeTransferStatusMessage } from "./shared/status-message";
import { TransparentFooter } from "./transparent-footer";

const getRandomBackgroundImage = (): string => {
  const randomIndex = Math.floor(Math.random() * BACKGROUND_IMAGES.length);
  return BACKGROUND_IMAGES[randomIndex];
};

const useBackgroundImage = () => {
  const [selectedImage, setSelectedImage] = useState<string>("");
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    setSelectedImage(getRandomBackgroundImage());
  }, []);

  useEffect(() => {
    if (!selectedImage) return;

    const img = new Image();
    img.onload = () => setImageLoaded(true);
    img.onerror = () => {
      console.error("Error loading background image:", selectedImage);
      setImageLoaded(true);
    };
    img.src = selectedImage;
  }, [selectedImage]);

  return { selectedImage, imageLoaded };
};

const HeaderControls = () => (
  <div className="absolute top-4 right-4 md:top-6 md:right-6 z-40 flex items-center gap-2">
    <div className="bg-white/10 dark:bg-black/20 backdrop-blur-xs border border-white/20 dark:border-white/10 rounded-lg p-1">
      <LanguageSwitcher />
    </div>
    <div className="bg-white/10 dark:bg-black/20 backdrop-blur-xs border border-white/20 dark:border-white/10 rounded-lg p-1">
      <ModeToggle />
    </div>
  </div>
);

const BackgroundLayer = ({ selectedImage, imageLoaded }: { selectedImage: string; imageLoaded: boolean }) => (
  <>
    <div className="absolute inset-0 z-0 bg-background" />
    {imageLoaded && selectedImage && (
      <div
        className="absolute inset-0 z-10"
        style={{
          backgroundImage: `url(${selectedImage})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      />
    )}
    <div className="absolute inset-0 bg-black/40 z-20" />
  </>
);

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
  const { selectedImage, imageLoaded } = useBackgroundImage();
  const t = useTranslations();

  const getUploadSectionContent = () => {
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
    <div className="min-h-screen relative overflow-hidden">
      <BackgroundLayer selectedImage={selectedImage} imageLoaded={imageLoaded} />
      <HeaderControls />

      {!imageLoaded && (
        <div className="absolute inset-0 z-30 flex items-center justify-center">
          <div className="animate-pulse text-white/70 text-sm">{t("reverseShares.upload.layout.loading")}</div>
        </div>
      )}

      <div className="relative z-30 min-h-screen flex items-center justify-start p-4 md:p-8 lg:p-12 xl:p-16">
        <div className="w-full max-w-md lg:max-w-lg xl:max-w-xl">
          <div className="bg-white dark:bg-black rounded-2xl shadow-2xl p-6 md:p-8 backdrop-blur-sm border border-white/20">
            <div className="text-left mb-6 md:mb-8">
              <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {reverseShare?.name || t("reverseShares.upload.layout.defaultTitle")}
              </h1>
              {reverseShare?.description && (
                <p className="text-gray-600 dark:text-gray-300 text-sm md:text-base">{reverseShare.description}</p>
              )}
            </div>

            {getUploadSectionContent()}
          </div>
        </div>
      </div>

      <TransparentFooter />
    </div>
  );
}
