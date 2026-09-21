import { useState } from "react";
import { useRouter } from "next/navigation";
import { IconFolderOpen } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pagination } from "@/components/ui/pagination";
import { paginate } from "@/lib/paginate";
import type { RecentFilesProps } from "../types";
import { DashboardFilesView } from "./dashboard-files-view";
import { EmptyFilesState } from "./empty-file-state";

const FILES_PER_PAGE = 5;

export function RecentFiles({ files, fileManager, onOpenUploadModal }: RecentFilesProps) {
  const t = useTranslations();
  const router = useRouter();
  const [requestedPage, setRequestedPage] = useState(1);
  const { items: pageFiles, page, totalPages } = paginate(files, requestedPage, FILES_PER_PAGE);

  return (
    <Card className="card-soft gap-0 overflow-hidden py-0">
      <CardHeader className="border-b border-line px-[18px] py-3.5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2 font-display text-sm font-semibold">
            {t("recentFiles.title")}
          </CardTitle>

          <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
            <Button
              className="h-8 px-2 text-[13px] font-semibold text-primary hover:bg-primary-soft"
              variant="ghost"
              size="sm"
              onClick={() => router.push("/files")}
            >
              <IconFolderOpen className="h-4 w-4" />
              {t("recentFiles.viewAll")}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {files.length > 0 ? (
          <DashboardFilesView
            files={pageFiles}
            onDelete={fileManager.setFileToDelete}
            onDownload={fileManager.handleDownload}
            onPreview={fileManager.setPreviewFile}
            onRename={fileManager.setFileToRename}
            onShare={fileManager.setFileToShare}
            onBulkDelete={fileManager.handleBulkDelete}
            onBulkShare={fileManager.handleBulkShare}
            onBulkDownload={fileManager.handleBulkDownload}
            setClearSelectionCallback={fileManager.setClearSelectionCallback}
            onUpdateName={(fileId, newName) => {
              const file = pageFiles.find((f) => f.id === fileId);
              if (file) {
                fileManager.handleRename(fileId, newName, file.description);
              }
            }}
            onUpdateDescription={(fileId, newDescription) => {
              const file = pageFiles.find((f) => f.id === fileId);
              if (file) {
                fileManager.handleRename(fileId, file.name, newDescription);
              }
            }}
          />
        ) : (
          <EmptyFilesState onUpload={onOpenUploadModal} />
        )}
        <Pagination page={page} totalPages={totalPages} onPageChange={setRequestedPage} />
      </CardContent>
    </Card>
  );
}
