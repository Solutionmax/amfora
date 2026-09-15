"use client";

import { IconCloudUpload, IconPlus } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { ProtectedRoute } from "@/components/auth/protected-route";
import { GlobalDropZone } from "@/components/general/global-drop-zone";
import { FileManagerLayout } from "@/components/layout/file-manager-layout";
import { LoadingScreen } from "@/components/layout/loading-screen";
import { Button } from "@/components/ui/button";
import { RecentFiles } from "./components/recent-files";
import { RecentShares } from "./components/recent-shares";
import { useDashboard } from "./hooks/use-dashboard";
import { DashboardModals } from "./modals/dashboard-modals";

export default function DashboardPage() {
  const t = useTranslations();

  const {
    isLoading,

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
          <div className="flex flex-col gap-6">
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
