"use client";

import { IconCloudUpload, IconPlus } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { ProtectedRoute } from "@/components/auth/protected-route";
import { GlobalDropZone } from "@/components/general/global-drop-zone";
import { FileManagerLayout } from "@/components/layout/file-manager-layout";
import { LoadingScreen } from "@/components/layout/loading-screen";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { greetingKey } from "./components/greeting";
import { HeroTiles } from "./components/hero-tiles";
import { RecentFiles } from "./components/recent-files";
import { RecentShares } from "./components/recent-shares";
import { StatsStrip } from "./components/stats-strip";
import { useDashboard } from "./hooks/use-dashboard";
import { DashboardModals } from "./modals/dashboard-modals";

export default function DashboardPage() {
  const t = useTranslations();
  const { user } = useAuth();

  const {
    isLoading,
    diskSpace,

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

  const downloads = recentFiles.reduce((sum: number, file: { downloads?: number }) => sum + (file.downloads ?? 0), 0);

  return (
    <ProtectedRoute>
      <GlobalDropZone onSuccess={loadDashboardData}>
        <FileManagerLayout
          title={t(`dashboard.greeting.${greetingKey(new Date().getHours())}`, { name: user?.firstName ?? "" })}
          subline={t("dashboard.subline", { shares: recentShares.length, files: recentFiles.length })}
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
            <HeroTiles onCreateShare={modals.onOpenCreateModal} />
            <StatsStrip
              diskSpace={diskSpace}
              shares={recentShares.length}
              downloads={downloads}
              files={recentFiles.length}
            />

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
