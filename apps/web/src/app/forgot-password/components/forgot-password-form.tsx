import Link from "next/link";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ForgotPasswordFormProps } from "../types";

export function ForgotPasswordForm({ form, onSubmit }: ForgotPasswordFormProps) {
  const t = useTranslations();
  const isSubmitting = form.formState.isSubmitting;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="mt-8 space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("forgotPassword.emailLabel")}</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="email"
                  placeholder={t("forgotPassword.emailPlaceholder")}
                  disabled={isSubmitting}
                  className="h-12 rounded-xl bg-background"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button className="h-12 w-full rounded-full" disabled={isSubmitting} size="lg" type="submit">
          {isSubmitting ? t("forgotPassword.sending") : t("forgotPassword.submit")}
        </Button>

        <div className="mt-4 text-center">
          <Link
            className="text-sm text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
            href="/login"
          >
            {t("forgotPassword.backToLogin")}
          </Link>
        </div>
      </form>
    </Form>
  );
}
