"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { FileManagerLayout } from "@/components/layout/file-manager-layout";
import { SplitView } from "@/components/ui/split-view";
import type { CreateReverseShareBody } from "@/http/endpoints/reverse-shares/types";
import { useReverseShares, type ReverseShare } from "../hooks/use-reverse-shares";
import { matchesFilter, matchesSearch, type ReceiveFilter } from "../lib/receive-format";
import { ReceiveDetail } from "./receive-detail";
import { ReceiveList } from "./receive-list";
import { DetailSkeleton, LoadError, NoReceiveLinks, ReceiveNotFound } from "./receive-states";
import { ReverseSharesModals } from "./reverse-shares-modals";

/** Receive Files: list of receive links on the left, the selected one (?id=) on the right. */
export function ReverseSharesView() {
  const t = useTranslations();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedParam = searchParams.get("id");
  const rs = useReverseShares();
  const [filter, setFilter] = useState<ReceiveFilter>("all");
  const [search, setSearch] = useState("");
  const [passwordTarget, setPasswordTarget] = useState<ReverseShare | null>(null);

  const visible = useMemo(
    () => rs.reverseShares.filter((item) => matchesFilter(item, filter) && matchesSearch(item, search)),
    [rs.reverseShares, filter, search]
  );

  // Wide screens always show a link: the one in the address, else the first in the list.
  const selected = selectedParam
    ? (rs.reverseShares.find((item) => item.id === selectedParam) ?? null)
    : (visible[0] ?? null);

  const select = (id: string) => router.push(`${pathname}?id=${encodeURIComponent(id)}`);
  const backToList = () => router.push(pathname);

  const handleCreate = async (data: CreateReverseShareBody) => {
    const created = await rs.handleCreateReverseShare(data);
    if (created) select(created.id);
    return created;
  };

  const handleDelete = async (target: ReverseShare) => {
    const deleted = await rs.handleDeleteReverseShare(target);
    if (deleted && target.id === selectedParam) router.replace(pathname);
    return deleted;
  };

  const removePassword = async (target: ReverseShare) => {
    try {
      await rs.handleUpdatePassword(target.id, { hasPassword: false });
      toast.success(t("reverseShares.messages.passwordProtectionDisabled"));
    } catch {
      toast.error(t("reverseShares.errors.passwordUpdateFailed"));
    }
  };

  const renderDetail = () => {
    if (rs.isLoading) return <DetailSkeleton />;
    // The list column already shows the error on wide screens; phones only see this pane.
    if (rs.loadError) return <LoadError message={rs.loadError} onRetry={rs.retryLoad} className="lg:hidden" />;
    if (selectedParam && !selected) return <ReceiveNotFound onBack={backToList} />;
    if (rs.reverseShares.length === 0) return <NoReceiveLinks onCreate={() => rs.setIsCreateModalOpen(true)} />;
    if (!selected) return null;

    return (
      <ReceiveDetail
        key={selected.id}
        reverseShare={selected}
        onEdit={() => rs.setReverseShareToEdit(selected)}
        onToggleActive={() => rs.handleToggleActive(selected.id, !selected.isActive)}
        onCopyAll={() => rs.handleCopyAllToMyFiles(selected)}
        onCopyLink={() => rs.handleCopyLink(selected)}
        onViewQrCode={() => rs.setReverseShareToViewQrCode(selected)}
        onManageFiles={() => rs.setReverseShareToViewFiles(selected)}
        onFilesChanged={rs.refreshReverseShare}
        onDelete={() => rs.setReverseShareToDelete(selected)}
        onUpdate={(changes) => rs.handleUpdateReverseShareData(selected.id, changes)}
        onEditPassword={() => setPasswordTarget(selected)}
        onRemovePassword={() => removePassword(selected)}
        onEditAlias={() => rs.setReverseShareToGenerateLink(selected)}
      />
    );
  };

  return (
    <FileManagerLayout title={t("reverseShares.pageTitle")} variant="bare">
      <SplitView
        hasSelection={!!selectedParam}
        onBack={backToList}
        backLabel={t("reverseShares.pageTitle")}
        list={
          <ReceiveList
            items={visible}
            total={rs.reverseShares.length}
            selectedId={selected?.id ?? null}
            isLoading={rs.isLoading}
            error={rs.loadError}
            filter={filter}
            search={search}
            onFilterChange={setFilter}
            onSearchChange={setSearch}
            onSelect={select}
            onCreate={() => rs.setIsCreateModalOpen(true)}
            onRetry={rs.retryLoad}
          />
        }
        detail={renderDetail()}
      />

      <ReverseSharesModals
        isCreateModalOpen={rs.isCreateModalOpen}
        onCloseCreateModal={() => rs.setIsCreateModalOpen(false)}
        onCreateReverseShare={handleCreate}
        isCreating={rs.isCreating}
        reverseShareToEdit={rs.reverseShareToEdit}
        onCloseEditModal={() => rs.setReverseShareToEdit(null)}
        onUpdateReverseShare={rs.handleUpdateReverseShare}
        isUpdating={rs.isUpdating}
        reverseShareToGenerateLink={rs.reverseShareToGenerateLink}
        reverseShareToDelete={rs.reverseShareToDelete}
        reverseShareToViewFiles={rs.reverseShareToViewFiles}
        reverseShareToViewQrCode={rs.reverseShareToViewQrCode}
        reverseShareToEditPassword={passwordTarget}
        isDeleting={rs.isDeleting}
        onCloseGenerateLink={() => rs.setReverseShareToGenerateLink(null)}
        onCloseDeleteModal={() => rs.setReverseShareToDelete(null)}
        onCloseViewFiles={() => rs.setReverseShareToViewFiles(null)}
        onCloseViewQrCode={() => rs.setReverseShareToViewQrCode(null)}
        onCloseEditPassword={() => setPasswordTarget(null)}
        onConfirmDelete={handleDelete}
        onCreateAlias={rs.handleCreateAlias}
        onUpdatePassword={rs.handleUpdatePassword}
        refreshReverseShare={rs.refreshReverseShare}
      />
    </FileManagerLayout>
  );
}
