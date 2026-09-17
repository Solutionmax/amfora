"use client";

import { useRef, useState } from "react";
import { IconDownload, IconFolder, IconShieldCheck } from "@tabler/icons-react";
import { format } from "date-fns";
import { useTranslations } from "next-intl";

import { Stage } from "@/components/brand/stage";
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
    <Stage
      object={<Vessel level={level} strata={itemCount} sealed={!opened} className="h-10 w-9 opacity-90" />}
      caption={opened ? t("share.opened") : t("share.sealed")}
    >
      <div className="space-y-8">
        <header className="space-y-5">
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-primary">
            <IconShieldCheck className="size-4" />
            <span>{t("share.pageTitle")}</span>
          </div>
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0 max-w-2xl">
              <h1 className="break-words font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl">
                {name}
              </h1>
              {description && (
                <p className="mt-4 max-w-xl break-words leading-7 text-muted-foreground">{description}</p>
              )}
            </div>
            <Button size="lg" className="h-12 shrink-0 rounded-lg px-6 sm:px-8" onClick={download}>
              <IconDownload className="size-5" />
              {opened ? (single ? t("share.download") : t("share.downloadAll")) : t("share.breakSeal")}
            </Button>
          </div>
        </header>

        <dl
          className={`grid grid-cols-2 gap-px overflow-hidden rounded-xl border bg-border font-mono text-xs ${
            expiration ? "sm:grid-cols-3" : "sm:grid-cols-2"
          }`}
        >
          <div className="bg-background px-4 py-3">
            <dt className="text-muted-foreground">{t("share.itemCount", { count: itemCount })}</dt>
            <dd className="mt-1 text-sm text-foreground">{formatFileSize(totalBytes)}</dd>
          </div>
          {expiration && (
            <div className="bg-background px-4 py-3">
              <dt className="text-muted-foreground">{t("home.visual.expires")}</dt>
              <dd className="mt-1 text-sm text-foreground">{format(new Date(expiration), "dd-MM-yyyy")}</dd>
            </div>
          )}
          <div className="bg-background px-4 py-3">
            <dt className="text-muted-foreground">{t("home.visual.downloads")}</dt>
            <dd className="mt-1 text-sm text-foreground">
              {views}
              {maxViews ? ` / ${maxViews}` : ""}
            </dd>
          </div>
        </dl>

        {itemCount > 0 && (
          <section className="overflow-hidden rounded-2xl border bg-background" aria-labelledby="share-files-heading">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-secondary/30 px-4 py-4 sm:px-5">
              <div>
                <h2 id="share-files-heading" className="font-display text-lg font-bold">
                  {t("share.itemCount", { count: itemCount })}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">{formatFileSize(totalBytes)}</p>
              </div>
              {itemCount > 1 && (
                <Button variant="outline" size="sm" className="rounded-lg" onClick={download}>
                  <IconDownload className="size-4" />
                  {t("share.downloadAll")}
                </Button>
              )}
            </div>
            <ul className="divide-y">
              {folders.map((folder) => (
                <li key={folder.id} className="flex min-w-0 items-center gap-3 px-4 py-3.5 sm:px-5">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <IconFolder className="size-4 text-primary" />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{folder.name}</span>
                  <button
                    type="button"
                    onClick={() => onDownloadFolder(folder.id, folder.name)}
                    aria-label={`${t("share.download")} ${folder.name}`}
                    className="shrink-0 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <IconDownload className="size-4" />
                  </button>
                </li>
              ))}
              {files.map((file) => {
                const { icon: Icon, color } = getFileIcon(file.name);
                return (
                  <li key={file.id} className="flex min-w-0 items-center gap-3 px-4 py-3.5 sm:px-5">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary">
                      <Icon className={`size-4 ${color}`} />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{file.name}</span>
                    <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                      {formatFileSize(Number(file.size || 0))}
                    </span>
                    <button
                      type="button"
                      onClick={() => onDownload(file.objectName, file.name)}
                      aria-label={`${t("share.download")} ${file.name}`}
                      className="shrink-0 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <IconDownload className="size-4" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </div>
    </Stage>
  );
}
