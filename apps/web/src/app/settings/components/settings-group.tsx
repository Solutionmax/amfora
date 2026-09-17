import { IconDeviceFloppy } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { createFieldDescriptions, createGroupMetadata } from "../constants";
import { SettingsGroupProps } from "../types";
import { isFieldHidden, SettingsInput } from "./settings-input";
import { SmtpTestButton } from "./smtp-test-button";

export function SettingsGroup({ group, configs, form, onSubmit }: SettingsGroupProps) {
  const t = useTranslations();
  const GROUP_METADATA = createGroupMetadata(t);
  const FIELD_DESCRIPTIONS = createFieldDescriptions(t);

  const metadata = GROUP_METADATA[group as keyof typeof GROUP_METADATA] || {
    title: group,
    description: t("settings.groups.defaultDescription"),
    icon: undefined,
  };
  const GroupIcon = metadata.icon;

  const isEmailGroup = group === "email";

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <section className="max-w-4xl">
        <header className="mb-6">
          <div className="flex flex-row items-center gap-3">
            {GroupIcon && (
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <GroupIcon className="size-4" />
              </span>
            )}
            <div className="flex flex-col gap-1">
              <h2 className="text-base font-semibold">
                {t.has(`settings.groups.${group}.title`) ? t(`settings.groups.${group}.title`) : metadata.title}
              </h2>
              <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
                {t.has(`settings.groups.${group}.description`)
                  ? t(`settings.groups.${group}.description`)
                  : metadata.description}
              </p>
            </div>
          </div>
        </header>
        <div>
          <div className="divide-y">
            {configs
              .filter((config) => !isFieldHidden(config.key))
              .map((config) => {
                const smtpEnabled = form.watch("configs.smtpEnabled");
                const smtpNoAuth = form.watch("configs.smtpNoAuth");
                const isSmtpAuthField = config.key === "smtpUser" || config.key === "smtpPass";

                const smtpFields = [
                  "smtpHost",
                  "smtpPort",
                  "smtpUser",
                  "smtpPass",
                  "smtpSecure",
                  "smtpNoAuth",
                  "smtpTrustSelfSigned",
                  "smtpFromName",
                  "smtpFromEmail",
                ];

                if (smtpEnabled !== "true" && smtpFields.includes(config.key)) {
                  return null;
                }

                if (isSmtpAuthField && smtpNoAuth === "true") {
                  return null;
                }

                return (
                  <div key={config.key} className="py-5 first:pt-0 last:pb-0">
                    <SettingsInput
                      config={config}
                      description={
                        t.has(`settings.fields.${config.key}.description`)
                          ? t(`settings.fields.${config.key}.description`)
                          : FIELD_DESCRIPTIONS[config.key as keyof typeof FIELD_DESCRIPTIONS] ||
                            config.description ||
                            t("settings.fields.noDescription")
                      }
                      error={form.formState.errors.configs?.[config.key]}
                      register={form.register}
                      setValue={form.setValue}
                      smtpEnabled={form.watch("configs.smtpEnabled")}
                      authProvidersEnabled={form.watch("configs.authProvidersEnabled")}
                      watch={form.watch}
                    />
                  </div>
                );
              })}
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t pt-5">
            <div className="flex">
              {isEmailGroup && form.watch("configs.smtpEnabled") === "true" && (
                <SmtpTestButton
                  smtpEnabled={form.watch("configs.smtpEnabled") || "false"}
                  getFormValues={() => ({
                    smtpEnabled: form.getValues("configs.smtpEnabled") || "false",
                    smtpHost: form.getValues("configs.smtpHost") || "",
                    smtpPort: form.getValues("configs.smtpPort") || "",
                    smtpUser: form.getValues("configs.smtpUser") || "",
                    smtpPass: form.getValues("configs.smtpPass") || "",
                    smtpSecure: form.getValues("configs.smtpSecure") || "auto",
                    smtpNoAuth: form.getValues("configs.smtpNoAuth") || "false",
                    smtpTrustSelfSigned: form.getValues("configs.smtpTrustSelfSigned") || "false",
                  })}
                />
              )}
            </div>
            <div className="flex">
              <Button
                variant="default"
                disabled={form.formState.isSubmitting}
                className="flex items-center gap-2"
                type="submit"
              >
                {!form.formState.isSubmitting && <IconDeviceFloppy className="h-4 w-4" />}
                {t("settings.buttons.save", {
                  group: t.has(`settings.groups.${group}.title`) ? t(`settings.groups.${group}.title`) : metadata.title,
                })}
              </Button>
            </div>
          </div>
        </div>
      </section>
    </form>
  );
}
