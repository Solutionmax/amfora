"use client";

import { useState } from "react";
import { IconCircleCheck, IconLock, IconPhoto } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/form-section";
import { LineList, LineRow } from "@/components/ui/line-list";
import { Textarea } from "@/components/ui/textarea";
import { useAppInfo } from "@/contexts/app-info-context";
import { activateBrandpack, removeBackground, removeBrandpack, uploadBackground } from "@/http/endpoints";
import { DEFAULT_BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils";
import type { CustomizationDraft } from "../hooks/use-customization-draft";
import { FormBlock } from "./form-block";
import { ImageUploadField } from "./image-upload-field";

const BRANDPACK_URL = `${DEFAULT_BRAND.url}brandpack`;

/** White label: activate or remove the pack (at once), background image (at once), custom CSS (SaveBar). */
export function BrandpackSection({
  draft,
  update,
  hasBrandpack,
}: Pick<CustomizationDraft, "draft" | "update" | "hasBrandpack">) {
  const t = useTranslations();
  const { brandpack, appBackground, refreshAppInfo } = useAppInfo();
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);

  const run = async (action: () => Promise<unknown>, done: string) => {
    setBusy(true);
    try {
      await action();
      await refreshAppInfo();
      toast.success(done);
      return true;
    } catch (error: any) {
      toast.error(error?.response?.data?.error || t("customization.v2.saveFailed"));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const activate = async () => {
    const ok = await run(() => activateBrandpack(token.trim()), t("customization.v2.pack.activated"));
    if (ok) setToken("");
  };
  const deactivate = () => run(() => removeBrandpack(), t("customization.v2.pack.removed"));

  return (
    <FormBlock title={t("customization.calm.packTitle")} description={t("customization.calm.packDescription")}>
      {brandpack ? (
        <LineList className="-my-3 min-w-0">
          <LineRow
            icon={<IconCircleCheck className="text-ok" />}
            title={t("customization.calm.packActive", { organisation: brandpack.organisation })}
            sub={t("customization.calm.packIssued", { date: brandpack.issuedAt })}
          >
            <Button type="button" variant="ghost" size="sm" onClick={deactivate} disabled={busy}>
              {t("customization.v2.pack.remove")}
            </Button>
          </LineRow>
        </LineList>
      ) : (
        <>
          <LineList className="-my-3 min-w-0">
            <LineRow
              icon={<IconLock />}
              title={t("customization.v2.pack.unlockTitle")}
              sub={t("customization.v2.pack.unlockText")}
            >
              <Button variant="link" className="h-auto px-0" asChild>
                <a href={BRANDPACK_URL} target="_blank" rel="noopener noreferrer">
                  {t("customization.v2.pack.buy")}
                </a>
              </Button>
            </LineRow>
          </LineList>
          <Field
            label={t("customization.calm.packKey")}
            htmlFor="brandpack-key"
            hint={t("customization.calm.packKeyHint")}
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
              <Textarea
                id="brandpack-key"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder={t("customization.v2.pack.paste")}
                rows={2}
                spellCheck={false}
                className="mono min-h-0 flex-1 text-[12.5px]"
              />
              <Button type="button" variant="outline" onClick={activate} disabled={busy || !token.trim()}>
                {t("customization.v2.pack.activate")}
              </Button>
            </div>
          </Field>
        </>
      )}

      <div className={cn("grid min-w-0 gap-[18px]", !hasBrandpack && "opacity-55")} aria-disabled={!hasBrandpack}>
        <LineList className="-my-3 min-w-0">
          <ImageUploadField
            icon={<IconPhoto />}
            label={t("customization.v2.pack.background")}
            hint={t("customization.v2.pack.backgroundHint")}
            src={appBackground ? "/api/app/background" : null}
            disabled={busy || !hasBrandpack}
            onUpload={(file) => run(() => uploadBackground(file), t("customization.v2.saved"))}
            onRemove={() => run(() => removeBackground(), t("customization.v2.saved"))}
            labels={{
              upload: t("customization.calm.upload"),
              replace: t("customization.v2.pack.backgroundReplace"),
              remove: t("customization.v2.pack.backgroundRemove"),
            }}
          />
        </LineList>
        <Field label={t("customization.v2.pack.css")} htmlFor="custom-css" hint={t("customization.v2.pack.cssHint")}>
          <Textarea
            id="custom-css"
            value={draft.css}
            onChange={(e) => update("css", e.target.value)}
            rows={5}
            spellCheck={false}
            placeholder=".btn-primary { … }"
            className="mono text-[12.5px]"
            disabled={!hasBrandpack}
          />
        </Field>
      </div>
    </FormBlock>
  );
}
