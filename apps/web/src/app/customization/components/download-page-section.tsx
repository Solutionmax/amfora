"use client";

import { useState } from "react";
import { IconLink, IconPhoto } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { LineList, LineRow } from "@/components/ui/line-list";
import { Switch } from "@/components/ui/switch";
import { useAppInfo } from "@/contexts/app-info-context";
import { removeBrandingImage, uploadBrandingImage, type BrandingImageKind } from "@/http/endpoints";
import type { CustomizationDraft } from "../hooks/use-customization-draft";
import { FormBlock } from "./form-block";
import { ImageUploadField } from "./image-upload-field";

/** Cover and link preview images (saved at once), playback and the credit line (saved with the SaveBar). */
export function DownloadPageSection({
  draft,
  update,
  hasBrandpack,
}: Pick<CustomizationDraft, "draft" | "update" | "hasBrandpack">) {
  const t = useTranslations();
  const { appShareCover, appLinkPreview, refreshAppInfo } = useAppInfo();
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
    upload: t("customization.calm.upload"),
    replace: t("customization.v2.downloadPage.replace"),
    remove: t("customization.v2.downloadPage.remove"),
  };

  const imageRow = (kind: BrandingImageKind, info: { version: string } | null, key: "cover" | "linkPreview") => (
    <ImageUploadField
      icon={key === "cover" ? <IconPhoto /> : <IconLink />}
      label={t(`customization.calm.${key}`)}
      hint={t(`customization.calm.${key}Hint`)}
      src={info ? `/api/app/${kind}?v=${encodeURIComponent(info.version)}` : null}
      disabled={busy}
      onUpload={(file) => run(() => uploadBrandingImage(kind, file))}
      onRemove={() => run(() => removeBrandingImage(kind))}
      labels={labels}
    />
  );

  return (
    <FormBlock
      title={t("customization.v2.downloadPage.title")}
      description={t("customization.calm.downloadDescription")}
    >
      <LineList className="-my-3 min-w-0">
        {imageRow("share-cover", appShareCover, "cover")}
        {imageRow("link-preview", appLinkPreview, "linkPreview")}
        <LineRow
          title={<label htmlFor="share-playback">{t("customization.calm.playback")}</label>}
          sub={t("customization.calm.playbackHint")}
        >
          <Switch id="share-playback" checked={draft.playback} onCheckedChange={(on) => update("playback", on)} />
        </LineRow>
        <LineRow
          title={<label htmlFor="show-credit">{t("customization.v2.pack.credit")}</label>}
          sub={hasBrandpack ? t("customization.calm.creditHint") : t("customization.calm.creditLocked")}
        >
          <Switch
            id="show-credit"
            checked={draft.showCredit}
            disabled={!hasBrandpack}
            onCheckedChange={(show) => update("showCredit", show)}
          />
        </LineRow>
      </LineList>
    </FormBlock>
  );
}
