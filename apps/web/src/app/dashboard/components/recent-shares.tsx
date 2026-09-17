import { useRouter } from "next/navigation";
import { IconShare } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { SharesTable } from "@/components/tables/shares-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RecentSharesProps } from "../types";
import { EmptySharesState } from "./empty-shares-state";

export function RecentShares({ shares, shareManager, onOpenCreateModal, onCopyLink }: RecentSharesProps) {
  const t = useTranslations();
  const router = useRouter();

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="flex flex-col gap-0">
          <div className="flex flex-col gap-3 border-b border-border/60 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <IconShare className="size-5 text-primary" />
              {t("recentShares.title")}
            </h2>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <Button
                className="font-semibold text-sm cursor-pointer"
                variant="outline"
                size="default"
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
                shares={shares}
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
        </div>
      </CardContent>
    </Card>
  );
}
