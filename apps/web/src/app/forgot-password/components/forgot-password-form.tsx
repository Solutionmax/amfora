import { IconArrowUpRight } from "@tabler/icons-react";
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

        <Button className="h-12 w-full justify-between rounded-xl px-4" disabled={isSubmitting} size="lg" type="submit">
          <span>{isSubmitting ? t("forgotPassword.sending") : t("forgotPassword.submit")}</span>
          <IconArrowUpRight className="size-5" />
        </Button>
      </form>
    </Form>
  );
}
