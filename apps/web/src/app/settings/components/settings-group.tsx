import { ReactNode } from "react";
import { useTranslations } from "next-intl";

import { CopyField } from "@/components/files/copy-field";
import { FormSection } from "@/components/ui/form-section";
import { LineList } from "@/components/ui/line-list";
import { ANONYMOUS_SECRET_FIELDS, blocksFor, SettingsRow, SMTP_FIELDS } from "../constants";
import { Config, SettingsGroupProps } from "../types";
import { isFieldHidden, SettingField, SettingsFormApi, SettingSwitchRow } from "./settings-input";
import { SmtpTestButton } from "./smtp-test-button";

export const settingsFormId = (group: string) => `settings-form-${group}`;

/** Email fields follow the "send email" and "no authentication" switches, secret limits their own switch. */
function isVisible(key: string, form: SettingsFormApi): boolean {
  const smtpEnabled = form.watch("configs.smtpEnabled");
  const smtpNoAuth = form.watch("configs.smtpNoAuth");

  if (SMTP_FIELDS.includes(key) && smtpEnabled !== "true") return false;
  if ((key === "smtpUser" || key === "smtpPass") && smtpNoAuth === "true") return false;
  if (ANONYMOUS_SECRET_FIELDS.includes(key) && form.watch("configs.secretsAnonymousEnabled") !== "true") return false;

  return true;
}

/** Consecutive switches share one hairline list; other rows stand alone or in pairs. */
function renderRows(rows: readonly SettingsRow[], byKey: Map<string, Config>, form: SettingsFormApi): ReactNode[] {
  const out: ReactNode[] = [];
  let switches: Config[] = [];

  const flush = () => {
    if (switches.length === 0) return;
    const group = switches;
    out.push(
      <LineList key={`switches-${group[0].key}`} className="-my-3 min-w-0">
        {group.map((config) => (
          <SettingSwitchRow key={config.key} config={config} form={form} />
        ))}
      </LineList>
    );
    switches = [];
  };

  rows.forEach((row) => {
    const configs = (typeof row === "string" ? [row] : [...row])
      .filter((key) => isVisible(key, form))
      .map((key) => byKey.get(key))
      .filter((config): config is Config => !!config);

    if (configs.length === 0) return;

    if (configs.length === 1 && configs[0].type === "boolean") {
      switches.push(configs[0]);
      return;
    }

    flush();
    out.push(
      configs.length === 2 ? (
        <div key={configs[0].key} className="grid gap-[18px] sm:grid-cols-2 sm:gap-3.5">
          {configs.map((config) => (
            <SettingField key={config.key} config={config} form={form} />
          ))}
        </div>
      ) : (
        <SettingField key={configs[0].key} config={configs[0]} form={form} />
      )
    );
  });
  flush();

  return out;
}

/** One settings tab: a form made of FormSection blocks. Saving goes through the page's SaveBar. */
export function SettingsGroup({ group, configs, form, onSubmit }: SettingsGroupProps) {
  const t = useTranslations();
  const visible = configs.filter((config) => !isFieldHidden(config.key));
  const byKey = new Map(visible.map((config) => [config.key, config]));
  const blocks = blocksFor(
    group,
    visible.map((config) => config.key)
  );
  const smtpOn = form.watch("configs.smtpEnabled") === "true";
  const valueOf = (key: string, fallback: string) => String(form.getValues(`configs.${key}`) || fallback);

  return (
    <form id={settingsFormId(group)} onSubmit={form.handleSubmit(onSubmit)} noValidate>
      {blocks.map((block) => (
        <FormSection
          key={block.id}
          title={t(`settings.calm.blocks.${block.id}.title`)}
          description={t(`settings.calm.blocks.${block.id}.description`)}
        >
          {renderRows(block.rows, byKey, form as SettingsFormApi)}
          {/* The saved value: until it is saved the page still sends visitors to sign in. */}
          {block.id === "anonymousSecrets" && byKey.get("secretsAnonymousEnabled")?.value === "true" && (
            <CopyField value={`${window.location.origin}/secret`} label={t("secrets.public.address")} />
          )}
          {group === "email" && block.id === "outgoing" && smtpOn && (
            <SmtpTestButton
              getFormValues={() => ({
                smtpEnabled: valueOf("smtpEnabled", "false"),
                smtpHost: valueOf("smtpHost", ""),
                smtpPort: valueOf("smtpPort", ""),
                smtpUser: valueOf("smtpUser", ""),
                smtpPass: valueOf("smtpPass", ""),
                smtpSecure: valueOf("smtpSecure", "auto"),
                smtpNoAuth: valueOf("smtpNoAuth", "false"),
                smtpTrustSelfSigned: valueOf("smtpTrustSelfSigned", "false"),
              })}
            />
          )}
        </FormSection>
      ))}
    </form>
  );
}
