"use client";

import { useEffect, useState } from "react";
import { IconCheck, IconLock } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useAppInfo } from "@/contexts/app-info-context";
import { activateBrandpack, removeBackground, removeBrandpack, updateConfig, uploadBackground } from "@/http/endpoints";
import { DEFAULT_BRAND } from "@/lib/brand";
import { ImageUploadField } from "./image-upload-field";
import { Section } from "./section";

const BRANDPACK_URL = `${DEFAULT_BRAND.url}brandpack`;

export function BrandpackSection() {
  const t = useTranslations();
  const { brandpack, appHideCredit, appBackground, appCustomCss, refreshAppInfo } = useAppInfo();
  const [token, setToken] = useState("");
  const [css, setCss] = useState(appCustomCss);
  const [busy, setBusy] = useState(false);

  useEffect(() => setCss(appCustomCss), [appCustomCss]);

  const run = async (action: () => Promise<unknown>, done: string) => {
    setBusy(true);
    try {
      await action();
      await refreshAppInfo();
      toast.success(done);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || t("customization.v2.saveFailed"));
    } finally {
      setBusy(false);
    }
  };

  const activate = () => run(() => activateBrandpack(token.trim()), t("customization.v2.pack.activated"));
  const deactivate = () => run(() => removeBrandpack(), t("customization.v2.pack.removed"));

  return (
    <Section
      icon={IconLock}
      title={t("customization.v2.pack.title")}
      aside={
        <Badge variant="info">
          <IconLock className="size-3" />
          {t("customization.v2.pack.paid")}
        </Badge>
      }
    >
      {brandpack ? (
        <div className="flex items-center gap-2.5 rounded-[var(--radius)] bg-ok-soft px-4 py-3 text-[13px] font-semibold text-ok">
          <IconCheck className="size-4" />
          {t("customization.v2.pack.active", { organisation: brandpack.organisation, date: brandpack.issuedAt })}
          <Button variant="ghost" size="sm" className="ml-auto text-ok" onClick={deactivate} disabled={busy}>
            {t("customization.v2.pack.remove")}
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3 rounded-[var(--radius)] border border-line bg-surface-2 p-4">
          <div className="flex items-start gap-3">
            <IconLock className="mt-0.5 size-[18px] shrink-0 text-ink-3" />
            <div className="flex-1">
              <div className="font-semibold">{t("customization.v2.pack.unlockTitle")}</div>
              <div className="text-xs text-ink-3">{t("customization.v2.pack.unlockText")}</div>
            </div>
            <Button size="sm" asChild>
              <a href={BRANDPACK_URL} target="_blank" rel="noopener noreferrer">
                {t("customization.v2.pack.buy")}
              </a>
            </Button>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Textarea
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder={t("customization.v2.pack.paste")}
              rows={2}
              className="mono min-h-0 flex-1 text-xs"
            />
            <Button variant="outline" onClick={activate} disabled={busy || !token.trim()}>
              {t("customization.v2.pack.activate")}
            </Button>
          </div>
        </div>
      )}

      <div className={brandpack ? "flex flex-col gap-5" : "pointer-events-none flex flex-col gap-5 opacity-45"}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="font-medium">{t("customization.v2.pack.credit")}</div>
            <div className="text-xs text-ink-3">{t("customization.v2.pack.creditHint")}</div>
          </div>
          <Switch
            checked={!appHideCredit}
            disabled={busy || !brandpack}
            onCheckedChange={(show) =>
              run(() => updateConfig("appHideCredit", { value: show ? "false" : "true" }), t("customization.v2.saved"))
            }
          />
        </div>

        <ImageUploadField
          label={t("customization.v2.pack.background")}
          hint={t("customization.v2.pack.backgroundHint")}
          src={appBackground ? "/api/app/background" : null}
          disabled={busy || !brandpack}
          onUpload={(file) => run(() => uploadBackground(file), t("customization.v2.saved"))}
          onRemove={() => run(() => removeBackground(), t("customization.v2.saved"))}
          labels={{
            upload: t("customization.v2.pack.backgroundUpload"),
            replace: t("customization.v2.pack.backgroundReplace"),
            remove: t("customization.v2.pack.backgroundRemove"),
          }}
        />

        <div className="space-y-1.5">
          <Label htmlFor="custom-css">{t("customization.v2.pack.css")}</Label>
          <p className="text-xs text-ink-3">{t("customization.v2.pack.cssHint")}</p>
          <Textarea
            id="custom-css"
            value={css}
            onChange={(e) => setCss(e.target.value)}
            rows={6}
            spellCheck={false}
            className="mono text-xs"
            disabled={!brandpack}
          />
          {css !== appCustomCss && (
            <Button
              size="sm"
              onClick={() => run(() => updateConfig("appCustomCss", { value: css }), t("customization.v2.saved"))}
              disabled={busy}
            >
              {t("customization.v2.pack.cssSave")}
            </Button>
          )}
        </div>
      </div>
    </Section>
  );
}
