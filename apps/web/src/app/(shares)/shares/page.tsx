"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

import { ProtectedRoute } from "@/components/auth/protected-route";
import { FileManagerLayout } from "@/components/layout/file-manager-layout";
import { SplitView } from "@/components/ui/split-view";
import { useShareContext } from "@/contexts/share-context";
import { useDisclosure } from "@/hooks/use-disclosure";
import { useShareManager } from "@/hooks/use-share-manager";
import type { Share } from "@/http/endpoints/shares/types";
import { ShareDetail } from "./components/share-detail";
import { NoSharesYet, ShareDetailSkeleton, ShareNotFound } from "./components/share-detail-states";
import type { ShareDetailActions } from "./components/share-detail-types";
import { SharesList } from "./components/shares-list";
import { SharesModals } from "./components/shares-modals";
import { useShareDetailActions } from "./hooks/use-share-detail-actions";
import { useShares } from "./hooks/use-shares";
import { filterShares, type ShareFilter } from "./lib/share-list";

/** The detail column is visible next to the list from the lg breakpoint (1024px) up. */
function useIsWide() {
  const [isWide, setIsWide] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsWide(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return isWide;
}

/** List of shares on the left, the chosen share on the right. The choice lives in ?id= so links and Back work. */
function SharesView() {
  const t = useTranslations();
  const router = useRouter();
  const selectedId = useSearchParams().get("id");
  const { smtpEnabled } = useShareContext();
  const { shares, isLoading, loadError, retry, loadShares, handleCopyLink } = useShares();
  const createModal = useDisclosure();
  const shareManager = useShareManager(loadShares);
  const detailActions = useShareDetailActions(loadShares);
  const [filter, setFilter] = useState<ShareFilter>("all");
  const [query, setQuery] = useState("");

  const visibleShares = useMemo(() => filterShares(shares, filter, query), [shares, filter, query]);
  const selectedShare = selectedId ? (shares.find((share) => share.id === selectedId) ?? null) : null;
  const shownShare: Share | null = selectedId ? selectedShare : (visibleShares[0] ?? null);

  const select = (id: string) => router.push(`/shares?id=${encodeURIComponent(id)}`);
  const isWide = useIsWide();
  const showAll = useCallback(() => router.push("/shares"), [router]);

  const deleteShare = async (shareId: string) => {
    const deleted = await shareManager.handleDelete(shareId);
    if (deleted && shareId === selectedId) router.replace("/shares");
  };

  const actions: ShareDetailActions = {
    onCopyLink: handleCopyLink,
    onShowQr: shareManager.setShareToViewQrCode,
    onEdit: shareManager.setShareToEdit,
    onManageFiles: shareManager.setShareToManageFiles,
    onManageRecipients: shareManager.setShareToManageRecipients,
    onNotify: shareManager.handleNotifyRecipients,
    onDownloadAll: shareManager.handleDownloadShareFiles,
    onDelete: shareManager.setShareToDelete,
    onSecurity: shareManager.setShareToManageSecurity,
    onRemovePassword: detailActions.removePassword,
    onExpiration: shareManager.setShareToManageExpiration,
    onViewLimit: detailActions.setShareForViewLimit,
    onLink: shareManager.setShareToGenerateLink,
    onRemoveItem: (share, item) => detailActions.setItemToRemove({ share, item }),
  };

  const detail = isLoading ? (
    <ShareDetailSkeleton />
  ) : loadError ? null : shares.length === 0 ? (
    <NoSharesYet onCreate={createModal.onOpen} />
  ) : selectedId && !selectedShare ? (
    <ShareNotFound onShowAll={showAll} />
  ) : shownShare ? (
    <ShareDetail share={shownShare} smtpEnabled={smtpEnabled === "true"} actions={actions} />
  ) : null;

  return (
    <FileManagerLayout title={t("shares.pageTitle")} variant="bare">
      <SplitView
        hasSelection={!!selectedId}
        onBack={showAll}
        backLabel={t("shares.pageTitle")}
        list={
          <SharesList
            shares={shares}
            visibleShares={visibleShares}
            isLoading={isLoading}
            loadError={loadError}
            onRetry={retry}
            activeId={selectedId ?? (isWide ? (shownShare?.id ?? null) : null)}
            onSelect={select}
            onCreate={createModal.onOpen}
            filter={filter}
            onFilterChange={setFilter}
            query={query}
            onQueryChange={setQuery}
            onBulkDownload={shareManager.handleBulkDownload}
            onBulkDelete={shareManager.handleBulkDelete}
            onRegisterClear={shareManager.setClearSelectionCallback}
          />
        }
        detail={detail}
      />

      <SharesModals
        isCreateModalOpen={createModal.isOpen}
        onCloseCreateModal={createModal.onClose}
        shareManager={shareManager}
        detailActions={detailActions}
        onDeleteShare={deleteShare}
        onSuccess={loadShares}
      />
    </FileManagerLayout>
  );
}

export default function SharesPage() {
  return (
    <ProtectedRoute>
      <Suspense fallback={null}>
        <SharesView />
      </Suspense>
    </ProtectedRoute>
  );
}
