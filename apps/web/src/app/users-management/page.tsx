"use client";

import { useMemo, useState } from "react";
import { IconPlus, IconSearch } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { LoadError } from "@/app/settings/components/load-error";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { FileManagerLayout } from "@/components/layout/file-manager-layout";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Group } from "@/http/endpoints";
import { GenerateInviteLinkModal } from "./components/generate-invite-link-modal";
import { GroupDeleteModal } from "./components/group-delete-modal";
import { GroupModal } from "./components/group-modal";
import { GroupsPanel } from "./components/groups-panel";
import { UserManagementModals } from "./components/user-management-modals";
import { UsersHeader } from "./components/users-header";
import { UsersSkeleton } from "./components/users-skeleton";
import { UsersTable } from "./components/users-table";
import { UsersToolbar } from "./components/users-toolbar";
import { useGroups } from "./hooks/use-groups";
import { useUserManagement } from "./hooks/use-user-management";
import { filterUsers, userCounts, type UserFilter } from "./lib/filter-users";

function UsersContent() {
  const t = useTranslations();
  const management = useUserManagement();
  const { users, isLoading, loadError, reloadUsers, currentUser, modals } = management;

  const groupsState = useGroups();
  const [tab, setTab] = useState<"users" | "groups">("users");
  // A group dialog is mounted per opening, so its fields start from the group it is opened for.
  const [groupDialog, setGroupDialog] = useState<{ group: Group | null; key: number } | null>(null);
  const [groupToDelete, setGroupToDelete] = useState<Group | null>(null);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<UserFilter>("all");

  const filteredUsers = useMemo(() => filterUsers(users, filter, search), [users, filter, search]);
  const counts = userCounts(users);
  const ready = !isLoading && !loadError;

  const clearFilters = () => {
    setSearch("");
    setFilter("all");
  };

  const openGroupDialog = (group: Group | null) => setGroupDialog({ group, key: Date.now() });

  const renderBody = () => {
    if (isLoading) return <UsersSkeleton />;
    if (loadError) return <LoadError message={t("users.errors.loadFailed")} onRetry={reloadUsers} />;

    return (
      <div>
        <UsersToolbar filter={filter} onFilter={setFilter} search={search} onSearch={setSearch} />
        {filteredUsers.length > 0 ? (
          <UsersTable
            currentUser={currentUser}
            users={filteredUsers}
            onDelete={(user) => {
              modals.setDeleteModalUser(user);
              modals.onDeleteModalOpen();
            }}
            onEdit={management.handleEditUser}
            onToggleStatus={(user) => {
              modals.setStatusModalUser(user);
              modals.onStatusModalOpen();
            }}
            onToggleAdmin={management.handleToggleAdmin}
            onResetTwoFactor={(user) => {
              modals.setResetModalUser(user);
              modals.onResetModalOpen();
            }}
          />
        ) : (
          <EmptyState
            className="border-t border-line"
            icon={<IconSearch />}
            title={
              search.trim() ? t("users.calm.empty.search", { query: search.trim() }) : t("users.calm.empty.filter")
            }
            action={
              <Button variant="outline" onClick={clearFilters}>
                {t("users.calm.empty.clear")}
              </Button>
            }
          />
        )}
      </div>
    );
  };

  return (
    <FileManagerLayout
      title={t("users.calm.title")}
      subline={ready ? t("users.calm.subline", counts) : undefined}
      actions={
        tab === "users" ? (
          <UsersHeader onCreateUser={management.handleCreateUser} onGenerateInvite={() => setIsInviteModalOpen(true)} />
        ) : (
          <Button type="button" onClick={() => openGroupDialog(null)}>
            <IconPlus aria-hidden="true" />
            {t("groups.new")}
          </Button>
        )
      }
    >
      <Tabs value={tab} onValueChange={(value) => setTab(value as "users" | "groups")}>
        <TabsList className="mb-4">
          <TabsTrigger value="users">{t("groups.tabs.users")}</TabsTrigger>
          <TabsTrigger value="groups">{t("groups.tabs.groups")}</TabsTrigger>
        </TabsList>
        <TabsContent value="users">{renderBody()}</TabsContent>
        <TabsContent value="groups">
          <GroupsPanel
            groups={groupsState.groups}
            isLoading={groupsState.isLoading}
            loadError={groupsState.loadError}
            onRetry={groupsState.reload}
            onCreate={() => openGroupDialog(null)}
            onEdit={openGroupDialog}
            onDelete={setGroupToDelete}
          />
        </TabsContent>
      </Tabs>

      {groupDialog && (
        <GroupModal
          key={groupDialog.key}
          isOpen
          group={groupDialog.group}
          users={users}
          onClose={() => setGroupDialog(null)}
          onChanged={() => void groupsState.reload()}
        />
      )}
      <GroupDeleteModal
        group={groupToDelete}
        onClose={() => setGroupToDelete(null)}
        onDeleted={() => {
          setGroupToDelete(null);
          void groupsState.reload();
        }}
      />

      <UserManagementModals
        deleteModalUser={management.deleteModalUser}
        formMethods={management.formMethods}
        modals={modals}
        selectedUser={management.selectedUser}
        statusModalUser={management.statusModalUser}
        resetModalUser={management.resetModalUser}
        onResetTwoFactor={management.handleResetTwoFactor}
        onDelete={management.handleDeleteUser}
        onSubmit={management.onSubmit}
        onToggleStatus={management.handleToggleUserStatus}
      />

      <GenerateInviteLinkModal isOpen={isInviteModalOpen} onClose={() => setIsInviteModalOpen(false)} />
    </FileManagerLayout>
  );
}

export default function UsersManagementPage() {
  // The admin check runs first, so a regular user never triggers the users request.
  return (
    <ProtectedRoute requireAdmin>
      <UsersContent />
    </ProtectedRoute>
  );
}
