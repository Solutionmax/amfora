import { IconFolderPlus, IconUpload } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import type { HeaderProps } from "../types";

/** Page actions: New folder (outline) and Upload (primary). */
export function Header({ onUpload, onCreateFolder }: HeaderProps) {
  const t = useTranslations();

  return (
    <div className="flex items-center gap-2">
      {onCreateFolder && (
        <Button variant="outline" onClick={onCreateFolder}>
          <IconFolderPlus />
          {t("contextMenu.newFolder")}
        </Button>
      )}
      <Button onClick={onUpload}>
        <IconUpload />
        {t("recentFiles.upload")}
      </Button>
    </div>
  );
}
