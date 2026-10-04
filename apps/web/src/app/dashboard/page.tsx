"use client";

import { IconPlus, IconUpload } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { ProtectedRoute } from "@/components/auth/protected-route";
import { InlineError } from "@/components/files/inline-error";
import { GlobalDropZone } from "@/components/general/global-drop-zone";
import { linkStatus } from "@/components/general/share-tags";
import { FileManagerLayout } from "@/components/layout/file-manager-layout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { DashboardFacts } from "./components/dashboard-facts";
import { DashboardSkeleton } from "./components/dashboard-skeleton";
import { greetingKey } from "./components/greeting";
import { JustReceived } from "./components/just-received";
import { RecentFiles } from "./components/recent-files";
import { isOpenShare, RecentShares } from "./components/recent-shares";
import { StorageCard } from "./components/storage-card";
import { useDashboard } from "./hooks/use-dashboard";
import { DashboardModals } from "./modals/dashboard-modals";

export default function DashboardPage() {
  const t = useTranslations();
  const { user, isAdmin } = useAuth();

  const {
    isLoading,
    loadError,
    diskSpace,
    storageUsage,
    recentFiles,
    folderCount,
    recentShares,
    receiveLinks,
    modals,
    fileManager,
    shareManager,
    handleCopyLink,
    loadDashboardData,
  } = useDashboard({ withOwnStorage: isAdmin === false });
  // Administrators keep the whole disk as a plain figure; a user gets their own storage as a card.
  const ownStorage = isAdmin === false ? storageUsage : null;

  const downloads = recentFiles.reduce((sum: number, file: { downloads?: number }) => sum + (file.downloads ?? 0), 0);
  const activeShares = recentShares.filter(isOpenShare).length;
  const openLinks = (receiveLinks || []).filter((link) => {
    const status = linkStatus({ expiration: link.expiration, isActive: link.isActive });
    return status === "active" || status === "neverExpires";
  }).length;
  const received = receiveLinks ? receiveLinks.reduce((sum, link) => sum + (link.files?.length ?? 0), 0) : null;

  const renderContent = () => {
    if (isLoading) return <DashboardSkeleton />;
    if (loadError) return <InlineError message={loadError} onRetry={loadDashboardData} />;

    return (
      <>
        {ownStorage && <StorageCard usage={ownStorage} />}
        <DashboardFacts
          showStorage={!ownStorage}
          diskSpace={diskSpace}
          files={recentFiles.length}
          folders={folderCount}
          downloads={downloads}
          received={received}
          receiveLinks={receiveLinks?.length ?? 0}
        />
        <RecentFiles files={recentFiles} fileManager={fileManager} onUpload={modals.onOpenUploadModal} />
        <RecentShares
          shares={recentShares}
          onCopyLink={handleCopyLink}
          onCreateLink={shareManager.setShareToGenerateLink}
          onCreateShare={modals.onOpenCreateModal}
        />
        <JustReceived links={receiveLinks} />
      </>
    );
  };

  return (
    <ProtectedRoute>
      <GlobalDropZone onSuccess={loadDashboardData}>
        <FileManagerLayout
          title={t(`dashboard.greeting.${greetingKey(new Date().getHours())}`, { name: user?.firstName ?? "" })}
          subline={
            isLoading || loadError ? undefined : t("dashboard.calm.subline", { shares: activeShares, links: openLinks })
          }
          actions={
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={modals.onOpenUploadModal}>
                <IconUpload />
                {t("recentFiles.upload")}
              </Button>
              <Button onClick={modals.onOpenCreateModal}>
                <IconPlus />
                {t("dashboard.calm.newShare")}
              </Button>
            </div>
          }
        >
          {renderContent()}

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
