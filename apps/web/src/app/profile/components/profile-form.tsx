import { useTranslations } from "next-intl";

import { Field, FormSection } from "@/components/ui/form-section";
import { Input } from "@/components/ui/input";
import { SaveBar } from "@/components/ui/save-bar";
import { ProfileFormProps } from "../types";

const FORM_ID = "profile-account";

/** Account: names, username and email. Saved through the floating bar, which shows only while edited. */
export function ProfileForm({ form, onSubmit }: ProfileFormProps) {
  const t = useTranslations();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = form;

  return (
    <FormSection title={t("profile.calm.account")} description={t("profile.calm.accountHint")}>
      <form id={FORM_ID} className="grid gap-[18px]" onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="grid gap-[18px] sm:grid-cols-2 sm:gap-3.5">
          <Field label={t("profile.form.firstName")} htmlFor="profile-first-name" error={errors.firstName?.message}>
            <Input
              id="profile-first-name"
              autoComplete="given-name"
              aria-invalid={!!errors.firstName}
              {...register("firstName")}
            />
          </Field>
          <Field label={t("profile.form.lastName")} htmlFor="profile-last-name" error={errors.lastName?.message}>
            <Input
              id="profile-last-name"
              autoComplete="family-name"
              aria-invalid={!!errors.lastName}
              {...register("lastName")}
            />
          </Field>
        </div>
        <Field
          label={t("profile.form.username")}
          htmlFor="profile-username"
          hint={t("profile.calm.usernameHint")}
          error={errors.username?.message}
        >
          <Input
            id="profile-username"
            autoComplete="username"
            aria-invalid={!!errors.username}
            {...register("username")}
          />
        </Field>
        <Field label={t("profile.form.email")} htmlFor="profile-email" error={errors.email?.message}>
          <Input
            id="profile-email"
            type="email"
            autoComplete="email"
            aria-invalid={!!errors.email}
            {...register("email")}
          />
        </Field>
      </form>
      <SaveBar visible={isDirty} saving={isSubmitting} onDiscard={() => reset()} form={FORM_ID} />
    </FormSection>
  );
}
