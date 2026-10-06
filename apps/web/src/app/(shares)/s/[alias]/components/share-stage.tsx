"use client";

import { useState } from "react";
import { IconDownload, IconEye, IconLoader2, IconLock } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { canPreviewOnDownloadPage } from "@/components/brand/cover-pick";
import { kindFromName } from "@/components/brand/file-kind";
import { FileManifest, type ManifestItem } from "@/components/brand/file-manifest";
import { isScanBlocked, ScanLine, type ScanStatus } from "@/components/files/scan-status";
import { Button } from "@/components/ui/button";
import { formatFileSize } from "@/utils/format-file-size";

interface ShareFile {
  id: string;
  name: string;
  size: number | string;
  objectName: string;
  scanStatus?: ScanStatus | null;
  scanDetail?: string | null;
}

interface ShareFolder {
  id: string;
  name: string;
}

/**
 * The floating card of a download page: what is in it, one primary action. The cover is the
 * page itself now, so a single file is named once and not listed again.
 */
export function ShareStage({
  files,
  folders,
  hasPassword,
  onDownload,
  onDownloadFolder,
  onBulkDownload,
  onPreview,
}: {
  files: ShareFile[];
  folders: ShareFolder[];
  hasPassword?: boolean;
  onDownload: (objectName: string, fileName: string) => Promise<void>;
  onDownloadFolder: (folderId: string, folderName: string) => Promise<void>;
  onBulkDownload?: () => Promise<void>;
  onPreview?: (file: ShareFile) => void;
}) {
  const t = useTranslations();
  const [isDownloading, setIsDownloading] = useState(false);

  const itemCount = files.length + folders.length;
  const totalBytes = files.reduce((sum, file) => sum + Number(file.size || 0), 0);
  const single = itemCount === 1 && files.length === 1;
  const first = files[0];
  // A file the virus scan holds back is listed with its status and cannot be opened by anybody.
  const hasOnlyBlocked = folders.length === 0 && files.length > 0 && files.every(isScanBlocked);

  const runDownload = async (action: () => Promise<void>) => {
    if (isDownloading) return;
    setIsDownloading(true);
    try {
      await action();
    } finally {
      setIsDownloading(false);
    }
  };

  const downloadAll = () =>
    runDownload(() => {
      if (single) return onDownload(first.objectName, first.name);
      return onBulkDownload?.() ?? Promise.resolve();
    });

  // Video and audio are never played here; the API refuses that preview too.
  const openPreview =
    onPreview && first && !isScanBlocked(first) && canPreviewOnDownloadPage(first.name)
      ? () => onPreview(first)
      : undefined;

  const rowIcon = <IconDownload className="size-[18px] text-ink-3" aria-hidden="true" />;
  const items: ManifestItem[] = [
    ...folders.map((folder) => ({
      id: `folder:${folder.id}`,
      name: folder.name,
      kind: "other" as const,
      subline: t("public.download.folder"),
      trailing: rowIcon,
      onClick: () => runDownload(() => onDownloadFolder(folder.id, folder.name)),
    })),
    ...files.map((file) => ({
      id: file.id,
      name: file.name,
      kind: kindFromName(file.name),
      subline: (
        <>
          {`${t(`public.kind.${kindFromName(file.name)}`)} · ${formatFileSize(Number(file.size || 0))}`}
          <ScanLine file={file} />
        </>
      ),
      trailing: isScanBlocked(file) ? <span /> : rowIcon,
      onClick: isScanBlocked(file) ? undefined : () => runDownload(() => onDownload(file.objectName, file.name)),
    })),
  ];

  return (
    <div className="p-6 md:p-7">
      <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">{t("public.stage.ready")}</span>
      <h2
        className="mt-2 line-clamp-3 font-display text-[26px] font-semibold leading-[1.1] tracking-[-0.02em] [overflow-wrap:anywhere] md:text-[30px]"
        title={single ? first.name : undefined}
      >
        {single ? first.name : t("share.itemCount", { count: itemCount })}
      </h2>
      <p className="mt-1 text-sm text-ink-3">
        {single ? `${t(`public.kind.${kindFromName(first.name)}`)} · ` : ""}
        {formatFileSize(totalBytes)}
      </p>
      {single && <ScanLine file={first} className="mt-1" />}

      {!single && itemCount > 0 && <FileManifest items={items} accentTiles className="mt-4" />}

      <div className="mt-5 flex gap-2.5">
        <Button
          type="button"
          size="lg"
          className="h-12 flex-1 text-base shadow-[0_10px_24px_-12px_color-mix(in_oklab,var(--primary)_70%,transparent)]"
          onClick={downloadAll}
          disabled={isDownloading || itemCount === 0 || hasOnlyBlocked}
        >
          {isDownloading ? <IconLoader2 className="size-5 animate-spin" /> : <IconDownload className="size-5" />}
          {single ? t("share.download") : t("share.downloadAll")}
          <span>· {formatFileSize(totalBytes)}</span>
        </Button>
        {openPreview && (
          <Button type="button" size="lg" variant="outline" className="h-12" onClick={openPreview}>
            <IconEye className="size-5" />
            <span className="sr-only md:not-sr-only">{t("public.download.preview")}</span>
          </Button>
        )}
      </div>

      <p className="mt-3.5 flex flex-wrap items-center justify-center gap-x-3.5 gap-y-1 text-xs text-ink-3">
        <span className="inline-flex items-center gap-1">
          <IconLock className="size-3.5 text-primary" />
          {hasPassword ? t("public.download.passwordVerified") : t("public.stage.linkOnly")}
        </span>
        <span>{t("public.stage.noAccount")}</span>
      </p>
    </div>
  );
}
