"use client";

import Link from "next/link";

import { AmphoraMark } from "@/components/brand/amphora-mark";
import { Maxim } from "@/components/brand/maxim";
import { LanguageSwitcher } from "@/components/general/language-switcher";
import { ModeToggle } from "@/components/general/mode-toggle";
import { LoadingScreen } from "@/components/layout/loading-screen";
import { useAppInfo } from "@/contexts/app-info-context";
import { PasswordModal } from "./components/password-modal";
import { ShareNotFound } from "./components/share-not-found";
import { SharePanel } from "./components/share-panel";
import { usePublicShare } from "./hooks/use-public-share";

// Every share gets one of these, picked from its alias so the same link always looks the same.
const ARTWORK = ["/art/sea.jpg", "/art/terrace.jpg", "/art/wall.jpg", "/art/vault.jpg"];

function artworkFor(alias: string) {
  let sum = 0;
  for (const char of alias) sum += char.charCodeAt(0);
  return ARTWORK[sum % ARTWORK.length];
}

export default function PublicSharePage() {
  const { appName, appLogo } = useAppInfo();
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

  const artwork = artworkFor(share?.id ?? "amfora");

  return (
    <div className="relative min-h-screen">
      <div
        className="fixed inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${artwork})` }}
        aria-hidden="true"
      />
      <div
        className="fixed inset-0 bg-gradient-to-br from-background/80 via-background/40 to-transparent"
        aria-hidden="true"
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
          <div className="flex items-center gap-1">
            <LanguageSwitcher />
            <ModeToggle />
          </div>
        </header>

        <main className="flex flex-1 items-center px-6 pb-16 lg:px-16">
          {!isPasswordModalOpen && !share && <ShareNotFound />}
          {share && (
            <SharePanel
              name={share.name || appName}
              description={share.description}
              expiration={share.expiration}
              views={share.views}
              maxViews={share.security?.maxViews}
              files={files}
              folders={folders}
              onDownload={handleDownload}
              onDownloadFolder={(folderId, folderName) => handleDownload(`folder:${folderId}`, folderName)}
              onBulkDownload={handleBulkDownload}
            />
          )}
        </main>

        <footer className="px-6 pb-8 lg:px-16">
          <Maxim seed={share?.id ?? "amfora"} />
        </footer>
      </div>

      <PasswordModal
        isError={isPasswordError}
        isOpen={isPasswordModalOpen}
        password={password}
        onPasswordChange={setPassword}
        onSubmit={handlePasswordSubmit}
      />
    </div>
  );
}
