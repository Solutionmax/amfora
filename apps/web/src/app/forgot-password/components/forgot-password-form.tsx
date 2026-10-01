import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/form-section";
import { Input } from "@/components/ui/input";
import { ForgotPasswordFormProps } from "../types";

export function ForgotPasswordForm({ form, onSubmit }: ForgotPasswordFormProps) {
  const t = useTranslations();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = form;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4" noValidate>
      <Field label={t("forgotPassword.emailLabel")} htmlFor="forgot-email" error={errors.email?.message}>
        <Input
          id="forgot-email"
          type="email"
          autoComplete="email"
          placeholder={t("forgotPassword.emailPlaceholder")}
          disabled={isSubmitting}
          aria-invalid={!!errors.email}
          {...register("email")}
        />
      </Field>
      <Button className="mt-2 w-full" disabled={isSubmitting} size="lg" type="submit">
        {isSubmitting ? t("forgotPassword.sending") : t("forgotPassword.submit")}
      </Button>
    </form>
  );
}
