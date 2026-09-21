import { useState } from "react";
import { useRouter } from "next/navigation";
import { IconShare } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { SharesTable } from "@/components/tables/shares-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Pagination } from "@/components/ui/pagination";
import { paginate } from "@/lib/paginate";
import { RecentSharesProps } from "../types";
import { EmptySharesState } from "./empty-shares-state";

const SHARES_PER_PAGE = 5;

export function RecentShares({ shares, shareManager, onOpenCreateModal, onCopyLink }: RecentSharesProps) {
  const t = useTranslations();
  const router = useRouter();
  const [requestedPage, setRequestedPage] = useState(1);
  const { items: pageShares, page, totalPages } = paginate(shares, requestedPage, SHARES_PER_PAGE);

  return (
    <Card className="card-soft gap-0 overflow-hidden py-0">
      <CardContent className="p-0">
        <div className="flex flex-col gap-0">
          <div className="flex items-center justify-between gap-3 border-b border-line px-[18px] py-3.5">
            <h2 className="flex items-center gap-2 font-display text-sm font-semibold">{t("recentShares.title")}</h2>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <Button
                className="h-8 px-2 text-[13px] font-semibold text-primary hover:bg-primary-soft"
                variant="ghost"
                size="sm"
                onClick={() => router.push("/shares")}
              >
                <IconShare className="h-4 w-4" />
                {t("recentShares.viewAll")}
              </Button>
            </div>
          </div>

          <div className="px-0 py-0">
            {shares.length > 0 ? (
              <SharesTable
                shares={pageShares}
                onCopyLink={onCopyLink}
                onDelete={shareManager.setShareToDelete}
                onBulkDelete={shareManager.handleBulkDelete}
                onBulkDownload={shareManager.handleBulkDownload}
                onDownloadShareFiles={shareManager.handleDownloadShareFiles}
                onEdit={shareManager.setShareToEdit}
                onUpdateName={shareManager.handleUpdateName}
                onUpdateDescription={shareManager.handleUpdateDescription}
                onUpdateSecurity={shareManager.setShareToManageSecurity}
                onUpdateExpiration={shareManager.setShareToManageExpiration}
                onGenerateLink={shareManager.setShareToGenerateLink}
                onManageFiles={shareManager.setShareToManageFiles}
                onManageRecipients={shareManager.setShareToManageRecipients}
                onNotifyRecipients={shareManager.handleNotifyRecipients}
                onViewQrCode={shareManager.setShareToViewQrCode}
                onViewDetails={shareManager.setShareToViewDetails}
                setClearSelectionCallback={shareManager.setClearSelectionCallback}
              />
            ) : (
              <EmptySharesState onCreate={onOpenCreateModal} />
            )}
          </div>

          <Pagination page={page} totalPages={totalPages} onPageChange={setRequestedPage} />
        </div>
      </CardContent>
    </Card>
  );
}
