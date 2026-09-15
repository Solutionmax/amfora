"use client";

import { useTranslations } from "next-intl";

import { ProtectedRoute } from "@/components/auth/protected-route";
import { FileManagerLayout } from "@/components/layout/file-manager-layout";
import { LoadingScreen } from "@/components/layout/loading-screen";
import { Card, CardContent } from "@/components/ui/card";
import { ReverseSharesCardsContainer } from "./components/reverse-shares-cards-container";
import { ReverseSharesModals } from "./components/reverse-shares-modals";
import { ReverseSharesSearch } from "./components/reverse-shares-search";
import { useReverseShares } from "./hooks/use-reverse-shares";

export default function ReverseSharesPage() {
  const t = useTranslations();
  const {
    reverseShares,
    isLoading,
    searchQuery,
    setSearchQuery,
    filteredReverseShares,
    reverseShareToViewDetails,
    reverseShareToGenerateLink,
    reverseShareToDelete,
    reverseShareToEdit,
    reverseShareToViewFiles,
    reverseShareToViewQrCode,
    isDeleting,
    isCreateModalOpen,
    isCreating,
    isUpdating,
    setIsCreateModalOpen,
    handleCopyLink,
    handleDeleteReverseShare,
    handleCreateReverseShare,
    handleUpdateReverseShare,
    setReverseShareToViewDetails,
    setReverseShareToGenerateLink,
    setReverseShareToDelete,
    setReverseShareToEdit,
    setReverseShareToViewFiles,
    setReverseShareToViewQrCode,
    handleCreateAlias,
    handleUpdatePassword,
    handleUpdateReverseShareData,
    handleToggleActive,
    loadReverseShares,
    refreshReverseShare,
  } = useReverseShares();

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <ProtectedRoute>
      <FileManagerLayout title={t("reverseShares.pageTitle")}>
        <Card>
          <CardContent>
            <div className="flex flex-col gap-6">
              <ReverseSharesSearch
                filteredCount={filteredReverseShares.length}
                searchQuery={searchQuery}
                totalReverseShares={reverseShares.length}
                onCreateReverseShare={() => setIsCreateModalOpen(true)}
                onSearchChange={setSearchQuery}
                onRefresh={loadReverseShares}
                isRefreshing={isLoading}
              />

              <ReverseSharesCardsContainer
                reverseShares={filteredReverseShares}
                onCopyLink={handleCopyLink}
                onDelete={setReverseShareToDelete}
                onEdit={setReverseShareToEdit}
                onGenerateLink={setReverseShareToGenerateLink}
                onViewDetails={setReverseShareToViewDetails}
                onViewFiles={setReverseShareToViewFiles}
                onViewQrCode={setReverseShareToViewQrCode}
                onCreateReverseShare={() => setIsCreateModalOpen(true)}
                onUpdateReverseShare={handleUpdateReverseShareData}
                onToggleActive={handleToggleActive}
                onUpdatePassword={handleUpdatePassword}
              />
            </div>
          </CardContent>
        </Card>

        <ReverseSharesModals
          isCreateModalOpen={isCreateModalOpen}
          onCloseCreateModal={() => setIsCreateModalOpen(false)}
          onCreateReverseShare={handleCreateReverseShare}
          isCreating={isCreating}
          reverseShareToEdit={reverseShareToEdit}
          onCloseEditModal={() => setReverseShareToEdit(null)}
          onUpdateReverseShare={handleUpdateReverseShare}
          isUpdating={isUpdating}
          reverseShareToGenerateLink={reverseShareToGenerateLink}
          reverseShareToViewDetails={reverseShareToViewDetails}
          reverseShareToDelete={reverseShareToDelete}
          reverseShareToViewFiles={reverseShareToViewFiles}
          reverseShareToViewQrCode={reverseShareToViewQrCode}
          isDeleting={isDeleting}
          onCloseGenerateLink={() => setReverseShareToGenerateLink(null)}
          onCloseViewDetails={() => setReverseShareToViewDetails(null)}
          onCloseDeleteModal={() => setReverseShareToDelete(null)}
          onCloseViewFiles={() => setReverseShareToViewFiles(null)}
          onCloseViewQrCode={() => setReverseShareToViewQrCode(null)}
          onConfirmDelete={handleDeleteReverseShare}
          onCreateAlias={handleCreateAlias}
          onCopyLink={handleCopyLink}
          onViewQrCode={setReverseShareToViewQrCode}
          onUpdateReverseShareData={handleUpdateReverseShareData}
          onUpdatePassword={handleUpdatePassword}
          onToggleActive={handleToggleActive}
          onRefreshData={loadReverseShares}
          refreshReverseShare={refreshReverseShare}
        />
      </FileManagerLayout>
    </ProtectedRoute>
  );
}
