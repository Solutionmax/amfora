import Link from "next/link";
import { IconEye, IconEyeOff } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
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
  const isSubmitting = form.formState.isSubmitting;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="mt-8 space-y-4">
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("resetPassword.form.newPassword")}</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    {...field}
                    type={isPasswordVisible ? "text" : "password"}
                    placeholder={t("resetPassword.form.newPasswordPlaceholder")}
                    disabled={isSubmitting}
                    className="bg-transparent backdrop-blur-md pr-10"
                  />
                  <button
                    type="button"
                    onClick={onTogglePassword}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {isPasswordVisible ? <IconEye size={20} /> : <IconEyeOff size={20} />}
                  </button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("resetPassword.form.confirmPassword")}</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    {...field}
                    type={isConfirmPasswordVisible ? "text" : "password"}
                    placeholder={t("resetPassword.form.confirmPasswordPlaceholder")}
                    disabled={isSubmitting}
                    className="bg-transparent backdrop-blur-md pr-10"
                  />
                  <button
                    type="button"
                    onClick={onToggleConfirmPassword}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {isConfirmPasswordVisible ? <IconEye size={20} /> : <IconEyeOff size={20} />}
                  </button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button className="w-full" disabled={isSubmitting} size="lg" type="submit">
          {isSubmitting ? t("resetPassword.form.resetting") : t("resetPassword.form.submit")}
        </Button>

        <div className="mt-4 text-center">
          <Link className="text-muted-foreground hover:text-primary text-sm" href="/login">
            {t("resetPassword.form.backToLogin")}
          </Link>
        </div>
      </form>
    </Form>
  );
}
