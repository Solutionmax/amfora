"use client";

import { useTranslations } from "next-intl";
import { UseFormReturn } from "react-hook-form";

import { PUBLIC_THEMES } from "@/components/brand/public-theme";
import { CopyField } from "@/components/files/copy-field";
import { Field } from "@/components/ui/form-section";
import { Input } from "@/components/ui/input";
import { LineRow } from "@/components/ui/line-list";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  ACTIVITY_PLACE_OPTIONS,
  DAYS_FIELDS,
  fieldDescription,
  fieldTitle,
  READ_ONLY_FIELDS,
  SECONDS_FIELDS,
} from "../constants";
import { Config } from "../types";
import { FileSizeInput } from "./file-size-input";
import { LogoInput } from "./logo-input";

// Managed on the customization page, or set by the server itself.
const HIDDEN_FIELDS = [
  "serverUrl",
  "firstUserAccess",
  "showHomePage",
  "appFontFamily",
  "appPrimaryColor",
  "appRadius",
  "appBrandpack",
  "appCustomCss",
  "appHideCredit",
];

const SECRET_PATTERN = /password|secret|pass$/i;

export function isFieldHidden(fieldKey: string): boolean {
  return HIDDEN_FIELDS.includes(fieldKey);
}

// Every group form has the same shape: `{ configs: Record<string, string> }`.
export type SettingsFormApi = UseFormReturn<any>;

interface SettingProps {
  config: Config;
  form: SettingsFormApi;
  disabled?: boolean;
}

const fieldName = (key: string) => `configs.${key}`;

function SettingControl({ config, form, disabled }: SettingProps) {
  const t = useTranslations();
  const name = fieldName(config.key);
  const value = form.watch(name);
  const set = (next: string) => form.setValue(name, next, { shouldDirty: true });

  if (config.key === "appLogo") {
    return <LogoInput value={value} onChange={set} isDisabled={disabled} />;
  }

  if (config.key === "appDescription") {
    return <Textarea id={config.key} rows={3} className="min-h-[76px]" disabled={disabled} {...form.register(name)} />;
  }

  if (config.key === "maxFileSize" || config.key === "maxTotalStoragePerUser") {
    return (
      <FileSizeInput
        id={config.key}
        unitLabel={t("settings.calm.units.unit")}
        value={value || "0"}
        onChange={set}
        disabled={disabled}
        placeholder={t("settings.calm.noLimit")}
      />
    );
  }

  if (READ_ONLY_FIELDS.includes(config.key)) {
    // The saved value, not the form's: nothing here can change it.
    return <CopyField value={config.value} label={fieldTitle(t, config.key)} />;
  }

  if (config.key === "smtpSecure" || config.key === "appPublicTheme" || config.key === "activityPlace") {
    const options =
      config.key === "smtpSecure"
        ? ["auto", "ssl", "tls", "none"].map((option) => ({
            value: option,
            label: t(`settings.fields.smtpSecure.options.${option}`),
          }))
        : config.key === "activityPlace"
          ? ACTIVITY_PLACE_OPTIONS.map((option) => ({
              value: option,
              label: t(`settings.calm.fields.activityPlace.options.${option}`),
            }))
          : PUBLIC_THEMES.map((theme) => ({ value: theme, label: t(`customization.v2.theme.${theme}`) }));

    return (
      <Select value={value || options[0].value} onValueChange={set} disabled={disabled}>
        <SelectTrigger id={config.key} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  if (config.type === "number" || config.type === "bigint") {
    const unit = SECONDS_FIELDS.includes(config.key)
      ? t("settings.calm.units.seconds")
      : DAYS_FIELDS.includes(config.key)
        ? t("settings.calm.units.days")
        : null;

    return (
      <div className="relative flex items-center">
        <Input
          id={config.key}
          type="number"
          inputMode="numeric"
          min={config.key === "trashRetentionDays" ? 1 : 0}
          disabled={disabled}
          className={unit ? "pr-20" : undefined}
          {...form.register(name, {
            setValueAs: (raw: string) => (raw === "" ? "" : String(Number(raw))),
          })}
        />
        {unit && <span className="pointer-events-none absolute right-3 text-[13px] text-ink-3">{unit}</span>}
      </div>
    );
  }

  return (
    <Input
      id={config.key}
      type={SECRET_PATTERN.test(config.key) ? "password" : "text"}
      autoComplete={SECRET_PATTERN.test(config.key) ? "new-password" : "off"}
      disabled={disabled}
      {...form.register(name)}
    />
  );
}

/** A text, number or select setting: label and hint above the control. */
export function SettingField({ config, form, disabled }: SettingProps) {
  const t = useTranslations();
  const error = form.formState.errors.configs as Record<string, { message?: string }> | undefined;
  // The logo control carries its own title row.
  const isLogo = config.key === "appLogo";

  if (isLogo) return <SettingControl config={config} form={form} disabled={disabled} />;

  return (
    <Field
      label={fieldTitle(t, config.key)}
      htmlFor={READ_ONLY_FIELDS.includes(config.key) ? undefined : config.key}
      hint={fieldDescription(t, config.key, config.description)}
      error={error?.[config.key]?.message}
    >
      <SettingControl config={config} form={form} disabled={disabled} />
    </Field>
  );
}

/** An on/off setting: a line with title and explanation, the switch on the right. */
export function SettingSwitchRow({ config, form, disabled }: SettingProps) {
  const t = useTranslations();
  const name = fieldName(config.key);
  const title = fieldTitle(t, config.key);

  return (
    <LineRow
      title={<label htmlFor={config.key}>{title}</label>}
      sub={fieldDescription(t, config.key, config.description)}
    >
      <Switch
        id={config.key}
        checked={form.watch(name) === "true"}
        onCheckedChange={(checked) => form.setValue(name, checked ? "true" : "false", { shouldDirty: true })}
        disabled={disabled}
      />
    </LineRow>
  );
}
