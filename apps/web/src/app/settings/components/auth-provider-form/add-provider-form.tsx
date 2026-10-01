"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field } from "@/components/ui/form-section";
import { IconPicker } from "@/components/ui/icon-picker";
import { Input } from "@/components/ui/input";
import { TagsInput } from "@/components/ui/tags-input";
import type { NewProvider } from "@/http/endpoints/auth/types";
import { CallbackUrlDisplay } from "./callback-url-display";
import { ConfigurationMethodSelector, FormNote } from "./configuration-method-selector";
import { ProviderTypeSelect } from "./provider-type-select";

interface AddProviderFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Resolves to true once the provider exists. */
  onAddProvider: (provider: NewProvider) => Promise<boolean>;
  saving: boolean;
}

/** A custom OpenID Connect or OAuth 2.0 provider, added in a dialog. */
export function AddProviderForm({ open, onOpenChange, onAddProvider, saving }: AddProviderFormProps) {
  const t = useTranslations();
  const [newProvider, setNewProvider] = useState<NewProvider>({
    name: "",
    displayName: "",
    type: "oidc",
    icon: "",
    clientId: "",
    clientSecret: "",
    issuerUrl: "",
    scope: "openid profile email",
    authorizationEndpoint: "",
    tokenEndpoint: "",
    userInfoEndpoint: "",
  });

  const detectProviderTypeAndSuggestScopes = (url: string): string[] => {
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
      { pattern: "authentik", scopes: ["openid", "profile", "email"] },
      { pattern: "keycloak", scopes: ["openid", "profile", "email"] },
      { pattern: "auth0.com", scopes: ["openid", "profile", "email"] },
      { pattern: "okta.com", scopes: ["openid", "profile", "email"] },
      { pattern: "onelogin.com", scopes: ["openid", "profile", "email"] },
      { pattern: "pingidentity.com", scopes: ["openid", "profile", "email"] },
      { pattern: "azure.com", scopes: ["openid", "profile", "email", "User.Read"] },
      { pattern: "aws.amazon.com", scopes: ["openid", "profile", "email"] },
      { pattern: "slack.com", scopes: ["identity.basic", "identity.email", "identity.avatar"] },
      { pattern: "bitbucket.org", scopes: ["account", "repository"] },
      { pattern: "atlassian.com", scopes: ["read:jira-user", "read:jira-work"] },
      { pattern: "salesforce.com", scopes: ["api", "refresh_token"] },
      { pattern: "zendesk.com", scopes: ["read"] },
      { pattern: "shopify.com", scopes: ["read_products", "read_customers"] },
      { pattern: "stripe.com", scopes: ["read"] },
      { pattern: "twilio.com", scopes: ["read"] },
      { pattern: "sendgrid.com", scopes: ["mail.send"] },
      { pattern: "mailchimp.com", scopes: ["read"] },
      { pattern: "hubspot.com", scopes: ["contacts", "crm.objects.contacts.read"] },
      { pattern: "zoom.us", scopes: ["user:read:admin"] },
      { pattern: "teams.microsoft.com", scopes: ["openid", "profile", "email", "User.Read"] },
      { pattern: "notion.so", scopes: ["read"] },
      { pattern: "figma.com", scopes: ["files:read"] },
      { pattern: "dropbox.com", scopes: ["files.content.read"] },
      { pattern: "box.com", scopes: ["root_readwrite"] },
      { pattern: "trello.com", scopes: ["read"] },
      { pattern: "asana.com", scopes: ["default"] },
      { pattern: "monday.com", scopes: ["read"] },
      { pattern: "clickup.com", scopes: ["read"] },
      { pattern: "linear.app", scopes: ["read"] },
      { pattern: "kinde.com", scopes: ["openid", "profile", "email"] },
      { pattern: "zitadel.com", scopes: ["openid", "profile", "email"] },
      { pattern: "pocketid", scopes: ["openid", "profile", "email"] },
    ];

    for (const { pattern, scopes } of providerPatterns) {
      if (urlLower.includes(pattern)) {
        return scopes;
      }
    }

    if (newProvider.type === "oidc") {
      return ["openid", "profile", "email"];
    } else {
      return ["profile", "email"];
    }
  };

  const updateProviderUrl = (url: string) => {
    if (!url.trim()) return;

    const suggestedScopes = detectProviderTypeAndSuggestScopes(url);

    setNewProvider((prev) => {
      const shouldUpdateScopes = !prev.scope || prev.scope === "openid profile email" || prev.scope === "profile email";

      return {
        ...prev,
        scope: shouldUpdateScopes ? suggestedScopes.join(" ") : prev.scope,
      };
    });
  };

  const handleSubmit = async () => {
    if (!newProvider.name || !newProvider.displayName || !newProvider.clientId || !newProvider.clientSecret) {
      toast.error(t("authProviders.messages.fillRequiredFields"));
      return;
    }

    const hasIssuerUrl = !!newProvider.issuerUrl;
    const hasAllCustomEndpoints = !!(
      newProvider.authorizationEndpoint &&
      newProvider.tokenEndpoint &&
      newProvider.userInfoEndpoint
    );

    if (!hasIssuerUrl && !hasAllCustomEndpoints) {
      toast.error(t("authProviders.messages.provideUrlOrEndpoints"));
      return;
    }

    if (hasIssuerUrl && hasAllCustomEndpoints) {
      toast.error(t("authProviders.messages.chooseDiscoveryOrManual"));
      return;
    }

    const added = await onAddProvider(newProvider);
    if (!added) return;

    onOpenChange(false);
    setNewProvider({
      name: "",
      displayName: "",
      type: "oidc",
      icon: "",
      clientId: "",
      clientSecret: "",
      issuerUrl: "",
      scope: "openid profile email",
      authorizationEndpoint: "",
      tokenEndpoint: "",
      userInfoEndpoint: "",
    });
  };

  const updateProvider = (updates: Partial<NewProvider>) => {
    setNewProvider((prev) => ({ ...prev, ...updates }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>{t("authProviders.calm.addTitle")}</DialogTitle>
          <DialogDescription>{t("authProviders.calm.addDescription")}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <FormNote>
            {t("authProviders.info.officialProvidersRecommended")}{" "}
            <a
              href="https://solutionmax.net"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary hover:underline"
            >
              {t("authProviders.info.github")}
            </a>
            .
          </FormNote>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={`${t("authProviders.form.providerName")} *`} htmlFor="add-provider-name">
              <Input
                id="add-provider-name"
                placeholder={t("authProviders.form.providerNamePlaceholder")}
                value={newProvider.name}
                onChange={(e) => updateProvider({ name: e.target.value })}
              />
            </Field>
            <Field label={`${t("authProviders.form.displayName")} *`} htmlFor="add-provider-display">
              <Input
                id="add-provider-display"
                placeholder={t("authProviders.form.displayNamePlaceholder")}
                value={newProvider.displayName}
                onChange={(e) => updateProvider({ displayName: e.target.value })}
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("authProviders.form.type")} htmlFor="add-provider-type">
              <ProviderTypeSelect
                id="add-provider-type"
                value={newProvider.type}
                onChange={(type) => updateProvider({ type })}
              />
            </Field>
            <Field label={t("authProviders.form.icon")}>
              <IconPicker
                value={newProvider.icon}
                onChange={(icon) => updateProvider({ icon })}
                placeholder={t("authProviders.form.iconPlaceholder")}
              />
            </Field>
          </div>

          <ConfigurationMethodSelector
            provider={newProvider}
            onUpdate={updateProvider}
            onUrlUpdate={updateProviderUrl}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={`${t("authProviders.form.clientId")} *`} htmlFor="add-client-id">
              <Input
                id="add-client-id"
                autoComplete="off"
                placeholder={t("authProviders.form.clientIdPlaceholder")}
                value={newProvider.clientId}
                onChange={(e) => updateProvider({ clientId: e.target.value })}
              />
            </Field>
            <Field label={`${t("authProviders.form.clientSecret")} *`} htmlFor="add-client-secret">
              <Input
                id="add-client-secret"
                type="password"
                autoComplete="new-password"
                placeholder={t("authProviders.form.clientSecretPlaceholder")}
                value={newProvider.clientSecret}
                onChange={(e) => updateProvider({ clientSecret: e.target.value })}
              />
            </Field>
          </div>

          <Field
            label={t("authProviders.form.oauthScopes")}
            hint={
              newProvider.type === "oidc"
                ? t("authProviders.form.scopesHelpOidc")
                : t("authProviders.form.scopesHelpOauth2")
            }
          >
            <TagsInput
              value={newProvider.scope ? newProvider.scope.split(/[,\s]+/).filter(Boolean) : []}
              onChange={(tags) => updateProvider({ scope: tags.join(" ") })}
              placeholder={t("authProviders.form.scopesPlaceholder")}
            />
          </Field>

          {newProvider.name && <CallbackUrlDisplay providerName={newProvider.name} />}
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            {t("authProviders.buttons.cancel")}
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={saving}>
            {saving ? t("authProviders.buttons.adding") : t("authProviders.calm.add")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
