"use client";

import { IconDownload, IconFolder } from "@tabler/icons-react";
import { format } from "date-fns";
import { useTranslations } from "next-intl";

import { Seal } from "@/components/brand/seal";
import { Button } from "@/components/ui/button";
import { getFileIcon } from "@/utils/file-icons";
import { formatFileSize } from "@/utils/format-file-size";

interface PanelFile {
  id: string;
  name: string;
  size: number | string;
  objectName: string;
}

interface PanelFolder {
  id: string;
  name: string;
  totalSize?: string | null;
}

/** The recipient's whole job is to get the files. One card, one obvious button. */
export function SharePanel({
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
  files: PanelFile[];
  folders: PanelFolder[];
  onDownload: (objectName: string, fileName: string) => Promise<void>;
  onDownloadFolder: (folderId: string, folderName: string) => Promise<void>;
  onBulkDownload?: () => Promise<void>;
}) {
  const t = useTranslations();

  const itemCount = files.length + folders.length;
  const totalBytes = files.reduce((sum, file) => sum + Number(file.size || 0), 0);
  const single = itemCount === 1 && files.length === 1;

  const download = () => {
    if (single) {
      return onDownload(files[0].objectName, files[0].name);
    }
    return onBulkDownload?.();
  };

  return (
    <div className="w-full max-w-[420px] rounded-[1.75rem] border bg-card p-7 shadow-[0_30px_80px_-40px_rgba(14,32,54,0.6)]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-extrabold leading-tight tracking-tight">{name}</h1>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
        <Seal className="h-14 w-14 shrink-0" />
      </div>

      <p className="mt-4 font-mono text-xs text-muted-foreground">
        {t("share.itemCount", { count: itemCount })} · {formatFileSize(totalBytes)}
      </p>

      <Button size="lg" className="mt-5 w-full" onClick={download}>
        <IconDownload className="size-5" />
        {single ? t("share.download") : t("share.downloadAll")}
      </Button>

      {itemCount > 1 && (
        <ul className="mt-5 max-h-64 divide-y overflow-y-auto border-t">
          {folders.map((folder) => (
            <li key={folder.id} className="flex items-center gap-3 py-2.5">
              <IconFolder className="size-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate text-sm">{folder.name}</span>
              <button
                type="button"
                onClick={() => onDownloadFolder(folder.id, folder.name)}
                aria-label={`${t("share.download")} ${folder.name}`}
                className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <IconDownload className="size-4" />
              </button>
            </li>
          ))}
          {files.map((file) => {
            const { icon: Icon, color } = getFileIcon(file.name);
            return (
              <li key={file.id} className="flex items-center gap-3 py-2.5">
                <Icon className={`size-4 shrink-0 ${color}`} />
                <span className="min-w-0 flex-1 truncate text-sm">{file.name}</span>
                <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                  {formatFileSize(Number(file.size || 0))}
                </span>
                <button
                  type="button"
                  onClick={() => onDownload(file.objectName, file.name)}
                  aria-label={`${t("share.download")} ${file.name}`}
                  className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  <IconDownload className="size-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <dl className="mt-5 flex flex-wrap gap-x-6 gap-y-1 border-t pt-4 font-mono text-[11px] text-muted-foreground">
        {expiration && (
          <div className="flex gap-2">
            <dt>{t("home.visual.expires")}</dt>
            <dd className="text-foreground">{format(new Date(expiration), "dd-MM-yyyy")}</dd>
          </div>
        )}
        <div className="flex gap-2">
          <dt>{t("home.visual.downloads")}</dt>
          <dd className="text-foreground">
            {views}
            {maxViews ? ` / ${maxViews}` : ""}
          </dd>
        </div>
      </dl>
    </div>
  );
}
