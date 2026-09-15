"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { ProtectedRoute } from "@/components/auth/protected-route";
import { FileManagerLayout } from "@/components/layout/file-manager-layout";
import { LoadingScreen } from "@/components/layout/loading-screen";
import { GenerateInviteLinkModal } from "./components/generate-invite-link-modal";
import { UserManagementModals } from "./components/user-management-modals";
import { UsersHeader } from "./components/users-header";
import { UsersTable } from "./components/users-table";
import { useUserManagement } from "./hooks/use-user-management";

export default function AdminAreaPage() {
  const t = useTranslations();
  const {
    users,
    isLoading,
    currentUser,
    modals,
    selectedUser,
    deleteModalUser,
    statusModalUser,
    handleCreateUser,
    handleEditUser,
    handleDeleteUser,
    handleToggleUserStatus,
    onSubmit,
    formMethods,
  } = useUserManagement();

  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <ProtectedRoute requireAdmin>
      <FileManagerLayout
        title={t("users.header.title")}
        actions={<UsersHeader onCreateUser={handleCreateUser} onGenerateInvite={() => setIsInviteModalOpen(true)} />}
      >
        <UsersTable
          currentUser={currentUser}
          users={users}
          onDelete={(user) => {
            modals.setDeleteModalUser(user);
            modals.onDeleteModalOpen();
          }}
          onEdit={handleEditUser}
          onToggleStatus={(user) => {
            modals.setStatusModalUser(user);
            modals.onStatusModalOpen();
          }}
        />

        <UserManagementModals
          deleteModalUser={deleteModalUser}
          formMethods={formMethods}
          modals={modals}
          selectedUser={selectedUser}
          statusModalUser={statusModalUser}
          onDelete={handleDeleteUser}
          onSubmit={onSubmit}
          onToggleStatus={handleToggleUserStatus}
        />

        <GenerateInviteLinkModal isOpen={isInviteModalOpen} onClose={() => setIsInviteModalOpen(false)} />
      </FileManagerLayout>
    </ProtectedRoute>
  );
}
