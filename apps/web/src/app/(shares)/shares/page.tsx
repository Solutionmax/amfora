"use client";

import { useTranslations } from "next-intl";

import { ProtectedRoute } from "@/components/auth/protected-route";
import { FileManagerLayout } from "@/components/layout/file-manager-layout";
import { LoadingScreen } from "@/components/layout/loading-screen";
import { Card, CardContent } from "@/components/ui/card";
import { useDisclosure } from "@/hooks/use-disclosure";
import { useEnhancedFileManager } from "@/hooks/use-enhanced-file-manager";
import { useShareManager } from "@/hooks/use-share-manager";
import { SharesModals } from "./components/shares-modals";
import { SharesSearch } from "./components/shares-search";
import { SharesTableContainer } from "./components/shares-table-container";
import { useShares } from "./hooks/use-shares";

export default function SharesPage() {
  const t = useTranslations();
  const {
    shares,
    isLoading,
    searchQuery,
    setSearchQuery,
    filteredShares,
    shareToGenerateLink,
    handleCopyLink,
    loadShares,
    setShareToGenerateLink,
    smtpEnabled,
  } = useShares();

  const { isOpen: isCreateModalOpen, onOpen: onOpenCreateModal, onClose: onCloseCreateModal } = useDisclosure();
  const shareManager = useShareManager(loadShares);
  const fileManager = useEnhancedFileManager(loadShares);

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <ProtectedRoute>
      <FileManagerLayout title={t("shares.pageTitle")}>
        <Card>
          <CardContent>
            <div className="flex flex-col gap-6">
              <SharesSearch
                filteredCount={filteredShares.length}
                searchQuery={searchQuery}
                totalShares={shares.length}
                onCreateShare={onOpenCreateModal}
                onSearchChange={setSearchQuery}
              />

              <SharesTableContainer
                shareManager={shareManager}
                shares={filteredShares}
                onCopyLink={handleCopyLink}
                onCreateShare={onOpenCreateModal}
              />
            </div>
          </CardContent>
        </Card>

        <SharesModals
          isCreateModalOpen={isCreateModalOpen}
          shareManager={shareManager}
          fileManager={fileManager}
          shareToGenerateLink={shareToGenerateLink}
          shareToViewDetails={shareManager.shareToViewDetails}
          smtpEnabled={smtpEnabled}
          onCloseCreateModal={onCloseCreateModal}
          onCloseGenerateLink={() => setShareToGenerateLink(null)}
          onCloseViewDetails={() => shareManager.setShareToViewDetails(null)}
          onSuccess={loadShares}
        />
      </FileManagerLayout>
    </ProtectedRoute>
  );
}
