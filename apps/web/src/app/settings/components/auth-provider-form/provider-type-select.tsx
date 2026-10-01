"use client";

import { useTranslations } from "next-intl";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type ProviderType = "oidc" | "oauth2";

export function ProviderTypeSelect({
  id,
  value,
  onChange,
}: {
  id: string;
  value: ProviderType;
  onChange: (value: ProviderType) => void;
}) {
  const t = useTranslations();

  return (
    <Select value={value} onValueChange={(next) => onChange(next as ProviderType)}>
      <SelectTrigger id={id} className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="oidc">{t("authProviders.form.typeOidc")}</SelectItem>
        <SelectItem value="oauth2">{t("authProviders.form.typeOauth2")}</SelectItem>
      </SelectContent>
    </Select>
  );
}
