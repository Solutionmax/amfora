import { CreateShareModal } from "@/components/modals/create-share-modal";
import { FileActionsModals } from "@/components/modals/file-actions-modals";
import { FilePreviewModal } from "@/components/modals/file-preview-modal";
import { GenerateShareLinkModal } from "@/components/modals/generate-share-link-modal";
import { ShareItemModal } from "@/components/modals/share-item-modal";
import { UploadFileModal } from "@/components/modals/upload-file-modal";
import { listFiles, listFolders } from "@/http/endpoints";
import { DashboardModalsProps } from "../types";

/** Dialogs the dashboard can open: upload, new share, and the file row actions. */
export function DashboardModals({ modals, fileManager, shareManager, onSuccess }: DashboardModalsProps) {
  return (
    <>
      <UploadFileModal isOpen={modals.isUploadModalOpen} onClose={modals.onCloseUploadModal} onSuccess={onSuccess} />

      <FilePreviewModal
        file={fileManager.previewFile || { name: "", objectName: "" }}
        isOpen={!!fileManager.previewFile}
        onClose={() => fileManager.setPreviewFile(null)}
      />

      <ShareItemModal
        file={fileManager.fileToShare}
        folder={fileManager.folderToShare}
        isOpen={!!(fileManager.fileToShare || fileManager.folderToShare)}
        onClose={() => {
          fileManager.setFileToShare(null);
          fileManager.setFolderToShare(null);
        }}
        onSuccess={onSuccess}
      />

      <FileActionsModals
        fileToDelete={fileManager.fileToDelete}
        fileToRename={fileManager.fileToRename}
        onCloseDelete={() => fileManager.setFileToDelete(null)}
        onCloseRename={() => fileManager.setFileToRename(null)}
        onDelete={async (fileId) => {
          await fileManager.handleDelete(fileId);
          await onSuccess();
        }}
        onRename={async (fileId, name, description) => {
          await fileManager.handleRename(fileId, name, description);
          await onSuccess();
        }}
      />

      <CreateShareModal
        isOpen={modals.isCreateModalOpen}
        onClose={modals.onCloseCreateModal}
        onSuccess={() => {
          modals.onCloseCreateModal();
          onSuccess();
        }}
        getAllFilesAndFolders={async () => {
          const [filesResponse, foldersResponse] = await Promise.all([listFiles(), listFolders()]);
          return {
            files: filesResponse.data.files || [],
            folders: foldersResponse.data.folders || [],
          };
        }}
      />

      <GenerateShareLinkModal
        share={shareManager.shareToGenerateLink || null}
        shareId={shareManager.shareToGenerateLink?.id || null}
        onClose={() => shareManager.setShareToGenerateLink(null)}
        onGenerate={shareManager.handleGenerateLink}
        onSuccess={onSuccess}
      />
    </>
  );
}
