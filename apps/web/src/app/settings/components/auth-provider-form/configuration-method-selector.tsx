"use client";

import React from "react";
import { IconInfoCircle } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { Field } from "@/components/ui/form-section";
import { Input } from "@/components/ui/input";
import type { NewProvider } from "@/http/endpoints/auth/types";
import { cn } from "@/lib/utils";

/** Two plain radio lines: discover the endpoints, or type them in. */
export function MethodRadios({
  name,
  isManual,
  onAuto,
  onManual,
}: {
  name: string;
  isManual: boolean;
  onAuto: () => void;
  onManual: () => void;
}) {
  const t = useTranslations();
  const options = [
    {
      id: `${name}-auto`,
      checked: !isManual,
      onChange: onAuto,
      title: t("authProviders.form.autoDiscovery"),
      hint: t("authProviders.form.autoDiscoveryDescription"),
    },
    {
      id: `${name}-manual`,
      checked: isManual,
      onChange: onManual,
      title: t("authProviders.form.manualEndpoints"),
      hint: t("authProviders.form.manualEndpointsDescription"),
    },
  ];

  return (
    <fieldset className="grid gap-1.5">
      <legend className="mb-1.5 text-[13px] font-medium text-ink-2">
        {t("authProviders.form.configurationMethod")}
      </legend>
      {options.map((option) => (
        <label
          key={option.id}
          htmlFor={option.id}
          className={cn(
            "flex cursor-pointer items-start gap-2.5 rounded-[var(--radius)] border px-3 py-2.5 transition-colors",
            option.checked ? "border-primary bg-primary-soft/40" : "border-line-2 hover:bg-surface-2"
          )}
        >
          <input
            type="radio"
            id={option.id}
            name={name}
            checked={option.checked}
            onChange={option.onChange}
            className="mt-0.5 size-4 accent-[var(--primary)]"
          />
          <span className="text-[13px]">
            <span className="block font-medium">{option.title}</span>
            <span className="block text-[12.5px] text-ink-3">{option.hint}</span>
          </span>
        </label>
      ))}
    </fieldset>
  );
}

/** A quiet note with an info icon, used where the old forms had tinted boxes. */
export function FormNote({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 text-[12.5px] text-ink-3">
      <IconInfoCircle className="mt-px size-4 shrink-0 text-ink-icon" aria-hidden="true" />
      <p>
        {title && <span className="font-medium text-ink-2">{title}. </span>}
        {children}
      </p>
    </div>
  );
}

interface ConfigurationMethodSelectorProps {
  provider: NewProvider;
  onUpdate: (updates: Partial<NewProvider>) => void;
  onUrlUpdate: (url: string) => void;
}

export function ConfigurationMethodSelector({ provider, onUpdate, onUrlUpdate }: ConfigurationMethodSelectorProps) {
  const t = useTranslations();
  const isManualMode = !!(provider.authorizationEndpoint || provider.tokenEndpoint || provider.userInfoEndpoint);

  return (
    <div className="grid gap-4">
      <MethodRadios
        name="addConfigMethod"
        isManual={isManualMode}
        onAuto={() => onUpdate({ authorizationEndpoint: "", tokenEndpoint: "", userInfoEndpoint: "" })}
        onManual={() => {
          if (!isManualMode) {
            onUpdate({
              authorizationEndpoint: "/oauth/authorize",
              tokenEndpoint: "/oauth/token",
              userInfoEndpoint: "/oauth/userinfo",
              issuerUrl: "",
            });
          }
        }}
      />

      <Field
        label={`${t("authProviders.form.providerUrl")} *`}
        htmlFor="add-provider-url"
        hint={
          isManualMode ? t("authProviders.form.manualConfigurationHelp") : t("authProviders.form.autoDiscoveryHelp")
        }
      >
        <Input
          id="add-provider-url"
          placeholder={
            isManualMode
              ? t("authProviders.form.providerUrlManualPlaceholder")
              : t("authProviders.form.providerUrlAutoPlaceholder")
          }
          value={provider.issuerUrl}
          onChange={(e) => onUpdate({ issuerUrl: e.target.value })}
          onBlur={(e) => onUrlUpdate(e.target.value)}
        />
      </Field>

      {isManualMode && (
        <>
          <Field label={`${t("authProviders.form.authorizationEndpoint")} *`} htmlFor="add-auth-endpoint">
            <Input
              id="add-auth-endpoint"
              placeholder={t("authProviders.form.authorizationEndpointPlaceholder")}
              value={provider.authorizationEndpoint}
              onChange={(e) => onUpdate({ authorizationEndpoint: e.target.value })}
            />
          </Field>
          <Field label={`${t("authProviders.form.tokenEndpoint")} *`} htmlFor="add-token-endpoint">
            <Input
              id="add-token-endpoint"
              placeholder={t("authProviders.form.tokenEndpointPlaceholder")}
              value={provider.tokenEndpoint}
              onChange={(e) => onUpdate({ tokenEndpoint: e.target.value })}
            />
          </Field>
          <Field label={`${t("authProviders.form.userInfoEndpoint")} *`} htmlFor="add-userinfo-endpoint">
            <Input
              id="add-userinfo-endpoint"
              placeholder={t("authProviders.form.userInfoEndpointPlaceholder")}
              value={provider.userInfoEndpoint}
              onChange={(e) => onUpdate({ userInfoEndpoint: e.target.value })}
            />
          </Field>
          <FormNote title={t("authProviders.info.manualConfigTitle")}>
            {t("authProviders.info.manualConfigDescription")}
          </FormNote>
        </>
      )}
    </div>
  );
}
