import { QrCodeModal } from "@/components/modals/qr-code-modal";
import type { CreateReverseShareBody, UpdateReverseShareBody } from "@/http/endpoints/reverse-shares/types";
import { reverseShareUrl, type PasswordChange, type ReverseShare } from "../hooks/use-reverse-shares";
import { CreateReverseShareModal } from "./create-reverse-share-modal";
import { DeleteReverseShareModal } from "./delete-reverse-share-modal";
import { EditPasswordModal } from "./edit-password-modal";
import { EditReverseShareModal } from "./edit-reverse-share-modal";
import { GenerateAliasModal } from "./generate-alias-modal";
import { ReceivedFilesModal } from "./received-files-modal";

interface ReverseSharesModalsProps {
  isCreateModalOpen: boolean;
  onCloseCreateModal: () => void;
  onCreateReverseShare: (data: CreateReverseShareBody) => Promise<unknown>;
  isCreating: boolean;
  reverseShareToEdit: ReverseShare | null;
  onCloseEditModal: () => void;
  onUpdateReverseShare: (data: UpdateReverseShareBody) => Promise<unknown>;
  isUpdating: boolean;
  reverseShareToGenerateLink: ReverseShare | null;
  reverseShareToDelete: ReverseShare | null;
  reverseShareToViewFiles: ReverseShare | null;
  reverseShareToViewQrCode: ReverseShare | null;
  reverseShareToEditPassword: ReverseShare | null;
  isDeleting: boolean;
  onCloseGenerateLink: () => void;
  onCloseDeleteModal: () => void;
  onCloseViewFiles: () => void;
  onCloseViewQrCode: () => void;
  onCloseEditPassword: () => void;
  onConfirmDelete: (reverseShare: ReverseShare) => Promise<unknown>;
  onCreateAlias: (reverseShareId: string, alias: string) => Promise<boolean>;
  onUpdatePassword: (id: string, data: PasswordChange) => Promise<unknown>;
  refreshReverseShare: () => Promise<void>;
}

export function ReverseSharesModals(props: ReverseSharesModalsProps) {
  const qrTarget = props.reverseShareToViewQrCode;

  return (
    <>
      <CreateReverseShareModal
        isOpen={props.isCreateModalOpen}
        onClose={props.onCloseCreateModal}
        onCreateReverseShare={props.onCreateReverseShare}
        isCreating={props.isCreating}
      />

      <EditReverseShareModal
        reverseShare={props.reverseShareToEdit}
        isOpen={!!props.reverseShareToEdit}
        onClose={props.onCloseEditModal}
        onUpdateReverseShare={props.onUpdateReverseShare}
        isUpdating={props.isUpdating}
      />

      <GenerateAliasModal
        reverseShare={props.reverseShareToGenerateLink}
        isOpen={!!props.reverseShareToGenerateLink}
        onClose={props.onCloseGenerateLink}
        onCreateAlias={props.onCreateAlias}
      />

      <EditPasswordModal
        reverseShare={props.reverseShareToEditPassword}
        isOpen={!!props.reverseShareToEditPassword}
        onClose={props.onCloseEditPassword}
        onUpdatePassword={props.onUpdatePassword}
      />

      <DeleteReverseShareModal
        reverseShare={props.reverseShareToDelete}
        isDeleting={props.isDeleting}
        onClose={props.onCloseDeleteModal}
        onConfirm={props.onConfirmDelete}
      />

      <ReceivedFilesModal
        reverseShare={props.reverseShareToViewFiles}
        isOpen={!!props.reverseShareToViewFiles}
        onClose={props.onCloseViewFiles}
        onRefresh={props.refreshReverseShare}
      />

      <QrCodeModal
        isOpen={!!qrTarget}
        onClose={props.onCloseViewQrCode}
        shareLink={qrTarget ? (reverseShareUrl(qrTarget) ?? "") : ""}
        shareName={qrTarget?.name || "receive-link"}
      />
    </>
  );
}
