"use client";

import { useState } from "react";
import { IconDownload, IconFolder, IconLoader2 } from "@tabler/icons-react";
import { format } from "date-fns";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { getFileIcon } from "@/utils/file-icons";
import { formatFileSize } from "@/utils/format-file-size";

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

export function ShareStage({
  name,
  description,
  expiration,
  views,
  maxViews,
  files,
  folders,
  onDownload,
  onDownloadFolder,
  onBulkDownload,
}: {
  name: string;
  description?: string | null;
  expiration?: string | null;
  views: number;
  maxViews?: number | null;
  files: ShareFile[];
  folders: ShareFolder[];
  onDownload: (objectName: string, fileName: string) => Promise<void>;
  onDownloadFolder: (folderId: string, folderName: string) => Promise<void>;
  onBulkDownload?: () => Promise<void>;
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

  return (
    <div className="w-full space-y-7">
      <header className="space-y-3">
        <h2 className="break-words font-display text-3xl font-extrabold leading-tight tracking-tight">{name}</h2>
        {description && <p className="break-words leading-7 text-muted-foreground">{description}</p>}
      </header>

      <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
        <span>
          {t("share.itemCount", { count: itemCount })} · {formatFileSize(totalBytes)}
        </span>
        {maxViews ? (
          <span>
            {t("home.visual.downloads")}: {views} / {maxViews}
          </span>
        ) : null}
        {expiration && (
          <span>
            {t("home.visual.expires")}: {format(new Date(expiration), "dd-MM-yyyy")}
          </span>
        )}
      </div>

      {itemCount > 0 && (
        <section aria-label={t("share.itemCount", { count: itemCount })}>
          <ul className="divide-y border-y border-border">
            {folders.map((folder) => (
              <li
                key={folder.id}
                className="flex min-w-0 items-center gap-3 py-4 transition-colors hover:bg-secondary/50"
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <IconFolder className="size-5" />
                </span>
                <span className="min-w-0 flex-1 break-words text-sm font-medium">{folder.name}</span>
                <button
                  type="button"
                  onClick={() => runDownload(() => onDownloadFolder(folder.id, folder.name))}
                  disabled={isDownloading}
                  aria-label={`${t("share.download")} ${folder.name}`}
                  className="shrink-0 rounded-full border border-border p-2.5 text-primary transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                >
                  <IconDownload className="size-4" />
                </button>
              </li>
            ))}
            {files.map((file) => {
              const { icon: FileTypeIcon, color } = getFileIcon(file.name);
              return (
                <li
                  key={file.id}
                  className="flex min-w-0 items-center gap-3 py-4 transition-colors hover:bg-secondary/50"
                >
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-secondary">
                    <FileTypeIcon className={`size-5 ${color}`} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-sm font-medium leading-5">{file.name}</p>
                    <p className="mt-1 font-mono text-xs text-muted-foreground">
                      {formatFileSize(Number(file.size || 0))}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => runDownload(() => onDownload(file.objectName, file.name))}
                    disabled={isDownloading}
                    aria-label={`${t("share.download")} ${file.name}`}
                    className="shrink-0 rounded-full border border-border p-2.5 text-primary transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                  >
                    <IconDownload className="size-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <Button
        type="button"
        size="lg"
        className="h-13 w-full rounded-lg text-base shadow-lg shadow-primary/15"
        onClick={downloadAll}
        disabled={isDownloading || itemCount === 0}
      >
        {isDownloading ? <IconLoader2 className="size-5 animate-spin" /> : <IconDownload className="size-5" />}
        {single ? t("share.download") : t("share.downloadAll")}
      </Button>
    </div>
  );
}
