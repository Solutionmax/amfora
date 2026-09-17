import { IconCloudUpload, IconFolderPlus } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import type { HeaderProps } from "../types";

export function Header({ onUpload, onCreateFolder }: HeaderProps) {
  const t = useTranslations();

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
        {onCreateFolder && (
          <Button variant="outline" onClick={onCreateFolder} className="w-full sm:w-auto">
            <IconFolderPlus className="h-4 w-4" />
            {t("folderActions.createFolder")}
          </Button>
        )}
        <Button variant="default" onClick={onUpload} className="w-full sm:w-auto">
          <IconCloudUpload className="h-4 w-4" />
          {t("files.uploadFile")}
        </Button>
      </div>
    </div>
  );
}
