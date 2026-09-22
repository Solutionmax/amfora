"use client";

import { useTranslations } from "next-intl";

import { BrandCredit } from "@/components/brand/brand-credit";
import { BrandMark } from "@/components/brand/brand-mark";
import { Cover } from "@/components/brand/cover";
import { coverImageSrc } from "@/components/brand/cover-pick";
import { FileManifest } from "@/components/brand/file-manifest";
import { Button } from "@/components/ui/button";
import { useAppInfo } from "@/contexts/app-info-context";

/** A small download page that reads the live brand, so every change is visible at once. */
export function PreviewPanel() {
  const t = useTranslations();
  const { appName, appBackground, appShareCover } = useAppInfo();

  return (
    <div className="card-soft rounded-[calc(var(--radius)+4px)] border border-line bg-surface p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display text-sm font-semibold">{t("customization.v2.preview.title")}</h3>
        <span className="text-xs text-ink-3">{t("customization.v2.preview.page")}</span>
      </div>
      <div
        className={`stage grain rounded-[var(--radius)] border border-line p-4 ${appBackground ? "stage-image" : ""}`}
        style={{ fontSize: 12 }}
      >
        <div className="mb-3 flex items-center gap-2">
          <BrandMark className="size-5 text-primary" />
          <span className="font-display text-[13px] font-semibold">{appName}</span>
        </div>
        <div className="float">
          <Cover
            compact
            coverSrc={coverImageSrc(appShareCover)}
            files={[
              { name: "launch-video.mp4", kind: "video" },
              { name: "poster.pdf", kind: "document" },
            ]}
            caption={t("public.kind.video")}
          />
          <div className="px-3 py-3">
            <FileManifest
              compact
              items={[
                { id: "1", name: "launch-video.mp4", kind: "video", size: 231 * 1024 * 1024 },
                { id: "2", name: "poster.pdf", kind: "document", size: 15 * 1024 * 1024 },
              ]}
            />
            <Button size="sm" className="mt-2.5 w-full">
              {t("share.downloadAll")}
            </Button>
          </div>
        </div>
        <div className="mt-3 flex justify-center text-[11px]">
          <BrandCredit className="text-[11px] text-ink-3" />
        </div>
      </div>
    </div>
  );
}
