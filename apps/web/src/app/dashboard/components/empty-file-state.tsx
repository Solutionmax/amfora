import { IconCloudUpload, IconFolderOpen } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";

export function EmptyFilesState({ onUpload }: { onUpload: () => void }) {
  const t = useTranslations();

  return (
    <div className="text-center py-6 flex flex-col items-center gap-2">
      <IconFolderOpen className="h-10 w-10 text-gray-500" />
      <p className="text-gray-500">{t("recentFiles.noFiles")}</p>
      <Button variant="secondary" size="sm" onClick={onUpload}>
        <IconCloudUpload className="h-4 w-4" />
        {t("recentFiles.uploadFile")}
      </Button>
    </div>
  );
}
