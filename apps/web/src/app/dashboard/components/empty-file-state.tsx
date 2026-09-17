import { IconCloudUpload, IconFolderOpen } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";

export function EmptyFilesState({ onUpload }: { onUpload: () => void }) {
  const t = useTranslations();

  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border/70 bg-secondary/20 py-10 text-center">
      <IconFolderOpen className="h-10 w-10 text-primary/70" />
      <p className="text-muted-foreground">{t("recentFiles.noFiles")}</p>
      <Button variant="secondary" size="sm" onClick={onUpload}>
        <IconCloudUpload className="h-4 w-4" />
        {t("recentFiles.uploadFile")}
      </Button>
    </div>
  );
}
