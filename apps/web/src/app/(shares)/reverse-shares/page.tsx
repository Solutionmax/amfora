"use client";

import { IconPlus, IconSearch } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { ProtectedRoute } from "@/components/auth/protected-route";
import { FileManagerLayout } from "@/components/layout/file-manager-layout";
import { LoadingScreen } from "@/components/layout/loading-screen";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ReverseSharesCardsContainer } from "./components/reverse-shares-cards-container";
import { ReverseSharesModals } from "./components/reverse-shares-modals";
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
      <FileManagerLayout
        title={t("reverseShares.pageTitle")}
        subline={t("reverseShares.v2.subline", {
          links: reverseShares.length,
          files: reverseShares.reduce((sum, share) => sum + (share.files?.length ?? 0), 0),
        })}
        actions={
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <IconPlus className="size-4" />
            {t("reverseShares.search.createButton")}
          </Button>
        }
      >
        <div className="relative max-w-sm">
          <IconSearch className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-3" />
          <Input
            type="search"
            className="pl-9"
            placeholder={t("reverseShares.search.placeholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

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
          onToggleActive={handleToggleActive}
          onUpdatePassword={handleUpdatePassword}
          onRefresh={loadReverseShares}
        />

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
