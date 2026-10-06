"use client";

import { useTranslations } from "next-intl";

import { CreateShareModal } from "@/components/modals/create-share-modal";
import { DeleteConfirmationModal } from "@/components/modals/delete-confirmation-modal";
import { GenerateShareLinkModal } from "@/components/modals/generate-share-link-modal";
import { QrCodeModal } from "@/components/modals/qr-code-modal";
import { ShareActionsModals } from "@/components/modals/share-actions-modals";
import { ShareExpirationModal } from "@/components/modals/share-expiration-modal";
import { ShareSecurityModal } from "@/components/modals/share-security-modal";
import type { ShareManagerHook } from "@/hooks/use-share-manager";
import { listFiles } from "@/http/endpoints";
import { listFolders } from "@/http/endpoints/folders";
import type { useShareDetailActions } from "../hooks/use-share-detail-actions";
import { shareUrl } from "../lib/share-list";
import { ConfirmDialog } from "./confirm-dialog";
import { ShareGroupModal } from "./share-group-modal";
import { ShareViewLimitModal } from "./share-view-limit-modal";

const loadFilesAndFolders = async () => {
  const [filesResponse, foldersResponse] = await Promise.all([listFiles(), listFolders()]);
  return {
    files: filesResponse.data.files || [],
    folders: foldersResponse.data.folders || [],
  };
};

interface SharesModalsProps {
  isCreateModalOpen: boolean;
  onCloseCreateModal: () => void;
  shareManager: ShareManagerHook;
  detailActions: ReturnType<typeof useShareDetailActions>;
  onDeleteShare: (shareId: string) => Promise<void>;
  onSuccess: () => void;
}

/** Every dialog the shares page can open. The dialogs themselves live in components/modals. */
export function SharesModals({
  isCreateModalOpen,
  onCloseCreateModal,
  shareManager,
  detailActions,
  onDeleteShare,
  onSuccess,
}: SharesModalsProps) {
  const t = useTranslations();
  const qrShare = shareManager.shareToViewQrCode;
  const removing = detailActions.itemToRemove;

  return (
    <>
      <CreateShareModal
        isOpen={isCreateModalOpen}
        onClose={onCloseCreateModal}
        onSuccess={onSuccess}
        getAllFilesAndFolders={loadFilesAndFolders}
      />

      <ShareActionsModals
        shareToDelete={shareManager.shareToDelete}
        shareToEdit={shareManager.shareToEdit}
        shareToManageFiles={shareManager.shareToManageFiles}
        shareToManageRecipients={shareManager.shareToManageRecipients}
        onCloseDelete={() => shareManager.setShareToDelete(null)}
        onCloseEdit={() => shareManager.setShareToEdit(null)}
        onCloseManageFiles={() => shareManager.setShareToManageFiles(null)}
        onCloseManageRecipients={() => shareManager.setShareToManageRecipients(null)}
        onDelete={onDeleteShare}
        onEdit={shareManager.handleEdit}
        onManageFiles={shareManager.handleManageFiles}
        onManageRecipients={shareManager.handleManageRecipients}
        onSuccess={onSuccess}
        onEditFolder={shareManager.handleEditFolder}
      />

      <QrCodeModal
        isOpen={!!qrShare?.alias?.alias}
        onClose={() => shareManager.setShareToViewQrCode(null)}
        shareLink={qrShare?.alias?.alias ? shareUrl(window.location.origin, qrShare.alias.alias) : ""}
        shareName={qrShare?.name || t("shares.calm.untitled")}
      />

      <DeleteConfirmationModal
        isOpen={!!shareManager.sharesToDelete}
        onClose={() => shareManager.setSharesToDelete(null)}
        onConfirm={shareManager.handleDeleteBulk}
        title={t("shareActions.bulkDeleteTitle")}
        description={t("shareActions.bulkDeleteConfirmation", { count: shareManager.sharesToDelete?.length || 0 })}
        files={shareManager.sharesToDelete?.map((share) => share.name || t("shares.calm.untitled")) || []}
        itemType="shares"
      />

      <GenerateShareLinkModal
        share={shareManager.shareToGenerateLink}
        shareId={shareManager.shareToGenerateLink?.id || null}
        onClose={() => shareManager.setShareToGenerateLink(null)}
        onGenerate={shareManager.handleGenerateLink}
        onSuccess={onSuccess}
      />

      <ShareSecurityModal
        shareId={shareManager.shareToManageSecurity?.id || null}
        share={shareManager.shareToManageSecurity || null}
        onClose={() => shareManager.setShareToManageSecurity(null)}
        onSuccess={onSuccess}
      />

      <ShareExpirationModal
        shareId={shareManager.shareToManageExpiration?.id || null}
        share={shareManager.shareToManageExpiration || null}
        onClose={() => shareManager.setShareToManageExpiration(null)}
        onSuccess={onSuccess}
      />

      <ShareViewLimitModal
        share={detailActions.shareForViewLimit}
        onClose={() => detailActions.setShareForViewLimit(null)}
        onSave={detailActions.saveViewLimit}
      />

      <ShareGroupModal
        share={detailActions.shareForGroup}
        onClose={() => detailActions.setShareForGroup(null)}
        onSave={detailActions.saveGroup}
      />

      <ConfirmDialog
        open={!!removing}
        title={t("shares.calm.removeTitle", { name: removing?.item.name ?? "" })}
        description={t("shares.calm.removeText")}
        confirmLabel={t("shares.calm.remove")}
        onConfirm={detailActions.confirmRemoveItem}
        onClose={() => detailActions.setItemToRemove(null)}
      />
    </>
  );
}
