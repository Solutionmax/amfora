import { useTranslations } from "next-intl";

import { PasswordField } from "@/components/auth/password-field";
import { Button } from "@/components/ui/button";
import { Field, FormSection } from "@/components/ui/form-section";
import { PasswordFormProps } from "../types";

const MIN_LENGTH = 8;

/** New password twice; the button unlocks only when both match and are long enough. */
export function PasswordForm({
  form,
  isNewPasswordVisible,
  isConfirmPasswordVisible,
  onToggleNewPassword,
  onToggleConfirmPassword,
  onSubmit,
}: PasswordFormProps) {
  const t = useTranslations();
  const {
    register,
    handleSubmit,
    watch,
    formState: { isSubmitting },
  } = form;

  const newPassword = watch("newPassword") ?? "";
  const confirmPassword = watch("confirmPassword") ?? "";
  const problem = !newPassword
    ? null
    : newPassword.length < MIN_LENGTH
      ? t("profile.calm.passwordTooShort", { count: MIN_LENGTH })
      : confirmPassword && newPassword !== confirmPassword
        ? t("profile.calm.passwordMismatch")
        : null;
  const isValid = newPassword.length >= MIN_LENGTH && newPassword === confirmPassword;

  return (
    <FormSection title={t("profile.calm.password")} description={t("profile.calm.passwordHint")}>
      <form className="grid gap-[18px]" onSubmit={handleSubmit(onSubmit)} noValidate>
        <Field label={t("profile.password.newPassword")} htmlFor="profile-new-password">
          <PasswordField
            id="profile-new-password"
            autoComplete="new-password"
            visible={isNewPasswordVisible}
            onToggleVisible={onToggleNewPassword}
            {...register("newPassword")}
          />
        </Field>
        <Field label={t("profile.password.confirmPassword")} htmlFor="profile-confirm-password" error={problem}>
          <PasswordField
            id="profile-confirm-password"
            autoComplete="new-password"
            visible={isConfirmPasswordVisible}
            onToggleVisible={onToggleConfirmPassword}
            aria-invalid={!!problem}
            {...register("confirmPassword")}
          />
        </Field>
        <div>
          <Button type="submit" variant="outline" disabled={!isValid || isSubmitting}>
            {isSubmitting ? t("common.saving") : t("profile.calm.changePassword")}
          </Button>
        </div>
      </form>
    </FormSection>
  );
}
