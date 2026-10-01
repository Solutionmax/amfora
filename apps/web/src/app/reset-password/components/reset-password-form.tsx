import { useTranslations } from "next-intl";

import { PasswordField } from "@/components/auth/password-field";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/form-section";
import { ResetPasswordFormProps } from "../types";

export function ResetPasswordForm({
  form,
  isPasswordVisible,
  isConfirmPasswordVisible,
  onTogglePassword,
  onToggleConfirmPassword,
  onSubmit,
}: ResetPasswordFormProps) {
  const t = useTranslations();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = form;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4" noValidate>
      <Field
        label={t("resetPassword.form.newPassword")}
        htmlFor="reset-password"
        hint={t("auth.calm.passwordRule")}
        error={errors.password?.message}
      >
        <PasswordField
          id="reset-password"
          autoComplete="new-password"
          disabled={isSubmitting}
          visible={isPasswordVisible}
          onToggleVisible={onTogglePassword}
          aria-invalid={!!errors.password}
          {...register("password")}
        />
      </Field>
      <Field
        label={t("resetPassword.form.confirmPassword")}
        htmlFor="reset-confirm-password"
        error={errors.confirmPassword?.message}
      >
        <PasswordField
          id="reset-confirm-password"
          autoComplete="new-password"
          disabled={isSubmitting}
          visible={isConfirmPasswordVisible}
          onToggleVisible={onToggleConfirmPassword}
          aria-invalid={!!errors.confirmPassword}
          {...register("confirmPassword")}
        />
      </Field>
      <Button className="mt-2 w-full" disabled={isSubmitting} size="lg" type="submit">
        {isSubmitting ? t("resetPassword.form.resetting") : t("resetPassword.form.submit")}
      </Button>
    </form>
  );
}
