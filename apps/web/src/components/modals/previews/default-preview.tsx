import { IconLoader2 } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { FileTypeIcon } from "@/components/files/file-type-icon";

interface DefaultPreviewProps {
  fileName: string;
  isLoading?: boolean;
  message?: string;
}

/** Quiet placeholder while a preview loads, or when a type has no preview. */
export function DefaultPreview({ fileName, isLoading, message }: DefaultPreviewProps) {
  const t = useTranslations();

  if (isLoading) {
    return (
      <div className="flex h-72 flex-col items-center justify-center gap-3 rounded-xl bg-surface-2 text-[13px] text-ink-3">
        <IconLoader2 size={22} aria-hidden className="animate-spin text-ink-icon" />
        {t("filePreview.loading")}
      </div>
    );
  }

  return (
    <div className="flex h-72 flex-col items-center justify-center gap-2 rounded-xl bg-surface-2 px-6 text-center">
      <FileTypeIcon name={fileName} size={28} className="mb-1" />
      <p className="font-semibold">{message || t("filePreview.notAvailable")}</p>
      <p className="text-[13px] text-ink-3">{t("filePreview.downloadToView")}</p>
    </div>
  );
}
