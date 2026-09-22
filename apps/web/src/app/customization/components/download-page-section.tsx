"use client";

import { useState } from "react";
import { IconDownload } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Switch } from "@/components/ui/switch";
import { useAppInfo } from "@/contexts/app-info-context";
import { removeBrandingImage, updateConfig, uploadBrandingImage, type BrandingImageKind } from "@/http/endpoints";
import { ImageUploadField } from "./image-upload-field";
import { Section } from "./section";

/** Free settings for the public download page: its cover, the link preview, and playback. */
export function DownloadPageSection() {
  const t = useTranslations();
  const { appShareCover, appLinkPreview, appSharePlayback, refreshAppInfo } = useAppInfo();
  const [busy, setBusy] = useState(false);

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await action();
      await refreshAppInfo();
      toast.success(t("customization.v2.saved"));
    } catch (error: any) {
      toast.error(error?.response?.data?.error || t("customization.v2.saveFailed"));
    } finally {
      setBusy(false);
    }
  };

  const labels = {
    upload: t("customization.v2.downloadPage.upload"),
    replace: t("customization.v2.downloadPage.replace"),
    remove: t("customization.v2.downloadPage.remove"),
  };

  const imageField = (kind: BrandingImageKind, info: { version: string } | null, key: "cover" | "linkPreview") => (
    <ImageUploadField
      label={t(`customization.v2.downloadPage.${key}`)}
      hint={t(`customization.v2.downloadPage.${key}Hint`)}
      src={info ? `/api/app/${kind}?v=${encodeURIComponent(info.version)}` : null}
      disabled={busy}
      onUpload={(file) => run(() => uploadBrandingImage(kind, file))}
      onRemove={() => run(() => removeBrandingImage(kind))}
      labels={labels}
    />
  );

  return (
    <Section icon={IconDownload} title={t("customization.v2.downloadPage.title")}>
      {imageField("share-cover", appShareCover, "cover")}
      {imageField("link-preview", appLinkPreview, "linkPreview")}
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="font-medium">{t("customization.v2.downloadPage.playback")}</div>
          <div className="text-xs text-ink-3">{t("customization.v2.downloadPage.playbackHint")}</div>
        </div>
        <Switch
          checked={appSharePlayback}
          disabled={busy}
          aria-label={t("customization.v2.downloadPage.playback")}
          onCheckedChange={(on) => run(() => updateConfig("appSharePlayback", { value: on ? "true" : "false" }))}
        />
      </div>
    </Section>
  );
}
