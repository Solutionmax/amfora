"use client";

import { useRef, useState } from "react";
import { IconDownload, IconFolder } from "@tabler/icons-react";
import { format } from "date-fns";
import { useTranslations } from "next-intl";

import { Vessel } from "@/components/brand/vessel";
import { Button } from "@/components/ui/button";
import { getFileIcon } from "@/utils/file-icons";
import { formatFileSize } from "@/utils/format-file-size";

interface StageFile {
  id: string;
  name: string;
  size: number | string;
  objectName: string;
}

interface StageFolder {
  id: string;
  name: string;
}

/** Receiving a share is opening a sealed vessel: break the seal, the contents pour out. */
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
  files: StageFile[];
  folders: StageFolder[];
  onDownload: (objectName: string, fileName: string) => Promise<void>;
  onDownloadFolder: (folderId: string, folderName: string) => Promise<void>;
  onBulkDownload?: () => Promise<void>;
}) {
  const t = useTranslations();
  const [level, setLevel] = useState(1);
  const [opened, setOpened] = useState(false);
  const frame = useRef<number | null>(null);

  const itemCount = files.length + folders.length;
  const totalBytes = files.reduce((sum, file) => sum + Number(file.size || 0), 0);
  const single = itemCount === 1 && files.length === 1;

  const pour = () => {
    setOpened(true);
    if (frame.current) cancelAnimationFrame(frame.current);
    const start = performance.now();
    const step = (now: number) => {
      const progress = Math.min((now - start) / 1600, 1);
      setLevel(1 - progress);
      if (progress < 1) frame.current = requestAnimationFrame(step);
      else frame.current = null;
    };
    frame.current = requestAnimationFrame(step);
  };

  const download = () => {
    pour();
    if (single) return onDownload(files[0].objectName, files[0].name);
    return onBulkDownload?.();
  };

  return (
    <div className="grid w-full max-w-5xl items-center gap-12 lg:grid-cols-[320px_minmax(0,1fr)] lg:gap-20">
      <div className="mx-auto w-full max-w-[280px]">
        <Vessel level={level} strata={itemCount} sealed={!opened} className="h-[340px] w-full text-foreground" />
        {/* The shelf the vessel stands on, and its label. */}
        <div className="mt-2 border-t pt-3 text-center font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          {opened ? t("share.opened") : t("share.sealed")}
        </div>
      </div>

      <div>
        <h1 className="font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl">{name}</h1>
        {description && <p className="mt-3 max-w-md text-muted-foreground">{description}</p>}

        <dl className="mt-8 max-w-md divide-y border-y font-mono text-xs">
          <div className="flex items-center justify-between gap-4 py-3">
            <dt className="text-muted-foreground">{t("share.itemCount", { count: itemCount })}</dt>
            <dd>{formatFileSize(totalBytes)}</dd>
          </div>
          {expiration && (
            <div className="flex items-center justify-between gap-4 py-3">
              <dt className="text-muted-foreground">{t("home.visual.expires")}</dt>
              <dd>{format(new Date(expiration), "dd-MM-yyyy")}</dd>
            </div>
          )}
          <div className="flex items-center justify-between gap-4 py-3">
            <dt className="text-muted-foreground">{t("home.visual.downloads")}</dt>
            <dd>
              {views}
              {maxViews ? ` / ${maxViews}` : ""}
            </dd>
          </div>
        </dl>

        <Button size="lg" className="mt-8 px-8" onClick={download}>
          <IconDownload className="size-5" />
          {opened ? (single ? t("share.download") : t("share.downloadAll")) : t("share.breakSeal")}
        </Button>

        {itemCount > 1 && (
          <ul className="mt-8 max-w-md divide-y border-t">
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
      </div>
    </div>
  );
}
