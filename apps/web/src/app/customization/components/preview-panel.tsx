"use client";

import { useTranslations } from "next-intl";

import { BrandMark } from "@/components/brand/brand-mark";
import { Cover } from "@/components/brand/cover";
import { coverImageSrc } from "@/components/brand/cover-pick";
import { FileManifest } from "@/components/brand/file-manifest";
import { Button } from "@/components/ui/button";
import { useAppInfo } from "@/contexts/app-info-context";
import { DEFAULT_BRAND } from "@/lib/brand";

const MB = 1024 * 1024;

/** A small download page in a quiet browser frame. Reads the draft, so every change shows before saving. */
export function PreviewPanel({ name, showCredit }: { name: string; showCredit: boolean }) {
  const t = useTranslations();
  const { appBackground, appShareCover, appLogo } = useAppInfo();

  return (
    <aside aria-label={t("customization.v2.preview.title")}>
      <div className="mb-2.5 flex items-center justify-between text-[12.5px] text-ink-3">
        <span>{t("customization.v2.preview.title")}</span>
        <span>{t("customization.v2.preview.page")}</span>
      </div>
      <div className="overflow-hidden rounded-[14px] border border-line">
        <div aria-hidden="true" className="flex gap-1.5 border-b border-line bg-surface-2 px-3 py-2">
          <i className="size-1.5 rounded-full bg-line-2" />
          <i className="size-1.5 rounded-full bg-line-2" />
          <i className="size-1.5 rounded-full bg-line-2" />
        </div>
        <div className={`stage grain px-5 pb-4 pt-5 ${appBackground ? "stage-image" : ""}`} style={{ fontSize: 12 }}>
          <div className="mx-auto max-w-[260px]">
            <div className="mb-3 flex items-center gap-2">
              {appLogo ? (
                <img src={appLogo} alt="" className="size-5 object-contain" />
              ) : (
                <BrandMark className="size-5 text-primary" />
              )}
              <span className="truncate font-display text-[13px] font-semibold">{name}</span>
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
                    { id: "1", name: "launch-video.mp4", kind: "video", size: 231 * MB },
                    { id: "2", name: "poster.pdf", kind: "document", size: 15 * MB },
                  ]}
                />
                <Button size="sm" className="pointer-events-none mt-2.5 w-full" tabIndex={-1}>
                  {t("share.downloadAll")}
                </Button>
              </div>
            </div>
          </div>
          <p className="mt-4 text-center text-[11px] text-ink-3" aria-hidden={!showCredit}>
            {showCredit && (
              <>
                {t("footer.poweredBy")} <strong>{DEFAULT_BRAND.name}</strong>
              </>
            )}
          </p>
        </div>
      </div>
    </aside>
  );
}
