"use client";

import { useState } from "react";
import { IconDownload, IconEye, IconLoader2 } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { Cover } from "@/components/brand/cover";
import { kindFromName } from "@/components/brand/file-kind";
import { FileManifest, type ManifestItem } from "@/components/brand/file-manifest";
import { Button } from "@/components/ui/button";

interface ShareFile {
  id: string;
  name: string;
  size: number | string;
  objectName: string;
}

interface ShareFolder {
  id: string;
  name: string;
}

/** The floating panel of a download page: cover, manifest, one primary action. */
export function ShareStage({
  files,
  folders,
  views,
  onDownload,
  onDownloadFolder,
  onBulkDownload,
  onPreview,
}: {
  files: ShareFile[];
  folders: ShareFolder[];
  views: number;
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
      if (single) return onDownload(files[0].objectName, files[0].name);
      return onBulkDownload?.() ?? Promise.resolve();
    });

  const coverFiles = files.map((file) => {
    const kind = kindFromName(file.name);
    return {
      name: file.name,
      kind,
      previewUrl:
        kind === "image"
          ? `/api/files/download?objectName=${encodeURIComponent(file.objectName)}&preview=1`
          : undefined,
    };
  });

  const items: ManifestItem[] = [
    ...folders.map((folder) => ({
      id: `folder:${folder.id}`,
      name: folder.name,
      kind: "other" as const,
      subline: t("public.download.folder"),
      onClick: () => runDownload(() => onDownloadFolder(folder.id, folder.name)),
    })),
    ...files.map((file) => ({
      id: file.id,
      name: file.name,
      size: Number(file.size || 0),
      kind: kindFromName(file.name),
      subline: t(`public.kind.${kindFromName(file.name)}`),
      onClick: () => runDownload(() => onDownload(file.objectName, file.name)),
    })),
  ];

  return (
    <div>
      <Cover
        files={coverFiles}
        onOpen={onPreview && files[0] ? () => onPreview(files[0]) : undefined}
        caption={files[0] ? t(`public.kind.${kindFromName(files[0].name)}`) : undefined}
      />
      <div className="px-5 pb-6 pt-5 md:px-6">
        {itemCount > 0 && (
          <FileManifest
            items={items}
            total={{
              label: `${t("share.itemCount", { count: itemCount })} · ${t("public.download.downloaded", { count: views })}`,
              size: totalBytes,
            }}
          />
        )}
        <div className="mt-[18px] flex gap-2.5">
          <Button
            type="button"
            size="lg"
            className="flex-1 shadow-[0_10px_24px_-12px_color-mix(in_oklab,var(--primary)_70%,transparent)]"
            onClick={downloadAll}
            disabled={isDownloading || itemCount === 0}
          >
            {isDownloading ? <IconLoader2 className="size-5 animate-spin" /> : <IconDownload className="size-5" />}
            {single ? t("share.download") : t("share.downloadAll")}
          </Button>
          {onPreview && files[0] && (
            <Button type="button" size="lg" variant="outline" onClick={() => onPreview(files[0])}>
              <IconEye className="size-5" />
              {t("public.download.preview")}
            </Button>
          )}
        </div>
        <p className="mt-3.5 text-center text-xs text-ink-3">
          {single ? t("public.download.noteSingle") : t("public.download.noteZip")}
        </p>
      </div>
    </div>
  );
}
