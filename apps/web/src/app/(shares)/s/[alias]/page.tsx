"use client";

import Link from "next/link";

import { AmphoraMark } from "@/components/brand/amphora-mark";
import { GithubStar } from "@/components/brand/github-star";
import { Maxim } from "@/components/brand/maxim";
import { LanguageSwitcher } from "@/components/general/language-switcher";
import { ModeToggle } from "@/components/general/mode-toggle";
import { LoadingScreen } from "@/components/layout/loading-screen";
import { useAppInfo } from "@/contexts/app-info-context";
import { PasswordModal } from "./components/password-modal";
import { ShareNotFound } from "./components/share-not-found";
import { ShareStage } from "./components/share-stage";
import { usePublicShare } from "./hooks/use-public-share";

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

  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      {/* No photo wallpaper here: the vessel is the picture. */}
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
        {!isPasswordModalOpen && !share && <ShareNotFound />}
        {share && (
          <ShareStage
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

      <footer className="relative flex items-end justify-between gap-6 px-6 pb-8 lg:px-16">
        <Maxim seed={share?.id ?? "amfora"} />
      </footer>

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
