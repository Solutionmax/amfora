"use client";

import { useEffect, useState } from "react";
import { IconUser } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { LogoInput } from "@/app/settings/components/logo-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppInfo } from "@/contexts/app-info-context";
import { updateConfig } from "@/http/endpoints";
import { Section } from "./section";

export function BrandSection() {
  const t = useTranslations();
  const { appName, appDescription, refreshAppInfo } = useAppInfo();
  const [name, setName] = useState(appName);
  const [description, setDescription] = useState(appDescription);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => setName(appName), [appName]);
  useEffect(() => setDescription(appDescription), [appDescription]);

  const dirty = name !== appName || description !== appDescription;

  const save = async () => {
    setIsSaving(true);
    try {
      await updateConfig("appName", { value: name.trim() });
      await updateConfig("appDescription", { value: description.trim() });
      await refreshAppInfo();
      toast.success(t("customization.v2.saved"));
    } catch {
      toast.error(t("customization.v2.saveFailed"));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Section
      icon={IconUser}
      title={t("customization.v2.brand.title")}
      aside={
        dirty && (
          <Button size="sm" onClick={save} disabled={isSaving || !name.trim()}>
            {t("customization.v2.save")}
          </Button>
        )
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="brand-name">{t("customization.v2.brand.name")}</Label>
          <Input id="brand-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="brand-description">{t("customization.v2.brand.description")}</Label>
          <Input
            id="brand-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={160}
          />
        </div>
      </div>
      <div>
        <Label>{t("customization.v2.brand.logo")}</Label>
        <p className="mb-2 mt-0.5 text-xs text-ink-3">{t("customization.v2.brand.logoHint")}</p>
        <LogoInput onChange={() => refreshAppInfo()} />
      </div>
    </Section>
  );
}
