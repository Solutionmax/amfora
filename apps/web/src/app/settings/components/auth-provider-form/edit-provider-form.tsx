"use client";

import React, { useState } from "react";
import { IconEye, IconEyeOff } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Field } from "@/components/ui/form-section";
import { IconPicker } from "@/components/ui/icon-picker-lazy";
import { Input } from "@/components/ui/input";
import { LineRow } from "@/components/ui/line-list";
import { Switch } from "@/components/ui/switch";
import { TagsInput } from "@/components/ui/tags-input";
import { CallbackUrlDisplay } from "./callback-url-display";
import { FormNote, MethodRadios } from "./configuration-method-selector";
import { ProviderTypeSelect } from "./provider-type-select";

export interface AuthProvider {
  id: string;
  name: string;
  displayName: string;
  type: string;
  icon?: string;
  enabled: boolean;
  issuerUrl?: string;
  clientId?: string;
  hasClientSecret: boolean;
  scope?: string;
  autoRegister: boolean;
  adminEmailDomains?: string;
  sortOrder: number;
  isOfficial?: boolean;
  authorizationEndpoint?: string;
  tokenEndpoint?: string;
  userInfoEndpoint?: string;
}

interface EditProviderFormProps {
  provider: AuthProvider;
  onSave: (data: Partial<AuthProvider>) => void;
  onCancel: () => void;
  saving: boolean;
  editingFormData: Record<string, any>;
  setEditingFormData: (data: Record<string, any>) => void;
  /** Custom providers can be deleted from the form; official ones cannot. */
  onDelete?: () => void;
}

export function EditProviderForm({
  provider,
  onSave,
  onCancel,
  saving,
  editingFormData,
  setEditingFormData,
  onDelete,
}: EditProviderFormProps) {
  const t = useTranslations();
  const savedData = editingFormData[provider.id] || {};
  const [formData, setFormData] = useState({
    name: savedData.name || provider.name || "",
    displayName: savedData.displayName || provider.displayName || "",
    type: (savedData.type || provider.type) as "oidc" | "oauth2",
    icon: savedData.icon || provider.icon || "FaCog",
    issuerUrl: savedData.issuerUrl || provider.issuerUrl || "",
    clientId: savedData.clientId || provider.clientId || "",
    clientSecret: savedData.clientSecret || "",
    scope: savedData.scope || provider.scope || "",
    autoRegister: savedData.autoRegister !== undefined ? savedData.autoRegister : provider.autoRegister,
    adminEmailDomains: savedData.adminEmailDomains || provider.adminEmailDomains || "",
    authorizationEndpoint: savedData.authorizationEndpoint || provider.authorizationEndpoint || "",
    tokenEndpoint: savedData.tokenEndpoint || provider.tokenEndpoint || "",
    userInfoEndpoint: savedData.userInfoEndpoint || provider.userInfoEndpoint || "",
  });

  const [showClientSecret, setShowClientSecret] = useState(false);
  const isOfficial = provider.isOfficial;

  const isProviderUrlEditable = (providerName: string): boolean => {
    const nonEditableProviders = ["google", "discord", "github"];
    return !nonEditableProviders.includes(providerName.toLowerCase());
  };

  const canEditProviderUrl = isProviderUrlEditable(provider.name);

  const updateFormData = (updates: Partial<typeof formData>) => {
    const newFormData = { ...formData, ...updates };
    setFormData(newFormData);

    setEditingFormData({
      ...editingFormData,
      [provider.id]: newFormData,
    });
  };

  const detectProviderTypeAndSuggestScopesEdit = (url: string, currentType: string): string[] => {
    if (!url) return [];

    const urlLower = url.toLowerCase();

    const providerPatterns = [
      { pattern: "frontegg.com", scopes: ["openid", "profile", "email"] },
      { pattern: "discord.com", scopes: ["identify", "email"] },
      { pattern: "github.com", scopes: ["read:user", "user:email"] },
      { pattern: "gitlab.com", scopes: ["read_user", "read_api"] },
      { pattern: "google.com", scopes: ["openid", "profile", "email"] },
      { pattern: "microsoft.com", scopes: ["openid", "profile", "email", "User.Read"] },
      { pattern: "facebook.com", scopes: ["public_profile", "email"] },
      { pattern: "twitter.com", scopes: ["tweet.read", "users.read"] },
      { pattern: "linkedin.com", scopes: ["r_liteprofile", "r_emailaddress"] },
      { pattern: "auth0.com", scopes: ["openid", "profile", "email"] },
      { pattern: "okta.com", scopes: ["openid", "profile", "email"] },
      { pattern: "authentik", scopes: ["openid", "profile", "email"] },
      { pattern: "kinde.com", scopes: ["openid", "profile", "email"] },
      { pattern: "zitadel.com", scopes: ["openid", "profile", "email"] },
      { pattern: "pocketid", scopes: ["openid", "profile", "email"] },
    ];

    for (const { pattern, scopes } of providerPatterns) {
      if (urlLower.includes(pattern)) {
        return scopes;
      }
    }

    if (currentType === "oidc") {
      return ["openid", "profile", "email"];
    } else {
      return ["profile", "email"];
    }
  };

  const updateProviderUrlEdit = (url: string) => {
    if (!url.trim()) return;

    if (isOfficial) {
      return;
    }

    const suggestedScopes = detectProviderTypeAndSuggestScopesEdit(url, formData.type);
    const shouldUpdateScopes =
      !formData.scope || formData.scope === "openid profile email" || formData.scope === "profile email";

    if (shouldUpdateScopes) {
      updateFormData({
        scope: suggestedScopes.join(" "),
      });
    }
  };

  const handleSubmit = () => {
    onSave(formData);
  };

  const isManualMode = !!(formData.authorizationEndpoint || formData.tokenEndpoint || formData.userInfoEndpoint);

  return (
    <div className="grid gap-4">
      {isOfficial && (
        <FormNote title={t("authProviders.info.officialProvider")}>
          {t("authProviders.info.officialProviderDescription")}
        </FormNote>
      )}

      <CallbackUrlDisplay providerName={formData.name || "provider"} />

      {!isOfficial && (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={`${t("authProviders.form.providerName")} *`} htmlFor="edit-provider-name">
              <Input
                id="edit-provider-name"
                placeholder={t("authProviders.form.providerNamePlaceholder")}
                value={formData.name}
                onChange={(e) => updateFormData({ name: e.target.value })}
              />
            </Field>
            <Field label={`${t("authProviders.form.displayName")} *`} htmlFor="edit-provider-display">
              <Input
                id="edit-provider-display"
                placeholder={t("authProviders.form.displayNamePlaceholder")}
                value={formData.displayName}
                onChange={(e) => updateFormData({ displayName: e.target.value })}
              />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("authProviders.form.type")} htmlFor="edit-provider-type">
              <ProviderTypeSelect
                id="edit-provider-type"
                value={formData.type}
                onChange={(type) => updateFormData({ type })}
              />
            </Field>
            <Field label={t("authProviders.form.icon")}>
              <IconPicker
                value={formData.icon}
                onChange={(icon) => updateFormData({ icon })}
                placeholder={t("authProviders.form.iconPlaceholder")}
              />
            </Field>
          </div>

          <MethodRadios
            name="editConfigMethod"
            isManual={isManualMode}
            onAuto={() => updateFormData({ authorizationEndpoint: "", tokenEndpoint: "", userInfoEndpoint: "" })}
            onManual={() => {
              if (!isManualMode) {
                updateFormData({
                  authorizationEndpoint: "/oauth/authorize",
                  tokenEndpoint: "/oauth/token",
                  userInfoEndpoint: "/oauth/userinfo",
                });
              }
            }}
          />

          <Field
            label={`${t("authProviders.form.providerUrl")} *`}
            htmlFor="edit-provider-url"
            hint={
              isManualMode ? t("authProviders.form.manualConfigurationHelp") : t("authProviders.form.autoDiscoveryHelp")
            }
          >
            <Input
              id="edit-provider-url"
              placeholder={
                isManualMode
                  ? t("authProviders.form.providerUrlManualPlaceholder")
                  : t("authProviders.form.providerUrlAutoPlaceholder")
              }
              value={formData.issuerUrl}
              onChange={(e) => updateFormData({ issuerUrl: e.target.value })}
              onBlur={(e) => updateProviderUrlEdit(e.target.value)}
            />
          </Field>

          {isManualMode && (
            <>
              <Field label={`${t("authProviders.form.authorizationEndpoint")} *`} htmlFor="edit-auth-endpoint">
                <Input
                  id="edit-auth-endpoint"
                  placeholder={t("authProviders.form.authorizationEndpointPlaceholder")}
                  value={formData.authorizationEndpoint}
                  onChange={(e) => updateFormData({ authorizationEndpoint: e.target.value })}
                />
              </Field>
              <Field label={`${t("authProviders.form.tokenEndpoint")} *`} htmlFor="edit-token-endpoint">
                <Input
                  id="edit-token-endpoint"
                  placeholder={t("authProviders.form.tokenEndpointPlaceholder")}
                  value={formData.tokenEndpoint}
                  onChange={(e) => updateFormData({ tokenEndpoint: e.target.value })}
                />
              </Field>
              <Field label={`${t("authProviders.form.userInfoEndpoint")} *`} htmlFor="edit-userinfo-endpoint">
                <Input
                  id="edit-userinfo-endpoint"
                  placeholder={t("authProviders.form.userInfoEndpointPlaceholder")}
                  value={formData.userInfoEndpoint}
                  onChange={(e) => updateFormData({ userInfoEndpoint: e.target.value })}
                />
              </Field>
              <FormNote title={t("authProviders.info.manualConfigTitle")}>
                {t("authProviders.info.manualConfigDescription")}
              </FormNote>
            </>
          )}
        </>
      )}

      {isOfficial && (
        <>
          {canEditProviderUrl && (
            <Field
              label={`${t("authProviders.form.providerUrl")} *`}
              htmlFor="edit-provider-url"
              hint={t("authProviders.form.officialProviderHelp")}
            >
              <Input
                id="edit-provider-url"
                placeholder={t("authProviders.form.officialProviderUrlPlaceholder", {
                  displayName: provider.displayName,
                })}
                value={formData.issuerUrl}
                onChange={(e) => updateFormData({ issuerUrl: e.target.value })}
                onBlur={(e) => updateProviderUrlEdit(e.target.value)}
              />
            </Field>
          )}
          <Field label={t("authProviders.form.icon")} hint={t("authProviders.form.officialProviderIconHelp")}>
            <IconPicker
              value={formData.icon}
              onChange={(icon) => updateFormData({ icon })}
              placeholder={t("authProviders.form.iconPlaceholder")}
            />
          </Field>
        </>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={`${t("authProviders.form.clientId")} *`} htmlFor="edit-client-id">
          <Input
            id="edit-client-id"
            autoComplete="off"
            placeholder={t("authProviders.form.clientIdPlaceholder")}
            value={formData.clientId}
            onChange={(e) => updateFormData({ clientId: e.target.value })}
          />
        </Field>
        <Field label={t("authProviders.form.clientSecret")} htmlFor="edit-client-secret">
          <div className="relative">
            <Input
              id="edit-client-secret"
              type={showClientSecret ? "text" : "password"}
              autoComplete="new-password"
              placeholder={t("authProviders.form.clientSecretPlaceholder")}
              value={formData.clientSecret}
              onChange={(e) => updateFormData({ clientSecret: e.target.value })}
              className="pr-11"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1"
              onClick={() => setShowClientSecret(!showClientSecret)}
              aria-label={t("authProviders.form.clientSecret")}
              aria-pressed={showClientSecret}
            >
              {showClientSecret ? <IconEyeOff aria-hidden="true" /> : <IconEye aria-hidden="true" />}
            </Button>
          </div>
        </Field>
      </div>

      <Field
        label={t("authProviders.form.oauthScopes")}
        hint={
          formData.type === "oidc" ? t("authProviders.form.scopesHelpOidc") : t("authProviders.form.scopesHelpOauth2")
        }
      >
        <TagsInput
          value={formData.scope ? formData.scope.split(/[,\s]+/).filter(Boolean) : []}
          onChange={(tags) => updateFormData({ scope: tags.join(" ") })}
          placeholder={t("authProviders.form.scopesPlaceholder")}
        />
      </Field>

      <Field label={t("authProviders.form.adminEmailDomains")} hint={t("authProviders.form.adminEmailDomainsHelp")}>
        <TagsInput
          value={formData.adminEmailDomains ? formData.adminEmailDomains.split(",").filter(Boolean) : []}
          onChange={(tags) => updateFormData({ adminEmailDomains: tags.join(",") })}
          placeholder={t("authProviders.form.adminEmailDomainsPlaceholder")}
        />
      </Field>

      <LineRow
        className="border-t border-line"
        title={<label htmlFor="edit-auto-register">{t("authProviders.form.autoRegister")}</label>}
      >
        <Switch
          id="edit-auto-register"
          checked={formData.autoRegister}
          onCheckedChange={(checked) => updateFormData({ autoRegister: checked })}
        />
      </LineRow>

      <DialogFooter className="sm:items-center">
        {onDelete && (
          <Button type="button" variant="destructive" onClick={onDelete} disabled={saving} className="sm:mr-auto">
            {t("authProviders.deleteProvider")}
          </Button>
        )}
        <Button type="button" variant="ghost" onClick={onCancel}>
          {t("authProviders.buttons.cancel")}
        </Button>
        <Button type="button" onClick={handleSubmit} disabled={saving}>
          {saving ? t("authProviders.buttons.saving") : t("authProviders.buttons.saveProvider")}
        </Button>
      </DialogFooter>
    </div>
  );
}
