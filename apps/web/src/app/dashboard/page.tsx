"use client";

import { IconCloudUpload, IconPlus } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { ProtectedRoute } from "@/components/auth/protected-route";
import { GlobalDropZone } from "@/components/general/global-drop-zone";
import { FileManagerLayout } from "@/components/layout/file-manager-layout";
import { LoadingScreen } from "@/components/layout/loading-screen";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { QuickAccessCards } from "./components/quick-access-cards";
import { RecentFiles } from "./components/recent-files";
import { RecentShares } from "./components/recent-shares";
import { StorageUsage } from "./components/storage-usage";
import { useDashboard } from "./hooks/use-dashboard";
import { DashboardModals } from "./modals/dashboard-modals";

export default function DashboardPage() {
  const t = useTranslations();
  const { user } = useAuth();

  const {
    isLoading,
    diskSpace,
    diskSpaceError,

    recentFiles,
    recentShares,
    modals,
    fileManager,
    shareManager,
    handleCopyLink,
    loadDashboardData,
  } = useDashboard();

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <ProtectedRoute>
      <GlobalDropZone onSuccess={loadDashboardData}>
        <FileManagerLayout
          title={t("dashboard.pageTitle")}
          actions={
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={modals.onOpenUploadModal}>
                <IconCloudUpload className="size-4" />
                {t("recentFiles.upload")}
              </Button>
              <Button onClick={modals.onOpenCreateModal}>
                <IconPlus className="size-4" />
                {t("recentShares.createShare")}
              </Button>
            </div>
          }
        >
          <div className="flex flex-col gap-8">
            <section className="relative isolate overflow-hidden rounded-3xl bg-[#071827] px-6 py-8 text-white sm:px-9 sm:py-10">
              <img
                src="/art/amfora-glass.webp"
                alt=""
                className="pointer-events-none absolute inset-y-0 end-0 -z-10 h-full w-[45%] object-cover object-center opacity-45 [mask-image:linear-gradient(to_right,transparent,black)]"
              />
              <div className="max-w-[70%]">
                <p className="mb-3 text-xs font-medium uppercase tracking-[0.18em] text-sky-300">{user?.firstName}</p>
                <h2 className="whitespace-pre-line font-display text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
                  {t("publicTransfer.uploadTitle")}
                </h2>
                <p className="mt-3 max-w-md text-sm leading-relaxed text-slate-300">
                  {t("publicTransfer.uploadCaption")}
                </p>
              </div>
            </section>
            <QuickAccessCards />
            <div className="w-full">
              <StorageUsage diskSpace={diskSpace} diskSpaceError={diskSpaceError} onRetry={loadDashboardData} />
            </div>

            <RecentFiles
              fileManager={fileManager}
              files={recentFiles}
              isUploadModalOpen={modals.isUploadModalOpen}
              onOpenUploadModal={modals.onOpenUploadModal}
            />

            <RecentShares
              isCreateModalOpen={modals.isCreateModalOpen}
              shareManager={shareManager}
              shares={recentShares}
              onCopyLink={handleCopyLink}
              onOpenCreateModal={modals.onOpenCreateModal}
            />
          </div>

          <DashboardModals
            fileManager={fileManager}
            modals={modals}
            shareManager={shareManager}
            onSuccess={loadDashboardData}
          />
        </FileManagerLayout>
      </GlobalDropZone>
    </ProtectedRoute>
  );
}
