"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { useAppInfo } from "@/contexts/app-info-context";
import { applyAppearance } from "@/hooks/use-appearance";
import { updateConfig } from "@/http/endpoints";
import { changedConfigs, isDraftDirty, isHexColor, pxToRem, rebaseDraft, remToPx, type BrandDraft } from "../lib/draft";
import { normalizeFont } from "../lib/fonts";

/** Put the stored colour, radius and font back on the page (after a discard, or when leaving). */
function applyStored(stored: BrandDraft) {
  applyAppearance("color", stored.color);
  applyAppearance("radius", pxToRem(stored.radiusPx));
  applyAppearance("font", stored.font);
}

/**
 * The customization form: one draft for every text and choice field, previewed live,
 * written when the SaveBar is pressed. Uploads and the brand pack still save at once.
 */
export function useCustomizationDraft() {
  const t = useTranslations();
  const info = useAppInfo();
  const hasBrandpack = !!info.brandpack;

  const stored = useMemo<BrandDraft>(
    () => ({
      name: info.appName,
      description: info.appDescription,
      color: info.appPrimaryColor,
      radiusPx: info.appRadius ? remToPx(info.appRadius) : remToPx(""),
      font: normalizeFont(info.appFontFamily),
      theme: info.appPublicTheme,
      showCredit: !info.appHideCredit,
      css: info.appCustomCss,
    }),
    [
      info.appName,
      info.appDescription,
      info.appPrimaryColor,
      info.appRadius,
      info.appFontFamily,
      info.appPublicTheme,
      info.appHideCredit,
      info.appCustomCss,
    ]
  );

  const [draft, setDraft] = useState<BrandDraft>(stored);
  const [saving, setSaving] = useState(false);
  const previous = useRef(stored);

  // A refresh (after an upload, say) must not wipe what is being edited.
  useEffect(() => {
    setDraft((current) => rebaseDraft(previous.current, stored, current));
    previous.current = stored;
  }, [stored]);

  // Leaving with unsaved colours: the rest of the app goes back to the stored look.
  useEffect(() => () => applyStored(previous.current), []);

  const update = useCallback(<K extends keyof BrandDraft>(field: K, value: BrandDraft[K]) => {
    setDraft((current) => ({ ...current, [field]: value }));
    if (field === "color" && isHexColor(value as string)) applyAppearance("color", (value as string).toLowerCase());
    if (field === "radiusPx") applyAppearance("radius", pxToRem(value as number));
    if (field === "font") applyAppearance("font", value as string);
  }, []);

  const discard = () => {
    setDraft(stored);
    applyStored(stored);
  };

  const save = async () => {
    if (!draft.name.trim()) {
      toast.error(t("customization.calm.nameRequired"));
      return;
    }
    if (draft.color && !isHexColor(draft.color)) {
      toast.error(t("customization.calm.colorInvalid"));
      return;
    }

    setSaving(true);
    try {
      const writes = changedConfigs(stored, draft, hasBrandpack ? [] : ["css", "showCredit"]);
      for (const write of writes) {
        await updateConfig(write.key, { value: write.value });
      }
      await info.refreshAppInfo();
      toast.success(t("customization.v2.saved"));
    } catch (error: any) {
      toast.error(error?.response?.data?.error || t("customization.v2.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  return {
    draft,
    update,
    dirty: isDraftDirty(stored, draft),
    saving,
    save,
    discard,
    hasBrandpack,
  };
}

export type CustomizationDraft = ReturnType<typeof useCustomizationDraft>;
