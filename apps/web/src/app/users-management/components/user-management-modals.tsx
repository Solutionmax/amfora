import { UserManagementModalsProps } from "../types";
import { UserDeleteModal } from "./user-delete-modal";
import { UserFormModal } from "./user-form-modal";
import { UserResetTwoFactorModal } from "./user-reset-two-factor-modal";
import { UserStatusModal } from "./user-status-modal";

export function UserManagementModals({
  modals,
  selectedUser,
  deleteModalUser,
  statusModalUser,
  resetModalUser,
  onResetTwoFactor,
  onSubmit,
  onDelete,
  onToggleStatus,
  formMethods,
}: UserManagementModalsProps) {
  return (
    <>
      <UserFormModal
        formMethods={formMethods}
        isOpen={modals.isOpen}
        modalMode={modals.modalMode}
        selectedUser={selectedUser}
        onClose={modals.onClose}
        onSubmit={onSubmit}
      />

      <UserDeleteModal
        isOpen={modals.isDeleteModalOpen}
        user={deleteModalUser}
        onClose={modals.onDeleteModalClose}
        onConfirm={onDelete}
      />

      <UserStatusModal
        isOpen={modals.isStatusModalOpen}
        user={statusModalUser}
        onClose={modals.onStatusModalClose}
        onConfirm={onToggleStatus}
      />

      <UserResetTwoFactorModal
        isOpen={modals.isResetModalOpen}
        user={resetModalUser}
        onClose={modals.onResetModalClose}
        onConfirm={onResetTwoFactor}
      />
    </>
  );
}
