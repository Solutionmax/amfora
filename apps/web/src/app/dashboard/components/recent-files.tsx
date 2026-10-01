import { IconFolderOpen, IconUpload } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { FilesTable } from "@/components/tables/files-table";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import type { EnhancedFileManagerHook } from "@/hooks/use-enhanced-file-manager";
import { SectionHeading } from "./section-heading";

const RECENT_COUNT = 5;

/** The last few uploads as a hairline table, with the same row actions as My Files. */
export function RecentFiles({
  files,
  fileManager,
  onUpload,
}: {
  files: any[];
  fileManager: EnhancedFileManagerHook;
  onUpload: () => void;
}) {
  const t = useTranslations();

  return (
    <section aria-labelledby="recent-files">
      <SectionHeading
        title={<span id="recent-files">{t("dashboard.calm.recentFiles")}</span>}
        href="/files"
        linkLabel={t("dashboard.calm.allFiles")}
      />
      {files.length > 0 ? (
        <FilesTable
          files={files.slice(0, RECENT_COUNT)}
          showBulkActions={false}
          onPreview={fileManager.setPreviewFile}
          onRename={fileManager.setFileToRename}
          onDownload={fileManager.handleDownload}
          onShare={fileManager.setFileToShare}
          onDelete={fileManager.setFileToDelete}
        />
      ) : (
        <EmptyState
          className="border-t border-line py-10"
          icon={<IconFolderOpen />}
          title={t("recentFiles.noFiles")}
          description={t("dashboard.calm.noFilesHint")}
          action={
            <Button variant="outline" onClick={onUpload}>
              <IconUpload />
              {t("recentFiles.upload")}
            </Button>
          }
        />
      )}
    </section>
  );
}
