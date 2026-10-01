"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Controller, type UseFormReturn } from "react-hook-form";

import { Field } from "@/components/ui/form-section";
import { Input } from "@/components/ui/input";
import { SubHeading } from "@/components/ui/line-list";
import { PasswordInput } from "@/components/ui/password-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { FieldRequirement } from "@/http/endpoints/reverse-shares/types";
import { MIN_PASSWORD_LENGTH, type ReceiveFormValues } from "../lib/receive-form";
import { parseFileTypes } from "../lib/receive-format";
import { FileSizeInput } from "./file-size-input";
import { FileTypesTagsInput } from "./file-types-tags-input";

const FIELD_OPTIONS: FieldRequirement[] = ["REQUIRED", "OPTIONAL", "HIDDEN"];

interface ReverseShareFormFieldsProps {
  form: UseFormReturn<ReceiveFormValues>;
  mode: "create" | "edit";
  /** Edit only: the link already has a password, so an empty field keeps it. */
  hadPassword?: boolean;
  /** Edit only: the link already has an end date, which the server cannot remove. */
  hadExpiration?: boolean;
}

function FormGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid gap-[14px]">
      <SubHeading>{title}</SubHeading>
      {children}
    </section>
  );
}

/** Title and one muted line on the left, a switch on the right; extra fields show underneath when on. */
function SwitchRow({
  id,
  title,
  sub,
  checked,
  disabled,
  onCheckedChange,
  children,
}: {
  id: string;
  title: string;
  sub: string;
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: (checked: boolean) => void;
  children?: ReactNode;
}) {
  return (
    <div className="py-3">
      <div className="flex items-center gap-3.5">
        <div className="min-w-0 flex-1">
          <label htmlFor={id} className="block font-semibold">
            {title}
          </label>
          <p className="text-[12.5px] text-ink-3">{sub}</p>
        </div>
        <Switch id={id} checked={checked} disabled={disabled} onCheckedChange={onCheckedChange} />
      </div>
      {children && <div className="mt-3">{children}</div>}
    </div>
  );
}

/** Fields shared by the create and edit dialogs, grouped under small headings. */
export function ReverseShareFormFields({
  form,
  mode,
  hadPassword = false,
  hadExpiration = false,
}: ReverseShareFormFieldsProps) {
  const t = useTranslations();
  const { register, control, watch, formState } = form;
  const { errors } = formState;
  const hasExpiration = watch("hasExpiration");
  const hasPassword = watch("hasPassword");
  const keepsPassword = mode === "edit" && hadPassword;

  return (
    <div className="grid gap-7">
      <div className="grid gap-[18px]">
        <Field label={t("reverseShares.calm.form.name")} htmlFor="receive-name" error={errors.name?.message}>
          <Input
            id="receive-name"
            autoFocus={mode === "create"}
            placeholder={t("reverseShares.calm.form.namePlaceholder")}
            aria-invalid={!!errors.name}
            {...register("name", {
              validate: (value) => value.trim().length > 0 || t("validation.nameRequired"),
            })}
          />
        </Field>
        <Field
          label={t("reverseShares.calm.form.message")}
          htmlFor="receive-description"
          hint={t("reverseShares.calm.form.messageHint")}
        >
          <Textarea id="receive-description" rows={2} className="min-h-[68px]" {...register("description")} />
        </Field>
      </div>

      <FormGroup title={t("reverseShares.labels.limits")}>
        <div className="grid gap-[18px] sm:grid-cols-2">
          <Field label={t("reverseShares.calm.rules.maxFiles")} htmlFor="receive-max-files">
            <Input
              id="receive-max-files"
              type="number"
              min={1}
              inputMode="numeric"
              placeholder={t("reverseShares.calm.unlimited")}
              {...register("maxFiles")}
            />
          </Field>
          <Field label={t("reverseShares.calm.facts.maxPerFile")} htmlFor="receive-max-size">
            <Controller
              control={control}
              name="maxFileSize"
              render={({ field }) => (
                <FileSizeInput
                  id="receive-max-size"
                  value={field.value}
                  onChange={field.onChange}
                  placeholder={t("reverseShares.calm.unlimited")}
                />
              )}
            />
          </Field>
        </div>
        <Field
          label={t("reverseShares.calm.rules.types")}
          htmlFor="receive-types"
          hint={t("reverseShares.calm.rules.typesHint")}
        >
          <Controller
            control={control}
            name="allowedFileTypes"
            render={({ field }) => (
              <FileTypesTagsInput
                id="receive-types"
                value={parseFileTypes(field.value)}
                onChange={(tags) => field.onChange(tags.join(","))}
                placeholder={t("reverseShares.calm.typesPlaceholder")}
              />
            )}
          />
        </Field>
      </FormGroup>

      <FormGroup title={t("reverseShares.calm.form.senders")}>
        <div className="grid gap-[18px] sm:grid-cols-2">
          {(["nameFieldRequired", "emailFieldRequired"] as const).map((name) => (
            <Field
              key={name}
              label={
                name === "nameFieldRequired" ? t("reverseShares.calm.rules.name") : t("reverseShares.calm.rules.email")
              }
              htmlFor={`receive-${name}`}
            >
              <Controller
                control={control}
                name={name}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id={`receive-${name}`} className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FIELD_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>
                          {t(`reverseShares.labels.fieldOptions.${option.toLowerCase()}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
          ))}
        </div>
        <p className="-mt-2 text-[12.5px] text-ink-3">{t("reverseShares.calm.form.fieldsHint")}</p>
      </FormGroup>

      <FormGroup title={t("reverseShares.calm.form.access")}>
        <div className="border-y border-line [&>*+*]:border-t [&>*+*]:border-line">
          <Controller
            control={control}
            name="hasExpiration"
            render={({ field }) => (
              <SwitchRow
                id="receive-has-expiration"
                title={t("reverseShares.calm.facts.expires")}
                sub={
                  field.value
                    ? hadExpiration
                      ? t("reverseShares.calm.form.expiryKeep")
                      : t("reverseShares.calm.form.expiryOn")
                    : t("reverseShares.calm.form.expiryOff")
                }
                checked={field.value}
                disabled={hadExpiration}
                onCheckedChange={field.onChange}
              >
                {hasExpiration && (
                  <Field
                    label={t("reverseShares.form.expiration.label")}
                    htmlFor="receive-expiration"
                    error={errors.expiration?.message}
                  >
                    <Input
                      id="receive-expiration"
                      type="datetime-local"
                      className="max-w-[260px]"
                      aria-invalid={!!errors.expiration}
                      {...register("expiration", {
                        validate: (value, values) =>
                          !values.hasExpiration || !!value || t("reverseShares.calm.form.expiryRequired"),
                      })}
                    />
                  </Field>
                )}
              </SwitchRow>
            )}
          />

          <Controller
            control={control}
            name="hasPassword"
            render={({ field }) => (
              <SwitchRow
                id="receive-has-password"
                title={t("reverseShares.calm.rules.password")}
                sub={field.value ? t("reverseShares.calm.rules.passwordOn") : t("reverseShares.calm.rules.passwordOff")}
                checked={field.value}
                onCheckedChange={field.onChange}
              >
                {hasPassword && (
                  <Field
                    label={
                      keepsPassword
                        ? t("reverseShares.calm.password.newPassword")
                        : t("reverseShares.modals.password.password")
                    }
                    htmlFor="receive-password"
                    hint={
                      keepsPassword
                        ? t("reverseShares.calm.form.passwordKeep")
                        : t("reverseShares.form.password.passwordHelp")
                    }
                    error={errors.password?.message}
                  >
                    <PasswordInput
                      id="receive-password"
                      autoComplete="new-password"
                      className="max-w-[320px]"
                      aria-invalid={!!errors.password}
                      {...register("password", {
                        validate: (value, values) => {
                          if (!values.hasPassword) return true;
                          if (!value && keepsPassword) return true;
                          if (!value.trim()) return t("validation.passwordRequired");
                          return value.trim().length >= MIN_PASSWORD_LENGTH || t("validation.passwordMinLength");
                        },
                      })}
                    />
                  </Field>
                )}
              </SwitchRow>
            )}
          />

          {mode === "edit" && (
            <Controller
              control={control}
              name="isActive"
              render={({ field }) => (
                <SwitchRow
                  id="receive-is-active"
                  title={t("reverseShares.calm.form.isActive")}
                  sub={t("reverseShares.calm.form.isActiveHint")}
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
          )}

          <div className="flex items-center gap-3.5 py-3">
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{t("reverseShares.calm.rules.layout")}</p>
              <p className="text-[12.5px] text-ink-3">{t("reverseShares.calm.rules.layoutHint")}</p>
            </div>
            <Controller
              control={control}
              name="pageLayout"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger size="sm" className="w-[118px]" aria-label={t("reverseShares.calm.rules.layout")}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent align="end">
                    <SelectItem value="DEFAULT">{t("reverseShares.labels.layoutOptions.default")}</SelectItem>
                    <SelectItem value="VESSEL">{t("reverseShares.labels.layoutOptions.vessel")}</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </div>
      </FormGroup>
    </div>
  );
}
