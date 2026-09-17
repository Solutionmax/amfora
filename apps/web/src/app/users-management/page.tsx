"use client";

import { useMemo, useState } from "react";
import { IconSearch, IconShieldCheck, IconUserCheck, IconUsers } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { ProtectedRoute } from "@/components/auth/protected-route";
import { FileManagerLayout } from "@/components/layout/file-manager-layout";
import { LoadingScreen } from "@/components/layout/loading-screen";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [roleFilter, setRoleFilter] = useState<"all" | "admin" | "user">("all");

  const filteredUsers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return users.filter((user) => {
      const matchesQuery =
        !query ||
        [user.firstName, user.lastName, user.username, user.email].some((value) => value.toLowerCase().includes(query));
      const matchesStatus = statusFilter === "all" || (statusFilter === "active" ? user.isActive : !user.isActive);
      const matchesRole = roleFilter === "all" || (roleFilter === "admin" ? user.isAdmin : !user.isAdmin);

      return matchesQuery && matchesStatus && matchesRole;
    });
  }, [roleFilter, searchQuery, statusFilter, users]);

  const activeUsers = users.filter((user) => user.isActive).length;
  const adminUsers = users.filter((user) => user.isAdmin).length;

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <ProtectedRoute requireAdmin>
      <FileManagerLayout
        title={t("users.header.title")}
        actions={<UsersHeader onCreateUser={handleCreateUser} onGenerateInvite={() => setIsInviteModalOpen(true)} />}
      >
        <div className="space-y-6">
          <div className="grid overflow-hidden rounded-xl border border-border/70 bg-card sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            <div className="flex items-center gap-4 border-b border-border/70 p-5 sm:border-b-0">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <IconUsers className="size-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm text-muted-foreground">{t("users.table.user")}</p>
                <p className="font-display text-2xl font-semibold tracking-tight">{users.length}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 border-b border-border/70 p-5 sm:border-b-0">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <IconUserCheck className="size-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm text-muted-foreground">{t("users.table.active")}</p>
                <p className="font-display text-2xl font-semibold tracking-tight">{activeUsers}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-5">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <IconShieldCheck className="size-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm text-muted-foreground">{t("users.table.admin")}</p>
                <p className="font-display text-2xl font-semibold tracking-tight">{adminUsers}</p>
              </div>
            </div>
          </div>

          <section className="rounded-xl border border-border/70 bg-card p-4 sm:p-5" aria-label={t("common.search")}>
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_180px_180px] md:items-end">
              <div className="space-y-2">
                <Label htmlFor="users-search">{t("common.search")}</Label>
                <div className="relative">
                  <IconSearch
                    className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <Input
                    id="users-search"
                    type="search"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder={t("common.search")}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="users-status-filter">{t("users.table.status")}</Label>
                <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}>
                  <SelectTrigger id="users-status-filter" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("users.filters.all")}</SelectItem>
                    <SelectItem value="active">{t("users.table.active")}</SelectItem>
                    <SelectItem value="inactive">{t("users.table.inactive")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="users-role-filter">{t("users.table.role")}</Label>
                <Select value={roleFilter} onValueChange={(value) => setRoleFilter(value as typeof roleFilter)}>
                  <SelectTrigger id="users-role-filter" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("users.filters.all")}</SelectItem>
                    <SelectItem value="admin">{t("users.table.admin")}</SelectItem>
                    <SelectItem value="user">{t("users.table.userr")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              {t("searchBar.results", { filtered: filteredUsers.length, total: users.length })}
            </p>
          </section>

          {filteredUsers.length > 0 ? (
            <UsersTable
              currentUser={currentUser}
              users={filteredUsers}
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
          ) : (
            <div className="rounded-xl border border-dashed border-border/70 bg-secondary/20 px-6 py-14 text-center">
              <IconSearch className="mx-auto size-8 text-primary/70" aria-hidden="true" />
              <p className="mt-3 font-medium">{t("searchBar.noResults", { query: searchQuery })}</p>
            </div>
          )}
        </div>

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
