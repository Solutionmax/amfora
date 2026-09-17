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

      <footer className="relative mx-auto flex w-full max-w-4xl items-end justify-between gap-6 px-6 pb-8">
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
